import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import {
  FirestoreCollectionKey,
  BaseEntityMetadata,
  ChangeHistoryItem,
  UserDocument,
  PurchaseOrderDocument,
  PurchaseOrderItemDocument,
  QualityControlDocument,
  InventoryBatchDocument,
  InventoryMovementDocument,
  IngredientDocument,
  RABItemDocument,
  ProductionLogDocument,
  TemperatureLogDocument,
  FoodWasteLogDocument,
  PortioningRecordDocument,
  DistributionRecordDocument,
  AuditLogDocument,
  NotificationDocument,
} from '../types/database';

export const CURRENT_SPPG_ID = 'GFBQSYXD';

/**
 * Helper to build standard entity metadata
 */
export function createEntityMetadata(
  id: string,
  createdBy: string,
  status: string = 'Aktif',
  sppgId: string = CURRENT_SPPG_ID
): BaseEntityMetadata {
  const now = new Date().toISOString();
  return {
    id,
    sppgId,
    createdAt: now,
    createdBy: createdBy || 'system',
    updatedAt: now,
    updatedBy: createdBy || 'system',
    status,
    isDeleted: false,
    changeHistory: [
      {
        timestamp: now,
        modifiedBy: createdBy || 'system',
        action: 'CREATE',
        newStatus: status,
        changesSummary: 'Dokumen pertama kali dibuat ke database',
      },
    ],
  };
}

/**
 * Read document with error handling
 */
export async function getDocument<T = any>(
  collectionName: FirestoreCollectionKey,
  docId: string
): Promise<T | null> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as T & { isDeleted?: boolean };
    if (data.isDeleted) return null; // Soft delete filter
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * List documents in collection filtered by SPPG ID and non-deleted
 */
export async function listDocuments<T = any>(
  collectionName: FirestoreCollectionKey,
  sppgId: string = CURRENT_SPPG_ID,
  includeDeleted: boolean = false
): Promise<T[]> {
  const path = collectionName;
  try {
    const colRef = collection(db, collectionName);
    const q = includeDeleted
      ? query(colRef, where('sppgId', '==', sppgId))
      : query(colRef, where('sppgId', '==', sppgId), where('isDeleted', '==', false));

    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Create or set a document with full metadata and audit trail
 */
export async function saveDocument<T extends Record<string, any>>(
  collectionName: FirestoreCollectionKey,
  docId: string,
  data: T,
  userUid: string,
  userName?: string
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    const existingSnap = await getDoc(docRef);
    const now = new Date().toISOString();

    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as BaseEntityMetadata;
      const historyItem: ChangeHistoryItem = {
        timestamp: now,
        modifiedBy: userUid,
        modifiedByName: userName,
        action: 'UPDATE',
        changesSummary: `Pembaruan data pada koleksi ${collectionName}`,
      };

      const updatedPayload = {
        ...data,
        updatedAt: now,
        updatedBy: userUid,
        changeHistory: [historyItem, ...(existingData.changeHistory || []).slice(0, 19)], // Keep last 20 history
      };

      await setDoc(docRef, updatedPayload, { merge: true });
      await recordAuditLog('UPDATE', collectionName, `Memperbarui dokumen ${docId}`, userUid, userName, docId);
    } else {
      const metadata = createEntityMetadata(docId, userUid, data.status || 'Aktif', data.sppgId || CURRENT_SPPG_ID);
      const fullDoc = {
        ...metadata,
        ...data,
      };

      await setDoc(docRef, fullDoc);
      await recordAuditLog('CREATE', collectionName, `Membuat dokumen baru ${docId}`, userUid, userName, docId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Soft delete document with audit and history
 */
export async function softDeleteDocument(
  collectionName: FirestoreCollectionKey,
  docId: string,
  userUid: string,
  userName?: string,
  reason?: string
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const existingData = snap.data() as BaseEntityMetadata;
    const now = new Date().toISOString();
    const historyItem: ChangeHistoryItem = {
      timestamp: now,
      modifiedBy: userUid,
      modifiedByName: userName,
      action: 'SOFT_DELETE',
      previousStatus: existingData.status,
      newStatus: 'Dihapus (Soft Delete)',
      changesSummary: `Penghapusan lunak dokumen: ${reason || 'Dihapus oleh pengguna'}`,
    };

    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: userUid,
      status: 'Dihapus',
      changeHistory: [historyItem, ...(existingData.changeHistory || []).slice(0, 19)],
    });

    await recordAuditLog('DELETE', collectionName, `Soft delete dokumen ${docId}: ${reason || '-'}`, userUid, userName, docId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Restore soft-deleted document
 */
export async function restoreDocument(
  collectionName: FirestoreCollectionKey,
  docId: string,
  userUid: string,
  userName?: string
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const existingData = snap.data() as BaseEntityMetadata;
    const now = new Date().toISOString();
    const historyItem: ChangeHistoryItem = {
      timestamp: now,
      modifiedBy: userUid,
      modifiedByName: userName,
      action: 'RESTORE',
      newStatus: 'Aktif',
      changesSummary: 'Pemulihan dokumen dari tempat sampah (soft delete)',
    };

    await updateDoc(docRef, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      status: 'Aktif',
      changeHistory: [historyItem, ...(existingData.changeHistory || []).slice(0, 19)],
    });

    await recordAuditLog('RESTORE', collectionName, `Memulihkan dokumen ${docId}`, userUid, userName, docId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Approval Workflow State Transition
 */
export async function updateApprovalStatus(
  collectionName: FirestoreCollectionKey,
  docId: string,
  newStatus: 'Disetujui' | 'Ditolak' | 'Menunggu Persetujuan',
  userUid: string,
  userName: string,
  notes?: string
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const existingData = snap.data() as BaseEntityMetadata;
    const now = new Date().toISOString();
    const historyItem: ChangeHistoryItem = {
      timestamp: now,
      modifiedBy: userUid,
      modifiedByName: userName,
      action: newStatus === 'Disetujui' ? 'APPROVE' : newStatus === 'Ditolak' ? 'REJECT' : 'STATUS_CHANGE',
      previousStatus: existingData.status,
      newStatus,
      changesSummary: `Alur Persetujuan: ${newStatus}. ${notes ? `Catatan: ${notes}` : ''}`,
    };

    await updateDoc(docRef, {
      status: newStatus,
      approvalStatus: newStatus,
      approvedBy: newStatus === 'Disetujui' ? userName : null,
      approvedAt: newStatus === 'Disetujui' ? now : null,
      updatedAt: now,
      updatedBy: userUid,
      changeHistory: [historyItem, ...(existingData.changeHistory || []).slice(0, 19)],
    });

    await recordAuditLog('APPROVE', collectionName, `Persetujuan status ${newStatus} untuk ${docId}`, userUid, userName, docId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -----------------------------------------------------------------------------
// TRANSACTION 1: Create Purchase Order with RAB Budget Sync & Notifications
// -----------------------------------------------------------------------------
export async function createPurchaseOrderTransaction(params: {
  poData: Omit<PurchaseOrderDocument, keyof BaseEntityMetadata>;
  items: Array<Omit<PurchaseOrderItemDocument, keyof BaseEntityMetadata>>;
  userUid: string;
  userName: string;
}): Promise<string> {
  const poId = `po-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async transaction => {
      // 1. If RAB Item is referenced, verify pagu and update
      if (params.poData.rabId) {
        const rabRef = doc(db, 'rab_items', params.poData.rabId);
        const rabSnap = await transaction.get(rabRef);
        if (rabSnap.exists()) {
          const rabData = rabSnap.data() as RABItemDocument;
          const newPoAmount = (rabData.poCreatedAmount || 0) + params.poData.totalAmount;
          const newPoQty = (rabData.poCreatedQuantity || 0) + params.items.reduce((s, i) => s + i.quantityOrdered, 0);

          transaction.update(rabRef, {
            poCreatedAmount: newPoAmount,
            poCreatedQuantity: newPoQty,
            remainingPagu: Math.max(0, rabData.totalBudget - newPoAmount),
            updatedAt: now,
            updatedBy: params.userUid,
          });
        }
      }

      // 2. Create Purchase Order document
      const poRef = doc(db, 'purchase_orders', poId);
      const poMetadata = createEntityMetadata(poId, params.userUid, 'Menunggu persetujuan');
      transaction.set(poRef, {
        ...poMetadata,
        ...params.poData,
      });

      // 3. Create Purchase Order Items
      for (const item of params.items) {
        const itemId = `poi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const itemRef = doc(db, 'purchase_order_items', itemId);
        const itemMetadata = createEntityMetadata(itemId, params.userUid, 'Dipesan');
        transaction.set(itemRef, {
          ...itemMetadata,
          ...item,
          purchaseOrderId: poId,
          poNumber: params.poData.poNumber,
        });
      }

      // 4. Create Notification for Finance & Head of SPPG
      const notifId = `notif-${Date.now()}`;
      const notifRef = doc(db, 'notifications', notifId);
      transaction.set(notifRef, {
        ...createEntityMetadata(notifId, params.userUid, 'Terkirim'),
        recipientUid: 'finance_head',
        recipientRole: 'Pengawas Keuangan',
        title: `PO Baru Memerlukan Verifikasi: ${params.poData.poNumber}`,
        message: `Purchase Order untuk supplier ${params.poData.supplierName} senilai Rp ${params.poData.totalAmount.toLocaleString('id-ID')} diterbitkan.`,
        notificationType: 'APPROVAL_REQUEST',
        referenceModule: 'procurement',
        referenceId: poId,
        isRead: false,
      });
    });

    await recordAuditLog('CREATE', 'purchase_orders', `Transaksi PO ${params.poData.poNumber} berhasil dibukukan dengan konsistensi RAB.`, params.userUid, params.userName, poId);
    return poId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'purchase_orders');
  }
}

// -----------------------------------------------------------------------------
// TRANSACTION 2: Process QC Inspection & Automated Stock Integration
// -----------------------------------------------------------------------------
export async function processQCInspectionTransaction(params: {
  qcData: Omit<QualityControlDocument, keyof BaseEntityMetadata>;
  ingredientId: string;
  userUid: string;
  userName: string;
}): Promise<string> {
  const qcId = `qc-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async transaction => {
      // 1. Fetch related PO
      const poRef = doc(db, 'purchase_orders', params.qcData.poId);
      const poSnap = await transaction.get(poRef);
      if (!poSnap.exists()) {
        throw new Error(`PO dengan ID ${params.qcData.poId} tidak ditemukan.`);
      }

      // 2. Fetch Ingredient to update stock
      const ingRef = doc(db, 'ingredients', params.ingredientId);
      const ingSnap = await transaction.get(ingRef);
      if (!ingSnap.exists()) {
        throw new Error(`Bahan pangan dengan ID ${params.ingredientId} tidak ditemukan.`);
      }
      const ingData = ingSnap.data() as IngredientDocument;

      // 3. Create QC Document
      const qcRef = doc(db, 'quality_control', qcId);
      const qcMetadata = createEntityMetadata(qcId, params.userUid, params.qcData.qcDecision);
      transaction.set(qcRef, {
        ...qcMetadata,
        ...params.qcData,
        qcNumber: `QC-${Date.now().toString().slice(-6)}`,
      });

      // 4. Update PO Status
      const nextPOStatus =
        params.qcData.qcDecision === 'Lolos Penuh'
          ? 'Selesai diterima'
          : params.qcData.qcDecision === 'Diterima sebagian'
          ? 'Sebagian diterima'
          : 'Ditolak';

      transaction.update(poRef, {
        qcStatus: params.qcData.qcDecision,
        orderStatus: nextPOStatus,
        updatedAt: now,
        updatedBy: params.userUid,
      });

      // 5. If accepted, add Batch and Movement, and update current stock
      if (
        (params.qcData.qcDecision === 'Lolos Penuh' || params.qcData.qcDecision === 'Diterima sebagian') &&
        params.qcData.receivedQty > 0
      ) {
        const batchId = `batch-${Date.now()}`;
        const batchRef = doc(db, 'inventory_batches', batchId);
        transaction.set(batchRef, {
          ...createEntityMetadata(batchId, params.userUid, 'Tersedia'),
          ingredientId: params.ingredientId,
          ingredientName: params.qcData.itemName,
          batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
          poId: params.qcData.poId,
          qcId,
          initialQuantity: params.qcData.receivedQty,
          remainingQuantity: params.qcData.receivedQty,
          unit: params.qcData.unit,
          storageLocation: ingData.storageLocation || 'Gudang Kering A',
          expiryDate: params.qcData.expiryDate,
          receivedDate: now.slice(0, 10),
        });

        const movementId = `mov-${Date.now()}`;
        const movRef = doc(db, 'inventory_movements', movementId);
        const newStock = ingData.currentStock + params.qcData.receivedQty;
        transaction.set(movRef, {
          ...createEntityMetadata(movementId, params.userUid, 'Selesai'),
          movementType: 'Masuk',
          ingredientId: params.ingredientId,
          ingredientName: params.qcData.itemName,
          batchId,
          quantity: params.qcData.receivedQty,
          unit: params.qcData.unit,
          balanceAfter: newStock,
          referenceDocType: 'QC_PO',
          referenceDocId: qcId,
          reason: `Penerimaan QC Lolos PO ${params.qcData.poNumber} (${params.qcData.supplierName})`,
          handledBy: params.userName,
        });

        transaction.update(ingRef, {
          currentStock: newStock,
          updatedAt: now,
          updatedBy: params.userUid,
        });
      }
    });

    await recordAuditLog('APPROVE', 'quality_control', `Hasil QC ${params.qcData.poNumber} (${params.qcData.qcDecision}) selesai diproses secara konsisten.`, params.userUid, params.userName, qcId);
    return qcId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'quality_control');
  }
}

// -----------------------------------------------------------------------------
// TRANSACTION 3: Kitchen Production & Temperature Verification
// -----------------------------------------------------------------------------
export async function processProductionCompletionTransaction(params: {
  prodData: Omit<ProductionLogDocument, keyof BaseEntityMetadata>;
  temperatureCcp: number;
  userUid: string;
  userName: string;
}): Promise<string> {
  const prodId = `prod-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async transaction => {
      // 1. Record Production Log
      const prodRef = doc(db, 'production_logs', prodId);
      transaction.set(prodRef, {
        ...createEntityMetadata(prodId, params.userUid, 'Selesai Dimasak'),
        ...params.prodData,
      });

      // 2. Record CCP Temperature Log
      const tempId = `temp-${Date.now()}`;
      const tempRef = doc(db, 'temperature_logs', tempId);
      transaction.set(tempRef, {
        ...createEntityMetadata(tempId, params.userUid, 'Terverifikasi'),
        logType: 'Suhu Inti Masakan',
        targetEntityName: params.prodData.menuName,
        measuredTemperature: params.temperatureCcp,
        standardMin: 75.0,
        isWithinStandard: params.temperatureCcp >= 75.0,
        timeRecorded: now.slice(11, 16) + ' WIB',
        officerName: params.prodData.headChefName,
      });

      // 3. Update Menu Item Status if exists
      if (params.prodData.menuItemId) {
        const menuRef = doc(db, 'menu_items', params.prodData.menuItemId);
        const menuSnap = await transaction.get(menuRef);
        if (menuSnap.exists()) {
          transaction.update(menuRef, {
            status: 'Selesai Dimasak',
            updatedAt: now,
            updatedBy: params.userUid,
          });
        }
      }
    });

    await recordAuditLog('CREATE', 'production_logs', `Batch produksi ${params.prodData.productionBatchCode} selesai dengan suhu CCP ${params.temperatureCcp}°C`, params.userUid, params.userName, prodId);
    return prodId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'production_logs');
  }
}

// -----------------------------------------------------------------------------
// AUDIT LOG RECORDER
// -----------------------------------------------------------------------------
export async function recordAuditLog(
  action: AuditLogDocument['action'],
  moduleName: string,
  details: string,
  userId: string,
  userName?: string,
  affectedDocId?: string
): Promise<void> {
  try {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const logRef = doc(db, 'audit_logs', logId);
    const now = new Date().toISOString();

    const auditEntry: AuditLogDocument = {
      id: logId,
      sppgId: CURRENT_SPPG_ID,
      createdAt: now,
      createdBy: userId || 'system',
      updatedAt: now,
      updatedBy: userId || 'system',
      status: 'Recorded',
      isDeleted: false,
      timestamp: now,
      userId: userId || 'system',
      userName: userName || 'Petugas SPPG',
      userRole: 'Staff Operasional',
      action,
      module: moduleName,
      details,
      affectedCollection: moduleName,
      affectedDocumentId: affectedDocId,
    };

    await setDoc(logRef, auditEntry);
  } catch (error) {
    console.warn('Gagal mencatat audit log:', error);
  }
}

// -----------------------------------------------------------------------------
// FILE UPLOAD VALIDATOR (Security & MIME Protection)
// -----------------------------------------------------------------------------
export interface FileValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sanitizedFileName: string;
  fileSizeBytes: number;
}

export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): FileValidationResult {
  const maxSizeMB = options.maxSizeMB || 5; // Default max 5MB
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const allowedTypes = options.allowedTypes || [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  // 1. Check File Size
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      errorMessage: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal ${maxSizeMB} MB.`,
      sanitizedFileName: file.name,
      fileSizeBytes: file.size,
    };
  }

  // 2. Check MIME Type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      errorMessage: `Format file ${file.type || 'tidak dikenal'} tidak diizinkan. Hanya menerima: JPEG, PNG, WebP, PDF, XLSX.`,
      sanitizedFileName: file.name,
      fileSizeBytes: file.size,
    };
  }

  // 3. Sanitize filename (prevent path traversal & script injection)
  const sanitized = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.');

  return {
    isValid: true,
    sanitizedFileName: `${Date.now()}_${sanitized}`,
    fileSizeBytes: file.size,
  };
}

// -----------------------------------------------------------------------------
// SENSITIVE DATA MASKING & SANITIZATION
// -----------------------------------------------------------------------------
export function maskSensitiveData(value?: string, type: 'phone' | 'bank' | 'email' = 'phone'): string {
  if (!value) return '-';
  if (type === 'phone') {
    if (value.length < 8) return value;
    return value.slice(0, 4) + '****' + value.slice(-3);
  }
  if (type === 'bank') {
    if (value.length < 6) return '****';
    return '****-****-' + value.slice(-4);
  }
  if (type === 'email') {
    const parts = value.split('@');
    if (parts.length !== 2) return value;
    const name = parts[0];
    return name.slice(0, 2) + '***@' + parts[1];
  }
  return value;
}

// -----------------------------------------------------------------------------
// FULL DATABASE BACKUP & RESTORE UTILITIES
// -----------------------------------------------------------------------------
export async function exportDatabaseBackup(sppgId: string = CURRENT_SPPG_ID): Promise<string> {
  const backupObject: Record<string, any> = {
    backupMetadata: {
      sppgId,
      sppgName: 'SPPG Probolinggo Krejengan Temenggungan 2',
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      totalCollections: 39,
    },
    collections: {},
  };

  const collectionsToBackup: FirestoreCollectionKey[] = [
    'users',
    'institutions',
    'menu_items',
    'ingredients',
    'purchase_orders',
    'purchase_order_items',
    'quality_control',
    'inventory_batches',
    'inventory_movements',
    'production_logs',
    'temperature_logs',
    'food_waste_logs',
    'portioning_records',
    'distribution_records',
    'financial_transactions',
    'attendance_records',
    'incoming_letters',
    'outgoing_letters',
    'audit_logs',
    'sppg_profiles',
  ];

  for (const colName of collectionsToBackup) {
    try {
      const docs = await listDocuments(colName, sppgId, true);
      backupObject.collections[colName] = docs;
    } catch {
      backupObject.collections[colName] = [];
    }
  }

  return JSON.stringify(backupObject, null, 2);
}
