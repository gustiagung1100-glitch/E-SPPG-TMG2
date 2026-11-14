import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  RoleType,
  UserProfile,
  SPPGConfig,
  Institution,
  MenuItem,
  InventoryItem,
  PurchaseOrder,
  DistributionLog,
  FinancialTransaction,
  VolunteerAttendance,
  OfficialLetter,
  AuditLog,
  KitchenProgress,
  RolePermissions,
  ModuleKey,
  ActionPermission,
  MasterBahan,
  MasterSupplier,
  MasterVolunteer,
  MasterUnit,
  MaterialDimensionConversion,
  BeneficiaryAttendanceLog,
  BeneficiaryQuotaHistory,
  PreparationInspectionRecord,
  CookingInspectionRecord,
  PortioningInspectionRecord,
  DistributionDeliveryRecord,
  OmprengReturnRecord,
  FuelLogRecord,
  WashingWasteRecord,
  OutgoingDocument,
  IncomingLetter,
  VolunteerAbsenceRecord,
  SupplierDocument,
  RABItem,
  QualityControlRecord,
  WebAccessUser,
  WebAccessPolicy,
  DynamicFormId,
  DynamicFormSchema,
} from '../types';
import {
  defaultDynamicFormSchemas,
  mergeDynamicFormSchemas,
  isDynamicFormAdmin,
} from './dynamicFormSchemas';
import {
  hashLoginPassword,
  isProtectedSuperAdminEmail,
} from './authCrypto';
import {
  initialInstitutionsData,
  initialMasterBahanData,
  initialMasterSuppliersData,
  initialMasterVolunteersData,
  initialMasterUnitsData,
  initialMaterialConversionsData,
  initialBeneficiaryAttendanceData,
  initialQuotaHistoryData,
} from './mockMasterData';
import {
  defaultPrepRecords,
  defaultCookingRecords,
  defaultPortioningRecords,
  defaultDistributionDeliveries,
  defaultOmprengReturns,
  defaultFuelLogs,
  defaultWashingWasteRecords,
} from './productionData';
import {
  defaultOutgoingDocuments,
  defaultIncomingLetters,
} from './letterTemplatesData';
import {
  defaultRABItems,
  defaultQualityControlRecords,
} from './plokData';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  isAuthenticated: boolean;
  authReady: boolean;
  loginWithProfile: (user: UserProfile, rememberMe?: boolean) => void;
  logout: () => Promise<void>;
  switchRole: (role: RoleType) => void;
  hasPermission: (module: ModuleKey, action: ActionPermission) => boolean;
  rolePermissions: RolePermissions;
  updateRolePermissions: (permissions: RolePermissions) => void;

  // Pengaturan Akses Login Web Manual (Admin Utama)
  webAccessUsers: WebAccessUser[];
  webAccessPolicy: WebAccessPolicy;
  addWebAccessUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: RoleType;
    division?: string;
    supplierId?: string;
    supplierName?: string;
    isActive: boolean;
    allowGoogleLogin: boolean;
    notes?: string;
  }) => Promise<boolean>;
  updateWebAccessUser: (
    id: string,
    updates: Partial<Omit<WebAccessUser, 'id' | 'passwordHash'>> & { newPassword?: string }
  ) => Promise<boolean>;
  toggleWebAccessStatus: (id: string) => Promise<void>;
  deleteWebAccessUser: (id: string) => Promise<boolean>;
  updateWebAccessPolicy: (policy: Partial<WebAccessPolicy>) => Promise<void>;
  recordWebLoginTimestamp: (email: string) => void;
  findWebAccessUser: (identifier: string) => WebAccessUser | undefined;

  sppgConfig: SPPGConfig;
  updateSPPGConfig: (config: Partial<SPPGConfig>) => Promise<void>;

  // Master Data & Lembaga
  institutions: Institution[];
  addInstitution: (inst: Omit<Institution, 'id'>) => Promise<void>;
  updateInstitution: (id: string, inst: Partial<Institution>) => Promise<void>;
  updateInstitutionQuotaWithHistory: (id: string, smallPortions: number, largePortions: number, reason: string) => Promise<void>;
  deleteInstitution: (id: string) => Promise<void>;

  // Master Bahan Pangan
  masterBahan: MasterBahan[];
  addMasterBahan: (item: Omit<MasterBahan, 'id'>) => Promise<void>;
  updateMasterBahan: (id: string, item: Partial<MasterBahan>) => Promise<void>;
  deleteMasterBahan: (id: string) => Promise<void>;

  // Master Supplier
  masterSuppliers: MasterSupplier[];
  addMasterSupplier: (sup: Omit<MasterSupplier, 'id'>) => Promise<void>;
  updateMasterSupplier: (id: string, sup: Partial<MasterSupplier>) => Promise<void>;
  deleteMasterSupplier: (id: string) => Promise<void>;

  // Master Relawan
  masterVolunteers: MasterVolunteer[];
  addMasterVolunteer: (vol: Omit<MasterVolunteer, 'id'>) => Promise<void>;
  updateMasterVolunteer: (id: string, vol: Partial<MasterVolunteer>) => Promise<void>;
  deleteMasterVolunteer: (id: string) => Promise<void>;

  // Master Satuan & Konversi Dimensi
  masterUnits: MasterUnit[];
  addMasterUnit: (unit: Omit<MasterUnit, 'id'>) => Promise<void>;
  updateMasterUnit: (id: string, unit: Partial<MasterUnit>) => Promise<void>;
  deleteMasterUnit: (id: string) => Promise<void>;

  materialConversions: MaterialDimensionConversion[];
  addMaterialConversion: (conv: MaterialDimensionConversion) => Promise<void>;
  updateMaterialConversion: (materialName: string, conv: Partial<MaterialDimensionConversion>) => Promise<void>;
  deleteMaterialConversion: (materialName: string) => Promise<void>;

  // 7. Modul Penerima Manfaat: Kehadiran Harian & Riwayat
  beneficiaryAttendance: BeneficiaryAttendanceLog[];
  recordBeneficiaryAttendance: (log: Omit<BeneficiaryAttendanceLog, 'id' | 'presentSmall' | 'presentLarge' | 'actualPortions' | 'totalRegistered' | 'totalAbsent'>) => { success: boolean; error?: string };
  updateBeneficiaryAttendance: (id: string, log: Partial<BeneficiaryAttendanceLog>) => Promise<void>;
  beneficiaryQuotaHistory: BeneficiaryQuotaHistory[];

  // Operasional Lainnya
  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  approveMenuItem: (id: string, approvedBy: string) => Promise<void>;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number, reason: string) => Promise<void>;

  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => Promise<void>;
  updatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => Promise<void>;
  verifyPurchaseOrderFinance: (id: string, verifierName: string) => Promise<void>;
  approvePurchaseOrderHead: (id: string, approverName: string) => Promise<void>;
  updatePOQualityControl: (id: string, qcStatus: PurchaseOrder['qcStatus'], notes: string) => Promise<void>;
  receivePOToWarehouse: (id: string) => Promise<void>;

  // Modul PLOK: RAB & Quality Control
  rabItems: RABItem[];
  addRABItem: (item: Omit<RABItem, 'id' | 'totalBudget'>) => Promise<void>;
  updateRABItem: (id: string, item: Partial<RABItem>) => Promise<void>;
  deleteRABItem: (id: string) => Promise<void>;
  approveRABItem: (id: string, approverName: string) => Promise<void>;
  qualityControlRecords: QualityControlRecord[];
  addQualityControlRecord: (qc: Omit<QualityControlRecord, 'id' | 'inspectedAt'>) => Promise<void>;
  updateQualityControlRecord: (id: string, qc: Partial<QualityControlRecord>) => Promise<void>;

  distributionLogs: DistributionLog[];
  addDistributionLog: (log: Omit<DistributionLog, 'id'>) => Promise<void>;
  updateDistributionLog: (id: string, log: Partial<DistributionLog>) => Promise<void>;

  financialTransactions: FinancialTransaction[];
  addTransaction: (tx: Omit<FinancialTransaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<FinancialTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<boolean>;
  approveTransaction: (id: string, approverName: string) => Promise<void>;
  rejectTransaction: (id: string, reason: string) => Promise<void>;
  cancelTransaction: (id: string, reason: string, cancelledByName: string) => Promise<void>;

  volunteerAttendance: VolunteerAttendance[];
  recordAttendance: (att: Omit<VolunteerAttendance, 'id'>) => Promise<void>;
  updateAttendance: (id: string, att: Partial<VolunteerAttendance>) => Promise<void>;

  // Modul Ketidakhadiran Relawan
  volunteerAbsences: VolunteerAbsenceRecord[];
  addVolunteerAbsence: (rec: Omit<VolunteerAbsenceRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateVolunteerAbsence: (id: string, rec: Partial<VolunteerAbsenceRecord>) => Promise<void>;
  approveVolunteerAbsence: (id: string, approverName: string) => Promise<void>;
  rejectVolunteerAbsence: (id: string, reason: string) => Promise<void>;
  deleteVolunteerAbsence: (id: string) => Promise<void>;

  // Modul Portal Supplier (PO Khusus Supplier Terkait)
  supplierConfirmPO: (poId: string, estimatedDelivery: string, driverName?: string, driverPhone?: string, vehicleNumber?: string) => Promise<void>;
  supplierUpdatePOStatus: (poId: string, status: NonNullable<PurchaseOrder['supplierDeliveryStatus']>, notes?: string) => Promise<void>;
  supplierRejectPO: (poId: string, reason: string) => Promise<void>;
  supplierUploadDocument: (poId: string, doc: Omit<SupplierDocument, 'id' | 'uploadedAt'>) => Promise<void>;

  officialLetters: OfficialLetter[];
  addLetter: (letter: Omit<OfficialLetter, 'id'>) => Promise<void>;
  updateLetter: (id: string, letter: Partial<OfficialLetter>) => Promise<void>;

  // 14. Modul Administrasi Surat (Mailing & Salinan Template)
  outgoingDocuments: OutgoingDocument[];
  addOutgoingDocument: (doc: Omit<OutgoingDocument, 'id' | 'createdAt'>) => Promise<void>;
  updateOutgoingDocument: (id: string, doc: Partial<OutgoingDocument>) => Promise<void>;
  deleteOutgoingDocument: (id: string) => Promise<void>;

  // 15. Modul Surat Masuk (Register, Disposisi & Scan)
  incomingLetters: IncomingLetter[];
  addIncomingLetter: (lettr: Omit<IncomingLetter, 'id'>) => Promise<void>;
  updateIncomingLetter: (id: string, lettr: Partial<IncomingLetter>) => Promise<void>;
  deleteIncomingLetter: (id: string) => Promise<void>;

  auditLogs: AuditLog[];
  logAudit: (action: AuditLog['action'], module: AuditLog['module'], details: string) => Promise<void>;

  kitchenProgress: KitchenProgress;
  updateKitchenProgress: (progress: Partial<KitchenProgress>) => void;

  // 5 Divisi Dapur & Operasional
  prepRecords: PreparationInspectionRecord[];
  addPrepRecord: (rec: Omit<PreparationInspectionRecord, 'id'>) => Promise<void>;
  updatePrepRecord: (id: string, rec: Partial<PreparationInspectionRecord>) => Promise<void>;

  cookingRecords: CookingInspectionRecord[];
  addCookingRecord: (rec: Omit<CookingInspectionRecord, 'id'>) => Promise<void>;
  updateCookingRecord: (id: string, rec: Partial<CookingInspectionRecord>) => Promise<void>;

  portioningRecords: PortioningInspectionRecord[];
  addPortioningRecord: (rec: Omit<PortioningInspectionRecord, 'id'>) => Promise<void>;
  updatePortioningRecord: (id: string, rec: Partial<PortioningInspectionRecord>) => Promise<void>;

  distributionDeliveries: DistributionDeliveryRecord[];
  addDistributionDelivery: (rec: Omit<DistributionDeliveryRecord, 'id'>) => Promise<void>;
  updateDistributionDelivery: (id: string, rec: Partial<DistributionDeliveryRecord>) => Promise<void>;

  omprengReturns: OmprengReturnRecord[];
  addOmprengReturn: (rec: Omit<OmprengReturnRecord, 'id'>) => Promise<void>;

  fuelLogs: FuelLogRecord[];
  addFuelLog: (rec: Omit<FuelLogRecord, 'id'>) => Promise<void>;

  washingWasteRecords: WashingWasteRecord[];
  addWashingWasteRecord: (rec: Omit<WashingWasteRecord, 'id'>) => Promise<void>;
  updateWashingWasteRecord: (id: string, rec: Partial<WashingWasteRecord>) => Promise<void>;

  darkMode: boolean;
  toggleDarkMode: () => void;

  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;

  // Dynamic & Editable Form Schema Registry (Admin/Superuser Customizer)
  dynamicFormSchemas: Record<DynamicFormId, DynamicFormSchema>;
  isAdminUser: boolean;
  saveDynamicFormSchema: (formId: DynamicFormId, schema: DynamicFormSchema) => Promise<void>;
  resetDynamicFormSchema: (formId: DynamicFormId) => Promise<void>;

  isFirebaseConnected: boolean;
}

const defaultSPPGConfig: SPPGConfig = {
  sppgName: 'SPPG Probolinggo Krejengan Temenggungan 2',
  foundationName: 'Yayasan Hafshawaty',
  sppgId: 'GFBQSYXD',
  address: 'Dusun Krajan RT 03/RW 04 Desa Temenggungan',
  village: 'Temenggungan',
  district: 'Krejengan',
  regency: 'Kabupaten Probolinggo',
  province: 'Jawa Timur',
  rtRw: 'RT 03 / RW 04',
  headOfSppg: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
  nutritionOfficer: 'Siti Aminah, S.Gz., Dietisien',
  financeOfficer: 'M. Farhan Al-Hafshi, S.E., Ak.',
  phone: '0812-3456-7890 / (0335) 778901',
  email: 'sppg.tmg2@mbg-hafshawaty.id',
  programName: 'Program Makan Bergizi Gratis (MBG)',
  nationalAgency: 'Badan Gizi Nasional (BGN)',
  dailyPortionTarget: 2850,
  smallPortionBudget: 15000,
  largePortionBudget: 15000,
};

const defaultPermissions: RolePermissions = {
  'Admin Utama': { view: true, create: true, edit: true, delete: true, approve: true, print: true, export: true },
  'Kepala SPPG': { view: true, create: true, edit: true, delete: false, approve: true, print: true, export: true },
  'Pengawas Gizi': { view: true, create: true, edit: true, delete: false, approve: true, print: true, export: true },
  'Pengawas Keuangan': { view: true, create: true, edit: true, delete: false, approve: true, print: true, export: true },
  'Asisten Lapangan': { view: true, create: true, edit: true, delete: false, approve: false, print: true, export: true },
  'Admin Gudang': { view: true, create: true, edit: true, delete: false, approve: false, print: true, export: true },
  'Cheff': { view: true, create: true, edit: true, delete: false, approve: false, print: true, export: false },
  'Relawan Div. Persiapan': { view: true, create: false, edit: true, delete: false, approve: false, print: false, export: false },
  'Relawan Div. Pengolahan': { view: true, create: false, edit: true, delete: false, approve: false, print: false, export: false },
  'Relawan Div. Pemorsian': { view: true, create: false, edit: true, delete: false, approve: false, print: false, export: false },
  'Relawan Div. Distribusi': { view: true, create: false, edit: true, delete: false, approve: false, print: true, export: false },
  'Relawan Div. Cuci Ompreng': { view: true, create: false, edit: true, delete: false, approve: false, print: false, export: false },
  'Supplier / Mitra Pangan': { view: true, create: true, edit: true, delete: false, approve: false, print: true, export: true },
};

export const initialUsers: UserProfile[] = [
  { uid: 'u1', name: 'Gusti Agung (Admin Utama)', email: 'admin@sppg-tmg2.id', role: 'Admin Utama', isActive: true },
  { uid: 'u2', name: 'Dr. H. Ahmad Zaini, S.Pd.', email: 'kepala@sppg-tmg2.id', role: 'Kepala SPPG', isActive: true },
  { uid: 'u3', name: 'Siti Aminah, S.Gz.', email: 'gizi@sppg-tmg2.id', role: 'Pengawas Gizi', isActive: true },
  { uid: 'u4', name: 'M. Farhan, S.E.', email: 'keuangan@sppg-tmg2.id', role: 'Pengawas Keuangan', isActive: true },
  { uid: 'u5', name: 'Rahmat Hidayat (Aslap)', email: 'lapangan@sppg-tmg2.id', role: 'Asisten Lapangan', isActive: true },
  { uid: 'u6', name: 'Bambang Supriyanto', email: 'gudang@sppg-tmg2.id', role: 'Admin Gudang', isActive: true },
  { uid: 'u7', name: 'Chef Junaidi Hasan', email: 'chef@sppg-tmg2.id', role: 'Cheff', isActive: true },
  { uid: 'u8', name: 'Dewi Sartika (Persiapan)', email: 'persiapan@sppg-tmg2.id', role: 'Relawan Div. Persiapan', division: 'Persiapan', isActive: true },
  { uid: 'u9', name: 'Suparman (Pengolahan)', email: 'pengolahan@sppg-tmg2.id', role: 'Relawan Div. Pengolahan', division: 'Pengolahan', isActive: true },
  { uid: 'u10', name: 'Nurul Hidayati (Pemorsian)', email: 'pemorsian@sppg-tmg2.id', role: 'Relawan Div. Pemorsian', division: 'Pemorsian', isActive: true },
  { uid: 'u11', name: 'Agus Santoso (Distribusi)', email: 'distribusi@sppg-tmg2.id', role: 'Relawan Div. Distribusi', division: 'Distribusi', isActive: true },
  { uid: 'u12', name: 'Kholifah (Cuci Ompreng)', email: 'cuci@sppg-tmg2.id', role: 'Relawan Div. Cuci Ompreng', division: 'Cuci Ompreng', isActive: true },
  { uid: 'u13', name: 'H. Suwandi (PT Unggas Barokah)', email: 'supplier.ayam@unggasbarokah.com', role: 'Supplier / Mitra Pangan', supplierId: 'sup-1', supplierName: 'PT Unggas Barokah Probolinggo', isActive: true },
  { uid: 'u14', name: 'Pak Sugiono (CV Sembako & Bawang)', email: 'supplier.sembako@dringu.id', role: 'Supplier / Mitra Pangan', supplierId: 'sup-2', supplierName: 'Petani Bawang Dringu & CV Sembako', isActive: true },
  { uid: 'u15', name: 'Moch. Mansur (Kebun Pisang Gending)', email: 'supplier.pisang@gending.id', role: 'Supplier / Mitra Pangan', supplierId: 'sup-3', supplierName: 'Kebun Pisang Gending', isActive: true },
];

export function resolveUserByIdentifier(identifier: string): UserProfile | undefined {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'sppgkrejengantemenggungan2@gmail.com' || normalized === 'sppgkrejengantemenggungan2') {
    return {
      uid: 'admin-sppg-tmg2',
      name: 'Admin SPPG Temenggungan 2',
      email: 'sppgkrejengantemenggungan2@gmail.com',
      role: 'Admin Utama',
      isActive: true,
    };
  }
  if (normalized === 'gustiagung1100@gmail.com' || normalized === 'gustiagung1100') {
    return {
      uid: 'admin-gusti',
      name: 'Gusti Agung (Admin Utama)',
      email: 'gustiagung1100@gmail.com',
      role: 'Admin Utama',
      isActive: true,
    };
  }
  return initialUsers.find(
    u =>
      u.email.toLowerCase() === normalized ||
      u.email.split('@')[0].toLowerCase() === normalized
  );
}

const DEFAULT_WEB_ACCESS_POLICY: WebAccessPolicy = {
  strictWhitelistOnly: true,
  allowSelfRegistration: false,
  allowDemoPreview: false,
};

function buildDefaultWebAccessUsers(): WebAccessUser[] {
  const now = '2026-11-01 08:00:00';
  return [
    {
      id: 'wau-admin-sppg',
      name: 'Admin SPPG Temenggungan 2',
      email: 'sppgkrejengantemenggungan2@gmail.com',
      role: 'Admin Utama',
      passwordHash: hashLoginPassword('sppgkrejengantemenggungan2@gmail.com', 'Krejengan'),
      isActive: true,
      allowGoogleLogin: true,
      isProtectedAdmin: true,
      createdAt: now,
      createdBy: 'Sistem Inti SPPG TMG2',
      updatedAt: now,
      updatedBy: 'Sistem Inti SPPG TMG2',
      notes: 'Akun Admin Utama Resmi SPPG Krejengan Temenggungan 2',
    },
    {
      id: 'wau-admin-gusti',
      name: 'Gusti Agung (Admin Utama)',
      email: 'gustiagung1100@gmail.com',
      role: 'Admin Utama',
      passwordHash: hashLoginPassword('gustiagung1100@gmail.com', 'Gusti123'),
      isActive: true,
      allowGoogleLogin: true,
      isProtectedAdmin: true,
      createdAt: now,
      createdBy: 'Sistem Inti SPPG TMG2',
      updatedAt: now,
      updatedBy: 'Sistem Inti SPPG TMG2',
      notes: 'Akun Super Admin Pengelola Sistem E-SPPG TMG2',
    },
  ];
}

function mergeProtectedAdmins(users: WebAccessUser[]): WebAccessUser[] {
  const defaults = buildDefaultWebAccessUsers();
  const list = Array.isArray(users) ? [...users] : [];
  for (const def of defaults) {
    const idx = list.findIndex(u => u.email.trim().toLowerCase() === def.email.toLowerCase());
    if (idx === -1) {
      list.unshift(def);
    } else {
      list[idx] = {
        ...list[idx],
        role: 'Admin Utama',
        isActive: true,
        allowGoogleLogin: true,
        isProtectedAdmin: true,
        passwordHash: list[idx].passwordHash || def.passwordHash,
      };
    }
  }
  return list;
}

const initialMenuItems: MenuItem[] = [
  {
    id: 'menu-1',
    date: '2026-11-08',
    dayName: 'Minggu',
    cycleWeek: 2,
    menuCode: 'MBG-TMG2-H08',
    stapleFood: 'Nasi Putih Pulen Wangi',
    animalProtein: 'Ayam Goreng Fillet Saus Mentega Madu',
    plantProtein: 'Tahu Tempe Bacem Gurih Legit',
    vegetable: 'Sayur Sop Wortel, Buncis & Jagung Manis',
    fruit: 'Pisang Cavendish Masak Pohon',
    milkOrExtra: 'Susu Pasteurisasi UHT 125ml Rasa Cokelat',
    caloriesSmall: 620,
    caloriesLarge: 875,
    proteinGrams: 28.5,
    carbGrams: 94.2,
    fatGrams: 20.4,
    fiberGrams: 6.8,
    calciumMg: 310,
    ironMg: 3.8,
    targetPortions: 2850,
    estimatedCostPerPortion: 13450,
    status: 'Disetujui Kepala',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    notes: 'Kadar garam dijaga < 1.5g per porsi, bebas MSG sintetis.',
  },
  {
    id: 'menu-2',
    date: '2026-11-09',
    dayName: 'Senin',
    cycleWeek: 2,
    menuCode: 'MBG-TMG2-H09',
    stapleFood: 'Nasi Kuning Gurih Alami Kunyit',
    animalProtein: 'Semur Daging Sapi Suwir Empuk',
    plantProtein: 'Perkedel Tempe Rempah Daun Jeruk',
    vegetable: 'Tumis Buncis Jagung Pipil & Wortel',
    fruit: 'Irisan Semangka Merah Segar',
    milkOrExtra: 'Puding Kacang Hijau Santan Encer',
    caloriesSmall: 640,
    caloriesLarge: 890,
    proteinGrams: 30.2,
    carbGrams: 98.0,
    fatGrams: 21.0,
    fiberGrams: 7.2,
    calciumMg: 295,
    ironMg: 4.5,
    targetPortions: 2850,
    estimatedCostPerPortion: 13800,
    status: 'Disetujui Kepala',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    notes: 'Daging sapi dari supplier RPH Kraksaan bersertifikat Halal MUI.',
  },
  {
    id: 'menu-3',
    date: '2026-11-10',
    dayName: 'Selasa',
    cycleWeek: 2,
    menuCode: 'MBG-TMG2-H10',
    stapleFood: 'Nasi Putih Pulen',
    animalProtein: 'Ikan Tenggiri / Kakap Asam Manis Nanas',
    plantProtein: 'Tahu Goreng Balado Tomat Manis',
    vegetable: 'Capcay Kuah Segar Bakso Sapi & Brokoli',
    fruit: 'Jeruk Manis Semboro Jember',
    milkOrExtra: 'Susu UHT Putih Plain 125ml',
    caloriesSmall: 610,
    caloriesLarge: 860,
    proteinGrams: 27.8,
    carbGrams: 92.5,
    fatGrams: 19.8,
    fiberGrams: 8.1,
    calciumMg: 325,
    ironMg: 3.4,
    targetPortions: 2850,
    estimatedCostPerPortion: 13600,
    status: 'Diverifikasi Gizi',
    approvedBy: 'Siti Aminah, S.Gz.',
    notes: 'Ikan bebas duri (fillet), dicek khusus untuk porsi anak PAUD.',
  },
];

const initialInventory: InventoryItem[] = [
  {
    id: 'inv-1',
    code: 'BHK-001',
    name: 'Beras Medium Pulen Probolinggo',
    category: 'Bahan Kering',
    initialStock: 1000,
    currentStock: 1250,
    minimumStock: 400,
    unit: 'kg',
    pricePerUnit: 13500,
    storageLocation: 'Gudang Kering A',
    supplierName: 'UD Lumbung Padi Krejengan',
    lastRestocked: '2026-11-06',
    expiryDate: '2027-02-28',
    qualityStatus: 'Baik',
  },
  {
    id: 'inv-2',
    code: 'BSG-002',
    name: 'Daging Ayam Broiler Fillet Segar',
    category: 'Bahan Segar',
    initialStock: 200,
    currentStock: 95,
    minimumStock: 150,
    unit: 'kg',
    pricePerUnit: 38000,
    storageLocation: 'Cold Storage 1',
    supplierName: 'PT Unggas Barokah Probolinggo',
    lastRestocked: '2026-11-07',
    expiryDate: '2026-11-10',
    qualityStatus: 'Perlu Pemantauan',
  },
  {
    id: 'inv-3',
    code: 'BSG-003',
    name: 'Telur Ayam Ras Segar Grade A',
    category: 'Bahan Segar',
    initialStock: 350,
    currentStock: 480,
    minimumStock: 300,
    unit: 'kg',
    pricePerUnit: 27500,
    storageLocation: 'Chiller Dapur',
    supplierName: 'Peternakan Ayam Barokah Pajarakan',
    lastRestocked: '2026-11-07',
    expiryDate: '2026-11-21',
    qualityStatus: 'Baik',
  },
  {
    id: 'inv-4',
    code: 'BSG-004',
    name: 'Wortel Brastagi Segar Manis',
    category: 'Bahan Segar',
    initialStock: 100,
    currentStock: 120,
    minimumStock: 80,
    unit: 'kg',
    pricePerUnit: 14000,
    storageLocation: 'Chiller Dapur',
    supplierName: 'Koperasi Tani Makmur Sukapura',
    lastRestocked: '2026-11-07',
    expiryDate: '2026-11-13',
    qualityStatus: 'Baik',
  },
  {
    id: 'inv-5',
    code: 'BHK-005',
    name: 'Minyak Goreng Sawit Kemasan 2L',
    category: 'Bahan Kering',
    initialStock: 80,
    currentStock: 140,
    minimumStock: 100,
    unit: 'liter',
    pricePerUnit: 17500,
    storageLocation: 'Gudang Kering B',
    supplierName: 'CV Sembako Jaya Sejahtera',
    lastRestocked: '2026-11-05',
    expiryDate: '2027-05-15',
    qualityStatus: 'Baik',
  },
  {
    id: 'inv-6',
    code: 'BSG-006',
    name: 'Pisang Cavendish Matang Alami',
    category: 'Bahan Segar',
    initialStock: 3000,
    currentStock: 2900,
    minimumStock: 1000,
    unit: 'butir',
    pricePerUnit: 1800,
    storageLocation: 'Gudang Kering A',
    supplierName: 'Kebun Pisang Gending',
    lastRestocked: '2026-11-07',
    expiryDate: '2026-11-11',
    qualityStatus: 'Baik',
  },
  {
    id: 'inv-7',
    code: 'KMH-007',
    name: 'Kotak Ompreng Stainless Steel Food Grade',
    category: 'Kemasan & Higiene',
    initialStock: 3200,
    currentStock: 3200,
    minimumStock: 3000,
    unit: 'pak',
    pricePerUnit: 45000,
    storageLocation: 'Gudang Kering B',
    supplierName: 'PT Kitchenware Prima',
    lastRestocked: '2026-10-15',
    expiryDate: '2030-12-31',
    qualityStatus: 'Baik',
  },
  {
    id: 'inv-8',
    code: 'BMB-008',
    name: 'Bawang Merah Probolinggo Super',
    category: 'Bumbu & Rempah',
    initialStock: 60,
    currentStock: 32,
    minimumStock: 50,
    unit: 'kg',
    pricePerUnit: 34000,
    storageLocation: 'Rak Bumbu',
    supplierName: 'Petani Bawang Dringu',
    lastRestocked: '2026-11-05',
    expiryDate: '2026-11-25',
    qualityStatus: 'Perlu Pemantauan',
  },
];

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0088',
    date: '2026-11-07',
    supplierName: 'PT Unggas Barokah Probolinggo',
    supplierContact: 'H. Suwandi - 0812-7788-9911',
    deliveryDate: '2026-11-08',
    items: [
      { itemId: 'inv-2', itemName: 'Daging Ayam Broiler Fillet Segar', quantity: 280, unit: 'kg', unitPrice: 38000, subtotal: 10640000 },
    ],
    totalAmount: 10640000,
    status: 'Disetujui Kepala',
    qcStatus: 'Lolos Penuh',
    qcNotes: 'Suhu tiba 3.8°C, bau segar alami, potongan seragam bersih tanpa lemak berlebih.',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Pengiriman batch subuh pukul 03:30 WIB untuk masak porsi SD.',
    supplierConfirmed: true,
    supplierConfirmedAt: '2026-11-07 14:00',
    supplierEstimatedDelivery: '2026-11-08 03:30 WIB',
    supplierDriverName: 'Budi Santoso',
    supplierDriverPhone: '0813-8822-1100',
    supplierVehicleNumber: 'N 8922 UB',
    supplierDeliveryStatus: 'Telah Tiba di Gudang',
    supplierDocuments: [
      {
        id: 'doc-1',
        type: 'Surat Jalan',
        fileName: 'Surat_Jalan_UB_0088.pdf',
        fileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
        uploadedAt: '2026-11-07 15:00:00',
      },
      {
        id: 'doc-2',
        type: 'Sertifikat Halal',
        fileName: 'Sertifikat_Halal_RPHU_2026.pdf',
        fileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
        uploadedAt: '2026-11-07 15:15:00',
      },
    ],
  },
  {
    id: 'po-2',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0089',
    date: '2026-11-08',
    supplierName: 'Petani Bawang Dringu & CV Sembako',
    supplierContact: 'Pak Sugiono - 0852-3344-9988',
    deliveryDate: '2026-11-09',
    items: [
      { itemId: 'inv-8', itemName: 'Bawang Merah Probolinggo Super', quantity: 60, unit: 'kg', unitPrice: 34000, subtotal: 2040000 },
      { itemId: 'inv-5', itemName: 'Minyak Goreng Sawit Kemasan 2L', quantity: 80, unit: 'liter', unitPrice: 17500, subtotal: 1400000 },
    ],
    totalAmount: 3440000,
    status: 'Menunggu Verifikasi Keuangan',
    qcStatus: 'Belum QC',
    notes: 'Kebutuhan restock bahan dapur yang menipis di gudang.',
    supplierConfirmed: true,
    supplierConfirmedAt: '2026-11-08 16:30',
    supplierEstimatedDelivery: '2026-11-09 06:00 WIB',
    supplierDriverName: 'Sugiarto',
    supplierDriverPhone: '0852-9988-1122',
    supplierVehicleNumber: 'N 8140 DR',
    supplierDeliveryStatus: 'Sedang Dipersiapkan',
  },
  {
    id: 'po-3',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0087',
    date: '2026-11-06',
    supplierName: 'Kebun Pisang Gending',
    supplierContact: 'Moch. Mansur - 0819-2233-4455',
    deliveryDate: '2026-11-07',
    items: [
      { itemId: 'inv-6', itemName: 'Pisang Cavendish Matang Alami', quantity: 2900, unit: 'butir', unitPrice: 1800, subtotal: 5220000 },
    ],
    totalAmount: 5220000,
    status: 'Diterima di Gudang',
    qcStatus: 'Lolos Penuh',
    qcNotes: 'Tingkat kematangan 85%, kulit mulus tanpa memar.',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Distribusi untuk menu hari Minggu dan Senin.',
    supplierConfirmed: true,
    supplierConfirmedAt: '2026-11-06 13:00',
    supplierEstimatedDelivery: '2026-11-07 05:00 WIB',
    supplierDriverName: 'Moch. Mansur',
    supplierDriverPhone: '0819-2233-4455',
    supplierVehicleNumber: 'N 7721 GD',
    supplierDeliveryStatus: 'Telah Tiba di Gudang',
  },
  {
    id: 'po-4',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0091',
    date: '2026-11-09',
    supplierName: 'PT Unggas Barokah Probolinggo',
    supplierContact: 'H. Suwandi - 0812-7788-9911',
    deliveryDate: '2026-11-10',
    items: [
      { itemId: 'inv-2', itemName: 'Daging Ayam Broiler Fillet Segar', quantity: 290, unit: 'kg', unitPrice: 38000, subtotal: 11020000 },
    ],
    totalAmount: 11020000,
    status: 'Disetujui Kepala',
    qcStatus: 'Belum QC',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Kebutuhan pasokan ayam potong segar untuk menu hari Selasa, 10 November 2026. Harap konfirmasi kesanggupan.',
    supplierConfirmed: false,
    supplierDeliveryStatus: 'Menunggu Konfirmasi',
  },
];

const initialDistributions: DistributionLog[] = [
  {
    id: 'dist-1',
    date: '2026-11-08',
    institutionId: 'inst-1',
    institutionName: 'SDN Temenggungan 1',
    smallPortions: 180,
    largePortions: 220,
    totalPortions: 400,
    vehicleNumber: 'N 8921 RA (Armada 1)',
    driverName: 'Agus Santoso',
    departureTime: '08:30 WIB',
    arrivalTime: '09:05 WIB',
    foodTempAtDispatch: 68.5,
    foodTempAtArrival: 64.2,
    receivedBy: 'Dra. Hj. Nurul Qomariyah',
    receiverTitle: 'Kepala Sekolah',
    status: 'Selesai Serah Terima',
    bastNumber: 'BAST/MBG-TMG2/2026/11/0401',
    notes: 'Diterima utuh 400 boks, ompreng bersih dan segel terpasang rapi.',
  },
  {
    id: 'dist-2',
    date: '2026-11-08',
    institutionId: 'inst-2',
    institutionName: 'SDN Temenggungan 2',
    smallPortions: 140,
    largePortions: 185,
    totalPortions: 325,
    vehicleNumber: 'N 8921 RA (Armada 1)',
    driverName: 'Agus Santoso',
    departureTime: '09:15 WIB',
    arrivalTime: '09:40 WIB',
    foodTempAtDispatch: 67.0,
    foodTempAtArrival: 63.8,
    receivedBy: 'Slamet Riyadi, S.Pd.',
    receiverTitle: 'Koordinator MBG',
    status: 'Selesai Serah Terima',
    bastNumber: 'BAST/MBG-TMG2/2026/11/0402',
    notes: 'Selesai serah terima dan foto bersama kepala sekolah.',
  },
  {
    id: 'dist-3',
    date: '2026-11-08',
    institutionId: 'inst-3',
    institutionName: 'MIS Hafshawaty Zainul Hasan',
    smallPortions: 280,
    largePortions: 320,
    totalPortions: 600,
    vehicleNumber: 'N 8104 RB (Armada 2)',
    driverName: 'Rudi Hartono',
    departureTime: '09:00 WIB',
    arrivalTime: '09:25 WIB',
    foodTempAtDispatch: 69.0,
    foodTempAtArrival: 65.5,
    receivedBy: 'Ust. Abdul Malik, M.Pd.I.',
    receiverTitle: 'Kepala Madrasah',
    status: 'Selesai Serah Terima',
    bastNumber: 'BAST/MBG-TMG2/2026/11/0403',
    notes: 'Ompreng diterima langsung oleh tim guru piket.',
  },
  {
    id: 'dist-4',
    date: '2026-11-08',
    institutionId: 'inst-4',
    institutionName: 'MTs Hafshawaty Zainul Hasan',
    smallPortions: 0,
    largePortions: 480,
    totalPortions: 480,
    vehicleNumber: 'N 8104 RB (Armada 2)',
    driverName: 'Rudi Hartono',
    departureTime: '10:00 WIB',
    arrivalTime: '10:20 WIB',
    foodTempAtDispatch: 68.0,
    foodTempAtArrival: 64.0,
    receivedBy: 'Drs. H. Mahrus Ali',
    receiverTitle: 'Kepala MTs',
    status: 'Selesai Serah Terima',
    bastNumber: 'BAST/MBG-TMG2/2026/11/0404',
    notes: 'Porsi besar diterima lengkap untuk santri.',
  },
  {
    id: 'dist-5',
    date: '2026-11-08',
    institutionId: 'inst-5',
    institutionName: 'SMPN 1 Krejengan',
    smallPortions: 0,
    largePortions: 410,
    totalPortions: 410,
    vehicleNumber: 'N 8332 RC (Armada 3)',
    driverName: 'Hasan Basri',
    departureTime: '10:15 WIB',
    arrivalTime: '10:45 WIB',
    foodTempAtDispatch: 67.5,
    status: 'Dalam Perjalanan',
    notes: 'Menuju lokasi sekolah melalui jalur timur.',
  },
  {
    id: 'dist-6',
    date: '2026-11-08',
    institutionId: 'inst-6',
    institutionName: 'PAUD & TK Al-Hafsh Krejengan',
    smallPortions: 160,
    largePortions: 0,
    totalPortions: 160,
    vehicleNumber: 'N 8921 RA (Armada 1)',
    driverName: 'Agus Santoso',
    departureTime: '08:00 WIB',
    arrivalTime: '08:20 WIB',
    foodTempAtDispatch: 68.0,
    foodTempAtArrival: 65.0,
    receivedBy: 'Umi Kalsum, S.Pd.AUD.',
    receiverTitle: 'Kepala PAUD',
    status: 'Selesai Serah Terima',
    bastNumber: 'BAST/MBG-TMG2/2026/11/0400',
    notes: 'Porsi kecil tepat waktu sebelum jam makan pagi anak-anak.',
  },
  {
    id: 'dist-7',
    date: '2026-11-08',
    institutionId: 'inst-7',
    institutionName: 'SMKN 1 Krejengan',
    smallPortions: 0,
    largePortions: 325,
    totalPortions: 325,
    vehicleNumber: 'N 8332 RC (Armada 3)',
    driverName: 'Hasan Basri',
    departureTime: '11:00 WIB',
    arrivalTime: '11:30 WIB',
    foodTempAtDispatch: 68.0,
    status: 'Dijadwalkan',
    notes: 'Pemberangkatan kloter siang pukul 11:00 WIB.',
  },
  {
    id: 'dist-8',
    date: '2026-11-08',
    institutionId: 'inst-8',
    institutionName: 'MA Model Hafshawaty',
    smallPortions: 0,
    largePortions: 150,
    totalPortions: 150,
    vehicleNumber: 'N 8104 RB (Armada 2)',
    driverName: 'Rudi Hartono',
    departureTime: '11:15 WIB',
    arrivalTime: '11:35 WIB',
    foodTempAtDispatch: 67.5,
    status: 'Dijadwalkan',
    notes: 'Dijadwalkan tiba menjelang istirahat dhuhur santri.',
  },
];

const initialTransactions: FinancialTransaction[] = [
  {
    id: 'tx-1',
    transactionNumber: 'BKM/SPPG-TMG2/2026/XI/001',
    date: '2026-11-01',
    type: 'Pemasukan',
    category: 'Dana Termin BGN',
    amount: 384750000,
    description: 'Pencairan Dana Alokasi MBG BGN Termin I November 2026 (25 Hari Operasi x 2.850 Porsi)',
    sourceOrRecipient: 'KPPN Probolinggo / Badan Gizi Nasional',
    proofNumber: 'SP2D-BGN-09823/2026',
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    paymentMethod: 'Transfer Bank',
    bankAccount: 'Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Disetujui',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    approvedAt: '2026-11-01 10:00:00',
    notes: 'Dana termin BGN resmi masuk rekening giro operasional SPPG.',
  },
  {
    id: 'tx-2',
    transactionNumber: 'BKK/SPPG-TMG2/2026/XI/0012',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Bahan Baku',
    amount: 10640000,
    description: 'Pembayaran PO Daging Ayam Fillet Segar 280 kg untuk Menu Minggu 8 Nov 2026',
    sourceOrRecipient: 'PT Unggas Barokah Probolinggo',
    supplierName: 'PT Unggas Barokah Probolinggo',
    proofNumber: 'KWT-UB-00912',
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    paymentMethod: 'Transfer Bank',
    bankAccount: 'Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Disetujui',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    approvedAt: '2026-11-07 15:30:00',
    notes: 'Sesuai dengan PO/SPPG-TMG2/2026/XI/0088 yang telah diverifikasi QC gudang.',
  },
  {
    id: 'tx-3',
    transactionNumber: 'BKK/SPPG-TMG2/2026/XI/0013',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Bahan Baku',
    amount: 5220000,
    description: 'Pembelian Buah Pisang Cavendish Segar 2.900 butir',
    sourceOrRecipient: 'Kebun Pisang Gending',
    supplierName: 'Kebun Pisang Gending',
    proofNumber: 'NOTA-KPG-771',
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    paymentMethod: 'Tunai',
    bankAccount: 'Kas Tunai Dapur (Petty Cash)',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Disetujui',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    approvedAt: '2026-11-07 16:00:00',
    notes: 'Pembayaran tunai langsung saat buah tiba di gudang SPPG.',
  },
  {
    id: 'tx-4',
    transactionNumber: 'BKK/SPPG-TMG2/2026/XI/0014',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Operasional Dapur',
    amount: 1850000,
    description: 'Refill Tabung Gas LPG 50 kg x 2 Tabung untuk Dapur Pengolahan Utama',
    sourceOrRecipient: 'Agen LPG Pertamina Krejengan',
    supplierName: 'Agen LPG Pertamina Krejengan',
    proofNumber: 'NOTA-LPG-332',
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    paymentMethod: 'Tunai',
    bankAccount: 'Kas Tunai Dapur (Petty Cash)',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Disetujui',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    approvedAt: '2026-11-07 16:45:00',
    notes: 'Kebutuhan bahan bakar masak siklus 3 hari ke depan.',
  },
  {
    id: 'tx-5',
    transactionNumber: 'BKK/SPPG-TMG2/2026/XI/0015',
    date: '2026-11-08',
    type: 'Pengeluaran',
    category: 'Logistik & Armada',
    amount: 750000,
    description: 'Bahan Bakar Minyak Dexlite 3 Unit Kendaraan Distribusi SPPG TMG2',
    sourceOrRecipient: 'SPBU Krejengan Probolinggo',
    proofNumber: 'STRUK-SPBU-88192',
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    paymentMethod: 'Tunai',
    bankAccount: 'Kas Operasional Lapangan',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Disetujui',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    approvedAt: '2026-11-08 07:30:00',
    notes: 'Klaim BBM armada box isothermal rute timur dan barat.',
  },
  {
    id: 'tx-6',
    transactionNumber: 'BKK/SPPG-TMG2/2026/XI/0016',
    date: '2026-11-08',
    type: 'Pengeluaran',
    category: 'Upah Relawan',
    amount: 3500000,
    description: 'Insentif Harian 28 Relawan Dapur & Distribusi Tanggal 8 November 2026',
    sourceOrRecipient: 'Koordinator Relawan SPPG TMG2',
    proofNumber: 'DAFTAR-INSENTIF-0811',
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    paymentMethod: 'Tunai',
    bankAccount: 'Kas Tunai Dapur (Petty Cash)',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Disetujui',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd., M.M.',
    approvedAt: '2026-11-08 14:00:00',
    notes: 'Diberikan tunai setelah seluruh ompreng selesai dicuci dan disterilisasi.',
  },
  {
    id: 'tx-7',
    transactionNumber: 'BKK/SPPG-TMG2/2026/XI/0017',
    date: '2026-11-08',
    type: 'Pengeluaran',
    category: 'Perlengkapan',
    amount: 1450000,
    description: 'Pembelian Sarung Tangan Nitril Food Grade & Hairnet 10 Boks',
    sourceOrRecipient: 'CV Berkah Hygiene Mandiri',
    supplierName: 'CV Berkah Hygiene Mandiri',
    proofNumber: 'INV-BHM-4401',
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    paymentMethod: 'Transfer Bank',
    bankAccount: 'Bank Jatim Cab. Kraksaan (0132-99-8812)',
    proofFileUrl: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    approvalStatus: 'Menunggu Persetujuan',
    notes: 'Pengajuan belanja perlengkapan sanitasi dan APD relawan dapur.',
  },
];

const initialVolunteers: VolunteerAttendance[] = [
  {
    id: 'v-1',
    date: '2026-11-08',
    volunteerId: 'vol-01',
    volunteerName: 'Dewi Sartika',
    division: 'Persiapan',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    notes: 'Kondisi sehat prima, memimpin penyiapan sayur.',
  },
  {
    id: 'v-2',
    date: '2026-11-08',
    volunteerId: 'vol-02',
    volunteerName: 'Siti Rohimah',
    division: 'Persiapan',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Sakit',
    healthCheckPassed: false,
    hygieneGearComplete: false,
    reason: 'Flu dan demam ringan (istirahat mandiri)',
    replacementVolunteer: 'Bu Anisa (Relawan Cadangan)',
    notes: 'Telah digantikan oleh Bu Anisa dari daftar cadangan.',
  },
  {
    id: 'v-3',
    date: '2026-11-08',
    volunteerId: 'vol-03',
    volunteerName: 'Suparman',
    division: 'Pengolahan',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    notes: 'Menangani penggorengan ayam bumbu kecap madu.',
  },
  {
    id: 'v-4',
    date: '2026-11-08',
    volunteerId: 'vol-04',
    volunteerName: 'Hadi Sukamto',
    division: 'Pengolahan',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    notes: 'Memasak sop sayur dan memastikan suhu > 75°C.',
  },
  {
    id: 'v-5',
    date: '2026-11-08',
    volunteerId: 'vol-05',
    volunteerName: 'Nurul Hidayati',
    division: 'Pemorsian',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    notes: 'Penanggung jawab timbangan porsi kecil 380 gram.',
  },
  {
    id: 'v-6',
    date: '2026-11-08',
    volunteerId: 'vol-06',
    volunteerName: 'Lina Marlina',
    division: 'Pemorsian',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Izin',
    healthCheckPassed: true,
    hygieneGearComplete: false,
    reason: 'Menghadiri wisuda adik kandung di Kraksaan',
    replacementVolunteer: 'Mbak Ririn (Relawan Cadangan)',
    notes: 'Surat izin disetujui Kepala SPPG, digantikan Mbak Ririn.',
  },
  {
    id: 'v-7',
    date: '2026-11-08',
    volunteerId: 'vol-07',
    volunteerName: 'Agus Santoso',
    division: 'Distribusi',
    shift: 'Pagi (03:30 - 08:30)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    notes: 'Pengemudi Armada 1 rute Temenggungan.',
  },
  {
    id: 'v-8',
    date: '2026-11-08',
    volunteerId: 'vol-08',
    volunteerName: 'Kholifah',
    division: 'Cuci Ompreng',
    shift: 'Siang (08:00 - 13:00)',
    status: 'Hadir',
    healthCheckPassed: true,
    hygieneGearComplete: true,
    notes: 'Proses sterilisasi ompreng kembali dari kloter 1.',
  },
];

const defaultVolunteerAbsences: VolunteerAbsenceRecord[] = [
  {
    id: 'abs-1',
    date: '2026-11-08',
    volunteerId: 'vol-02',
    volunteerName: 'Siti Rohimah',
    division: 'Persiapan',
    reason: 'Sakit',
    reasonDetails: 'Gejala flu batuk dan demam ringan (suhu 37.8°C)',
    replacementVolunteerId: 'vol-cad-1',
    replacementVolunteerName: 'Bu Anisa',
    replacementDivision: 'Persiapan',
    approvalStatus: 'Disetujui',
    approvedBy: 'Chef Junaidi Hasan',
    approvedAt: '2026-11-08 03:15:00',
    notes: 'Disetujui demi kepatuhan sanitasi higiene pangan dapur MBG.',
    createdAt: '2026-11-08 03:00:00',
  },
  {
    id: 'abs-2',
    date: '2026-11-09',
    volunteerId: 'vol-06',
    volunteerName: 'Rina Maryana',
    division: 'Pemorsian',
    reason: 'Izin Keperluan Keluarga',
    reasonDetails: 'Menghadiri wisuda adik kandung di Kraksaan',
    replacementVolunteerId: 'vol-cad-2',
    replacementVolunteerName: 'Mbak Ririn',
    replacementDivision: 'Pemorsian',
    approvalStatus: 'Disetujui',
    approvedBy: 'Siti Aminah, S.Gz.',
    approvedAt: '2026-11-08 19:30:00',
    notes: 'Surat permohonan izin diajukan H-1, pengganti telah konfirmasi sanggup hadir.',
    createdAt: '2026-11-08 16:00:00',
  },
  {
    id: 'abs-3',
    date: '2026-11-10',
    volunteerId: 'vol-04',
    volunteerName: 'Hariyanto',
    division: 'Distribusi',
    reason: 'Kendala Transportasi / Cuaca',
    reasonDetails: 'Perbaikan motor operasional pribadi',
    replacementVolunteerId: 'vol-cad-3',
    replacementVolunteerName: 'Bambang Irawan',
    replacementDivision: 'Distribusi',
    approvalStatus: 'Menunggu Persetujuan',
    notes: 'Menunggu verifikasi Asisten Lapangan & Kepala SPPG.',
    createdAt: '2026-11-09 08:30:00',
  },
];

const initialLetters: OfficialLetter[] = [
  {
    id: 'let-1',
    letterNumber: '005/BGN-WIL.JTM/MBG/X/2026',
    type: 'Surat Masuk',
    date: '2026-10-28',
    subject: 'Instruksi Standar Kebersihan & Verifikasi Suhu Makanan Siap Santap MBG',
    senderOrReceiver: 'Badan Gizi Nasional Kantor Wilayah Jawa Timur',
    category: 'Dinas/BGN',
    status: 'Selesai Disposisi',
  },
  {
    id: 'let-2',
    letterNumber: '042/DINKES-KAB.PROB/GIZI/XI/2026',
    type: 'Surat Masuk',
    date: '2026-11-04',
    subject: 'Jadwal Uji Petik Higiene Sanitasi & Organoleptik Puskesmas Krejengan',
    senderOrReceiver: 'Dinas Kesehatan Kabupaten Probolinggo',
    category: 'Dinas/BGN',
    status: 'Diproses',
  },
  {
    id: 'let-3',
    letterNumber: '018/SPPG-TMG2/MBG/XI/2026',
    type: 'Surat Keluar',
    date: '2026-11-02',
    subject: 'Laporan Pertanggungjawaban Realisasi Distribusi Porsi Bulan Oktober 2026',
    senderOrReceiver: 'Direktorat Distribusi Pangan BGN Pusat Jakarta',
    category: 'Dinas/BGN',
    status: 'Terkirim',
  },
  {
    id: 'let-4',
    letterNumber: '019/SPPG-TMG2/MBG/SPK/XI/2026',
    type: 'Surat Perintah Kerja (SPK)',
    date: '2026-11-05',
    subject: 'SPK Pasokan Bahan Daging Unggas Segar Periode November 2026',
    senderOrReceiver: 'Direktur PT Unggas Barokah Probolinggo',
    category: 'Supplier/Vendor',
    status: 'Terkirim',
  },
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: '2026-11-08 04:15:20',
    userId: 'u1',
    userName: 'Gusti Agung (Admin Utama)',
    userRole: 'Admin Utama',
    action: 'LOGIN',
    module: 'auth',
    details: 'Berhasil login ke sistem E-SPPG TMG2',
  },
  {
    id: 'aud-2',
    timestamp: '2026-11-08 05:22:10',
    userId: 'u3',
    userName: 'Siti Aminah, S.Gz.',
    userRole: 'Pengawas Gizi',
    action: 'APPROVE',
    module: 'menu',
    details: 'Memverifikasi nilai AKG menu harian MBG-TMG2-H08',
  },
  {
    id: 'aud-3',
    timestamp: '2026-11-08 05:40:05',
    userId: 'u2',
    userName: 'Dr. H. Ahmad Zaini, S.Pd.',
    userRole: 'Kepala SPPG',
    action: 'APPROVE',
    module: 'procurement',
    details: 'Menyetujui Purchase Order PO/SPPG-TMG2/2026/XI/0088 ayam broiler 280 kg',
  },
  {
    id: 'aud-4',
    timestamp: '2026-11-08 08:32:00',
    userId: 'u5',
    userName: 'Rahmat Hidayat (Aslap)',
    userRole: 'Asisten Lapangan',
    action: 'UPDATE',
    module: 'distribution',
    details: 'Mencatat keberangkatan Armada 1 menuju SDN Temenggungan 1 suhu 68.5°C',
  },
];

const initialKitchenProgress: KitchenProgress = {
  preparation: 100,
  cooking: 100,
  portioning: 85,
  distribution: 70,
  washing: 45,
  tasteCheckDone: true,
  temperatureLogged: true,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('esppg_current_user');
    return saved ? JSON.parse(saved) : initialUsers[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const localSess = localStorage.getItem('esppg_auth_session');
      const tabSess = sessionStorage.getItem('esppg_auth_session');
      const raw = localSess || tabSess;
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.authenticated);
    } catch {
      return false;
    }
  });
  const [authReady, setAuthReady] = useState<boolean>(false);
  const explicitLogoutRef = React.useRef<boolean>(false);

  const [webAccessUsers, setWebAccessUsers] = useState<WebAccessUser[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_web_access_users_v1');
      if (!saved) return buildDefaultWebAccessUsers();
      return mergeProtectedAdmins(JSON.parse(saved));
    } catch {
      return buildDefaultWebAccessUsers();
    }
  });

  const [webAccessPolicy, setWebAccessPolicy] = useState<WebAccessPolicy>(() => {
    try {
      const saved = localStorage.getItem('esppg_web_access_policy_v1');
      if (!saved) return DEFAULT_WEB_ACCESS_POLICY;
      return { ...DEFAULT_WEB_ACCESS_POLICY, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_WEB_ACCESS_POLICY;
    }
  });

  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => {
    const saved = localStorage.getItem('esppg_role_permissions');
    return saved ? JSON.parse(saved) : defaultPermissions;
  });

  const [sppgConfig, setSppgConfig] = useState<SPPGConfig>(() => {
    const saved = localStorage.getItem('esppg_config');
    return saved ? JSON.parse(saved) : defaultSPPGConfig;
  });

  // Master Data & Beneficiaries States
  const [institutions, setInstitutions] = useState<Institution[]>(() => {
    const saved = localStorage.getItem('esppg_institutions_v2');
    return saved ? JSON.parse(saved) : initialInstitutionsData;
  });

  const [masterBahan, setMasterBahan] = useState<MasterBahan[]>(() => {
    const saved = localStorage.getItem('esppg_master_bahan');
    return saved ? JSON.parse(saved) : initialMasterBahanData;
  });

  const [masterSuppliers, setMasterSuppliers] = useState<MasterSupplier[]>(() => {
    const saved = localStorage.getItem('esppg_master_suppliers');
    return saved ? JSON.parse(saved) : initialMasterSuppliersData;
  });

  const [masterVolunteers, setMasterVolunteers] = useState<MasterVolunteer[]>(() => {
    const saved = localStorage.getItem('esppg_master_volunteers');
    return saved ? JSON.parse(saved) : initialMasterVolunteersData;
  });

  const [masterUnits, setMasterUnits] = useState<MasterUnit[]>(() => {
    const saved = localStorage.getItem('esppg_master_units');
    return saved ? JSON.parse(saved) : initialMasterUnitsData;
  });

  const [materialConversions, setMaterialConversions] = useState<MaterialDimensionConversion[]>(() => {
    const saved = localStorage.getItem('esppg_material_conversions');
    return saved ? JSON.parse(saved) : initialMaterialConversionsData;
  });

  // 7. Beneficiary Attendance & Quota History
  const [beneficiaryAttendance, setBeneficiaryAttendance] = useState<BeneficiaryAttendanceLog[]>(() => {
    const saved = localStorage.getItem('esppg_beneficiary_attendance');
    return saved ? JSON.parse(saved) : initialBeneficiaryAttendanceData;
  });

  const [beneficiaryQuotaHistory, setBeneficiaryQuotaHistory] = useState<BeneficiaryQuotaHistory[]>(() => {
    const saved = localStorage.getItem('esppg_quota_history');
    return saved ? JSON.parse(saved) : initialQuotaHistoryData;
  });

  // Existing Operational States
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('esppg_menu_items');
    return saved ? JSON.parse(saved) : initialMenuItems;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('esppg_inventory');
    return saved ? JSON.parse(saved) : initialInventory;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('esppg_purchase_orders');
    return saved ? JSON.parse(saved) : initialPurchaseOrders;
  });

  const [rabItems, setRabItems] = useState<RABItem[]>(() => {
    const saved = localStorage.getItem('esppg_rab_items');
    return saved ? JSON.parse(saved) : defaultRABItems;
  });

  const [qualityControlRecords, setQualityControlRecords] = useState<QualityControlRecord[]>(() => {
    const saved = localStorage.getItem('esppg_qc_records');
    return saved ? JSON.parse(saved) : defaultQualityControlRecords;
  });

  const [distributionLogs, setDistributionLogs] = useState<DistributionLog[]>(() => {
    const saved = localStorage.getItem('esppg_distribution_logs');
    return saved ? JSON.parse(saved) : initialDistributions;
  });

  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() => {
    const saved = localStorage.getItem('esppg_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [volunteerAttendance, setVolunteerAttendance] = useState<VolunteerAttendance[]>(() => {
    const saved = localStorage.getItem('esppg_volunteers');
    return saved ? JSON.parse(saved) : initialVolunteers;
  });

  const [officialLetters, setOfficialLetters] = useState<OfficialLetter[]>(() => {
    const saved = localStorage.getItem('esppg_letters');
    return saved ? JSON.parse(saved) : initialLetters;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('esppg_audit_logs');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  // 5 Divisi Dapur & Operasional
  const [prepRecords, setPrepRecords] = useState<PreparationInspectionRecord[]>(() => {
    const saved = localStorage.getItem('esppg_prep_records');
    return saved ? JSON.parse(saved) : defaultPrepRecords;
  });

  const [cookingRecords, setCookingRecords] = useState<CookingInspectionRecord[]>(() => {
    const saved = localStorage.getItem('esppg_cooking_records');
    return saved ? JSON.parse(saved) : defaultCookingRecords;
  });

  const [portioningRecords, setPortioningRecords] = useState<PortioningInspectionRecord[]>(() => {
    const saved = localStorage.getItem('esppg_portioning_records');
    return saved ? JSON.parse(saved) : defaultPortioningRecords;
  });

  const [distributionDeliveries, setDistributionDeliveries] = useState<DistributionDeliveryRecord[]>(() => {
    const saved = localStorage.getItem('esppg_distribution_deliveries');
    return saved ? JSON.parse(saved) : defaultDistributionDeliveries;
  });

  const [omprengReturns, setOmprengReturns] = useState<OmprengReturnRecord[]>(() => {
    const saved = localStorage.getItem('esppg_ompreng_returns');
    return saved ? JSON.parse(saved) : defaultOmprengReturns;
  });

  const [fuelLogs, setFuelLogs] = useState<FuelLogRecord[]>(() => {
    const saved = localStorage.getItem('esppg_fuel_logs');
    return saved ? JSON.parse(saved) : defaultFuelLogs;
  });

  const [washingWasteRecords, setWashingWasteRecords] = useState<WashingWasteRecord[]>(() => {
    const saved = localStorage.getItem('esppg_washing_waste_records');
    return saved ? JSON.parse(saved) : defaultWashingWasteRecords;
  });

  // 14. Modul Administrasi Surat & 15. Modul Surat Masuk
  const [outgoingDocuments, setOutgoingDocuments] = useState<OutgoingDocument[]>(() => {
    const saved = localStorage.getItem('esppg_outgoing_docs');
    return saved ? JSON.parse(saved) : defaultOutgoingDocuments;
  });

  const [incomingLetters, setIncomingLetters] = useState<IncomingLetter[]>(() => {
    const saved = localStorage.getItem('esppg_incoming_letters');
    return saved ? JSON.parse(saved) : defaultIncomingLetters;
  });

  const [volunteerAbsences, setVolunteerAbsences] = useState<VolunteerAbsenceRecord[]>(() => {
    const saved = localStorage.getItem('esppg_volunteer_absences');
    return saved ? JSON.parse(saved) : defaultVolunteerAbsences;
  });

  const [dynamicFormSchemas, setDynamicFormSchemas] = useState<Record<DynamicFormId, DynamicFormSchema>>(() => {
    try {
      const saved = localStorage.getItem('esppg_dynamic_form_schemas_v1');
      return saved ? mergeDynamicFormSchemas(JSON.parse(saved)) : defaultDynamicFormSchemas;
    } catch {
      return defaultDynamicFormSchemas;
    }
  });

  const [kitchenProgress, setKitchenProgress] = useState<KitchenProgress>(initialKitchenProgress);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('esppg_dark_mode') === 'true';
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('esppg_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('esppg_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    localStorage.setItem('esppg_config', JSON.stringify(sppgConfig));
  }, [sppgConfig]);

  useEffect(() => {
    localStorage.setItem('esppg_institutions_v2', JSON.stringify(institutions));
  }, [institutions]);

  useEffect(() => {
    localStorage.setItem('esppg_master_bahan', JSON.stringify(masterBahan));
  }, [masterBahan]);

  useEffect(() => {
    localStorage.setItem('esppg_master_suppliers', JSON.stringify(masterSuppliers));
  }, [masterSuppliers]);

  useEffect(() => {
    localStorage.setItem('esppg_master_volunteers', JSON.stringify(masterVolunteers));
  }, [masterVolunteers]);

  useEffect(() => {
    localStorage.setItem('esppg_master_units', JSON.stringify(masterUnits));
  }, [masterUnits]);

  useEffect(() => {
    localStorage.setItem('esppg_material_conversions', JSON.stringify(materialConversions));
  }, [materialConversions]);

  useEffect(() => {
    localStorage.setItem('esppg_beneficiary_attendance', JSON.stringify(beneficiaryAttendance));
  }, [beneficiaryAttendance]);

  useEffect(() => {
    localStorage.setItem('esppg_quota_history', JSON.stringify(beneficiaryQuotaHistory));
  }, [beneficiaryQuotaHistory]);

  useEffect(() => {
    localStorage.setItem('esppg_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('esppg_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('esppg_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('esppg_distribution_logs', JSON.stringify(distributionLogs));
  }, [distributionLogs]);

  useEffect(() => {
    localStorage.setItem('esppg_transactions', JSON.stringify(financialTransactions));
  }, [financialTransactions]);

  useEffect(() => {
    localStorage.setItem('esppg_volunteers', JSON.stringify(volunteerAttendance));
  }, [volunteerAttendance]);

  useEffect(() => {
    localStorage.setItem('esppg_letters', JSON.stringify(officialLetters));
  }, [officialLetters]);

  useEffect(() => {
    localStorage.setItem('esppg_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('esppg_rab_items', JSON.stringify(rabItems));
  }, [rabItems]);

  useEffect(() => {
    localStorage.setItem('esppg_qc_records', JSON.stringify(qualityControlRecords));
  }, [qualityControlRecords]);

  useEffect(() => {
    localStorage.setItem('esppg_prep_records', JSON.stringify(prepRecords));
  }, [prepRecords]);

  useEffect(() => {
    localStorage.setItem('esppg_cooking_records', JSON.stringify(cookingRecords));
  }, [cookingRecords]);

  useEffect(() => {
    localStorage.setItem('esppg_portioning_records', JSON.stringify(portioningRecords));
  }, [portioningRecords]);

  useEffect(() => {
    localStorage.setItem('esppg_distribution_deliveries', JSON.stringify(distributionDeliveries));
  }, [distributionDeliveries]);

  useEffect(() => {
    localStorage.setItem('esppg_ompreng_returns', JSON.stringify(omprengReturns));
  }, [omprengReturns]);

  useEffect(() => {
    localStorage.setItem('esppg_fuel_logs', JSON.stringify(fuelLogs));
  }, [fuelLogs]);

  useEffect(() => {
    localStorage.setItem('esppg_washing_waste_records', JSON.stringify(washingWasteRecords));
  }, [washingWasteRecords]);

  useEffect(() => {
    localStorage.setItem('esppg_outgoing_docs', JSON.stringify(outgoingDocuments));
  }, [outgoingDocuments]);

  useEffect(() => {
    localStorage.setItem('esppg_incoming_letters', JSON.stringify(incomingLetters));
  }, [incomingLetters]);

  useEffect(() => {
    localStorage.setItem('esppg_volunteer_absences', JSON.stringify(volunteerAbsences));
  }, [volunteerAbsences]);

  useEffect(() => {
    localStorage.setItem('esppg_web_access_users_v1', JSON.stringify(webAccessUsers));
  }, [webAccessUsers]);

  useEffect(() => {
    localStorage.setItem('esppg_web_access_policy_v1', JSON.stringify(webAccessPolicy));
  }, [webAccessPolicy]);

  useEffect(() => {
    localStorage.setItem('esppg_dynamic_form_schemas_v1', JSON.stringify(dynamicFormSchemas));
  }, [dynamicFormSchemas]);

  useEffect(() => {
    localStorage.setItem('esppg_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toast Helpers
  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Sync Firebase Auth active session on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, fbUser => {
      if (fbUser && !explicitLogoutRef.current) {
        const emailLower = (fbUser.email || '').trim().toLowerCase();
        const webEntry = webAccessUsers.find(u => u.email.toLowerCase() === emailLower);
        const matched = fbUser.email ? resolveUserByIdentifier(fbUser.email) : undefined;
        if (webEntry) {
          setCurrentUser({
            uid: fbUser.uid,
            name: webEntry.name || fbUser.displayName || webEntry.email,
            email: webEntry.email,
            role: webEntry.role,
            division: webEntry.division,
            supplierId: webEntry.supplierId,
            supplierName: webEntry.supplierName,
            isActive: webEntry.isActive,
          });
        } else if (matched) {
          setCurrentUser(prev =>
            prev.email === matched.email ? prev : { ...matched, uid: fbUser.uid, name: fbUser.displayName || matched.name }
          );
        } else if (fbUser.email) {
          setCurrentUser(prev => {
            if (prev.email.toLowerCase() === fbUser.email!.toLowerCase()) return prev;
            return {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email!.split('@')[0],
              email: fbUser.email!,
              role: isProtectedSuperAdminEmail(fbUser.email) ? 'Admin Utama' : 'Kepala SPPG',
              isActive: true,
            };
          });
        }
        setIsAuthenticated(true);
        // Load persisted dynamic form schemas from Firestore if available
        getDoc(doc(db, 'app_settings', 'dynamic_form_schemas'))
          .then(snap => {
            if (snap.exists()) {
              const cloudData = snap.data()?.schemas;
              if (cloudData && typeof cloudData === 'object') {
                setDynamicFormSchemas(prev => mergeDynamicFormSchemas({ ...prev, ...cloudData }));
              }
            }
          })
          .catch(() => {
            // Keep localStorage schema fallback if offline
          });
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const loginWithProfile = (user: UserProfile, rememberMe: boolean = false) => {
    explicitLogoutRef.current = false;
    setCurrentUser(user);
    setIsAuthenticated(true);
    const payload = JSON.stringify({
      authenticated: true,
      uid: user.uid,
      email: user.email,
      rememberMe,
      loggedInAt: new Date().toISOString(),
    });
    if (rememberMe) {
      localStorage.setItem('esppg_auth_session', payload);
      sessionStorage.removeItem('esppg_auth_session');
    } else {
      sessionStorage.setItem('esppg_auth_session', payload);
      localStorage.removeItem('esppg_auth_session');
    }
    const loginAudit: AuditLog = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: user.uid,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      module: 'auth',
      details: `Berhasil masuk ke sistem E-SPPG TMG2 sebagai ${user.name} (${user.role})`,
    };
    setAuditLogs(prev => [loginAudit, ...prev]);
  };

  const logout = async () => {
    explicitLogoutRef.current = true;
    await logAudit('LOGOUT', 'auth', `Keluar dari sesi E-SPPG TMG2 (${currentUser.name})`);
    localStorage.removeItem('esppg_auth_session');
    sessionStorage.removeItem('esppg_auth_session');
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Non-blocking fallback
    }
    setIsAuthenticated(false);
    addToast('info', 'Keluar Sistem', 'Anda telah keluar dari sistem E-SPPG TMG2.');
  };

  // Role Switcher helper
  const switchRole = (role: RoleType) => {
    const matchedUser = initialUsers.find(u => u.role === role) || {
      uid: 'user-' + Date.now(),
      name: `Pengguna (${role})`,
      email: `${role.toLowerCase().replace(/[^a-z0-9]/g, '')}@sppg-tmg2.id`,
      role,
      isActive: true,
    };
    setCurrentUser(matchedUser);
    logAudit('LOGIN', 'auth', `Berganti peran aktif ke ${role}`);
    addToast('info', 'Peran Diperbarui', `Sekarang Anda bertindak sebagai: ${role}`);
  };

  // Manual Web Login Access Management (Admin Utama Only)
  const syncWebAccessToFirestoreSafely = async (userRecord: WebAccessUser) => {
    if (!auth.currentUser) return;
    try {
      const safeDocId = `wau_${userRecord.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      await setDoc(
        doc(db, 'users', safeDocId),
        {
          id: safeDocId,
          sppgId: 'GFBQSYXD',
          uid: safeDocId,
          name: userRecord.name,
          email: userRecord.email,
          roleId: userRecord.role === 'Admin Utama' ? 'role-admin' : 'role-staff',
          roleName: userRecord.role,
          division: userRecord.division || '',
          isActive: userRecord.isActive,
          allowGoogleLogin: userRecord.allowGoogleLogin,
          status: userRecord.isActive ? 'Aktif' : 'Nonaktif',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
        },
        { merge: true }
      );
    } catch {
      // Non-blocking fallback when offline or guest Firebase session
    }
  };

  const findWebAccessUser = (identifier: string): WebAccessUser | undefined => {
    const normalized = identifier.trim().toLowerCase();
    if (!normalized) return undefined;
    return webAccessUsers.find(
      u =>
        u.email.toLowerCase() === normalized ||
        u.email.split('@')[0].toLowerCase() === normalized
    );
  };

  const recordWebLoginTimestamp = (email: string) => {
    const normalized = email.trim().toLowerCase();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setWebAccessUsers(prev =>
      prev.map(u =>
        u.email.toLowerCase() === normalized ? { ...u, lastLoginAt: now } : u
      )
    );
  };

  const addWebAccessUser = async (payload: {
    name: string;
    email: string;
    password: string;
    role: RoleType;
    division?: string;
    supplierId?: string;
    supplierName?: string;
    isActive: boolean;
    allowGoogleLogin: boolean;
    notes?: string;
  }): Promise<boolean> => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mendaftarkan akses login.');
      return false;
    }
    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast('error', 'Email Tidak Valid', 'Masukkan alamat email yang valid.');
      return false;
    }
    if (!payload.password || payload.password.length < 4) {
      addToast('error', 'Kata Sandi Terlalu Pendek', 'Kata sandi minimal 4 karakter.');
      return false;
    }
    const exists = webAccessUsers.some(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      addToast('error', 'Email Sudah Terdaftar', `Akun ${cleanEmail} sudah ada di daftar akses login.`);
      return false;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newUser: WebAccessUser = {
      id: `wau-${Date.now()}`,
      name: payload.name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: payload.role,
      division: payload.division,
      supplierId: payload.supplierId,
      supplierName: payload.supplierName,
      passwordHash: hashLoginPassword(cleanEmail, payload.password),
      isActive: payload.isActive,
      allowGoogleLogin: payload.allowGoogleLogin,
      isProtectedAdmin: isProtectedSuperAdminEmail(cleanEmail),
      createdAt: now,
      createdBy: currentUser.name,
      updatedAt: now,
      updatedBy: currentUser.name,
      notes: payload.notes?.trim() || undefined,
    };

    setWebAccessUsers(prev => [newUser, ...prev]);
    await syncWebAccessToFirestoreSafely(newUser);
    await logAudit(
      'CREATE',
      'settings',
      `Mendaftarkan akses login web manual untuk ${newUser.email} (${newUser.role}) — Status: ${newUser.isActive ? 'Diizinkan' : 'Dinonaktifkan'}`
    );
    addToast('success', 'Akses Login Ditambahkan', `Akun ${newUser.email} berhasil didaftarkan.`);
    return true;
  };

  const updateWebAccessUser = async (
    id: string,
    updates: Partial<Omit<WebAccessUser, 'id' | 'passwordHash'>> & { newPassword?: string }
  ): Promise<boolean> => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengubah akses login.');
      return false;
    }
    const target = webAccessUsers.find(u => u.id === id);
    if (!target) return false;

    const isProtected = Boolean(target.isProtectedAdmin || isProtectedSuperAdminEmail(target.email));
    const nextEmail = (updates.email ?? target.email).trim().toLowerCase();

    if (nextEmail !== target.email.toLowerCase()) {
      const dup = webAccessUsers.some(u => u.id !== id && u.email.toLowerCase() === nextEmail);
      if (dup) {
        addToast('error', 'Email Duplikat', `Email ${nextEmail} sudah dipakai oleh akun lain.`);
        return false;
      }
    }

    if (isProtected && updates.isActive === false) {
      addToast('warning', 'Akun Terlindungi', 'Akun Admin Utama inti tidak dapat dinonaktifkan.');
      return false;
    }
    if (isProtected && updates.role && updates.role !== 'Admin Utama') {
      addToast('warning', 'Akun Terlindungi', 'Peran Admin Utama inti tidak dapat diturunkan.');
      return false;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedUser: WebAccessUser = {
      ...target,
      ...updates,
      email: isProtected ? target.email : nextEmail,
      role: isProtected ? 'Admin Utama' : (updates.role ?? target.role),
      isActive: isProtected ? true : (updates.isActive ?? target.isActive),
      passwordHash:
        updates.newPassword && updates.newPassword.trim().length > 0
          ? hashLoginPassword(isProtected ? target.email : nextEmail, updates.newPassword)
          : target.passwordHash,
      updatedAt: now,
      updatedBy: currentUser.name,
    };

    setWebAccessUsers(prev => prev.map(u => (u.id === id ? updatedUser : u)));
    await syncWebAccessToFirestoreSafely(updatedUser);
    await logAudit(
      'UPDATE',
      'settings',
      `Memperbarui akses login web ${updatedUser.email} (${updatedUser.role}${updates.newPassword ? ', reset sandi' : ''})`
    );
    addToast('success', 'Akses Login Diperbarui', `Pengaturan akun ${updatedUser.email} disimpan.`);
    return true;
  };

  const toggleWebAccessStatus = async (id: string) => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengaktifkan/menonaktifkan akses login.');
      return;
    }
    const target = webAccessUsers.find(u => u.id === id);
    if (!target) return;
    if (target.isProtectedAdmin || isProtectedSuperAdminEmail(target.email)) {
      addToast('warning', 'Akun Terlindungi', 'Akun Admin Utama inti harus tetap aktif agar sistem tetap dapat dikelola.');
      return;
    }
    const nextActive = !target.isActive;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedUser = { ...target, isActive: nextActive, updatedAt: now, updatedBy: currentUser.name };
    setWebAccessUsers(prev => prev.map(u => (u.id === id ? updatedUser : u)));
    await syncWebAccessToFirestoreSafely(updatedUser);
    await logAudit(
      'UPDATE',
      'settings',
      `${nextActive ? 'Mengaktifkan' : 'Menonaktifkan'} izin login web untuk ${target.email}`
    );
    addToast(
      nextActive ? 'success' : 'warning',
      nextActive ? 'Akses Login Diaktifkan' : 'Akses Login Dinonaktifkan',
      `${target.email} sekarang ${nextActive ? 'diizinkan' : 'diblokir untuk'} masuk ke aplikasi.`
    );
  };

  const deleteWebAccessUser = async (id: string): Promise<boolean> => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat menghapus akun akses login.');
      return false;
    }
    const target = webAccessUsers.find(u => u.id === id);
    if (!target) return false;
    if (target.isProtectedAdmin || isProtectedSuperAdminEmail(target.email)) {
      addToast('warning', 'Tidak Dapat Dihapus', 'Akun Admin Utama inti dilindungi oleh sistem.');
      return false;
    }
    setWebAccessUsers(prev => prev.filter(u => u.id !== id));
    await logAudit('DELETE', 'settings', `Menghapus akun akses login web: ${target.email}`);
    addToast('info', 'Akun Dihapus', `Akses login untuk ${target.email} telah dihapus.`);
    return true;
  };

  const updateWebAccessPolicy = async (policy: Partial<WebAccessPolicy>) => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengubah kebijakan login.');
      return;
    }
    const nextPolicy = { ...webAccessPolicy, ...policy };
    setWebAccessPolicy(nextPolicy);
    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'web_access_policy'),
          {
            id: 'web_access_policy',
            sppgId: 'GFBQSYXD',
            ...nextPolicy,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          },
          { merge: true }
        );
      } catch {
        // Non-blocking
      }
    }
    await logAudit('UPDATE', 'settings', `Memperbarui kebijakan akses login web`);
    addToast('success', 'Kebijakan Login Tersimpan', 'Pengaturan kontrol akses login berhasil diperbarui.');
  };

  // Dynamic Form Builder Actions (Admin Utama / Kepala SPPG)
  const isAdminUser = isDynamicFormAdmin(currentUser.role);

  const saveDynamicFormSchema = async (formId: DynamicFormId, schema: DynamicFormSchema) => {
    if (!isDynamicFormAdmin(currentUser.role)) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama / Kepala SPPG yang dapat mengubah struktur form.');
      return;
    }
    const updatedSchema: DynamicFormSchema = {
      ...schema,
      formId,
      version: (schema.version || 1) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name,
    };
    const nextMap: Record<DynamicFormId, DynamicFormSchema> = {
      ...dynamicFormSchemas,
      [formId]: updatedSchema,
    };
    setDynamicFormSchemas(nextMap);
    localStorage.setItem('esppg_dynamic_form_schemas_v1', JSON.stringify(nextMap));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'dynamic_form_schemas'),
          {
            id: 'dynamic_form_schemas',
            sppgId: 'GFBQSYXD',
            schemas: nextMap,
            updatedAt: updatedSchema.updatedAt,
            updatedBy: currentUser.name,
          },
          { merge: true }
        );
      } catch {
        // Non-blocking fallback to LocalStorage
      }
    }
    await logAudit('UPDATE', schema.moduleKey || 'system', `Menyimpan struktur form dinamis: ${schema.title} (${schema.fields.length} field)`);
    addToast('success', 'Struktur Form Disimpan', `Perubahan pada "${schema.title}" telah tersimpan permanen.`);
  };

  const resetDynamicFormSchema = async (formId: DynamicFormId) => {
    if (!isDynamicFormAdmin(currentUser.role)) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama / Kepala SPPG yang dapat mereset struktur form.');
      return;
    }
    const defaultSchema: DynamicFormSchema = {
      ...defaultDynamicFormSchemas[formId],
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name,
    };
    const nextMap: Record<DynamicFormId, DynamicFormSchema> = {
      ...dynamicFormSchemas,
      [formId]: defaultSchema,
    };
    setDynamicFormSchemas(nextMap);
    localStorage.setItem('esppg_dynamic_form_schemas_v1', JSON.stringify(nextMap));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'dynamic_form_schemas'),
          {
            id: 'dynamic_form_schemas',
            sppgId: 'GFBQSYXD',
            schemas: nextMap,
            updatedAt: defaultSchema.updatedAt,
            updatedBy: currentUser.name,
          },
          { merge: true }
        );
      } catch {
        // Non-blocking fallback
      }
    }
    await logAudit('UPDATE', defaultSchema.moduleKey || 'system', `Mereset struktur form "${defaultSchema.title}" ke pengaturan default`);
    addToast('info', 'Struktur Form Direset', `"${defaultSchema.title}" dikembalikan ke pengaturan default.`);
  };

  // Permission Check
  const hasPermission = (module: ModuleKey, action: ActionPermission): boolean => {
    // Supplier role strict data isolation
    if (currentUser.role === 'Supplier / Mitra Pangan') {
      if (module === 'supplier_portal') return true;
      if (module === 'settings' && action === 'view') return true;
      return false; // Strictly blocked from internal finance, beneficiaries, kitchen, inventory, other supplier POs, etc.
    }
    if (currentUser.role === 'Admin Utama') return true;
    const roleMap = rolePermissions[currentUser.role];
    if (!roleMap) return false;
    return roleMap[action] ?? false;
  };

  // Audit Logger
  const logAudit = async (action: AuditLog['action'], module: AuditLog['module'], details: string) => {
    const newLog: AuditLog = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: currentUser.uid,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);

    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'audit_logs', newLog.id), newLog);
      }
    } catch {
      // Non-blocking
    }
  };

  // SPPG Settings Update
  const updateSPPGConfig = async (configUpdate: Partial<SPPGConfig>) => {
    setSppgConfig(prev => ({ ...prev, ...configUpdate }));
    await logAudit('UPDATE', 'settings', 'Memperbarui profil & konfigurasi umum SPPG TMG2');
    addToast('success', 'Pengaturan Tersimpan', 'Identitas organisasi SPPG berhasil diperbarui.');
  };

  const updateRolePermissions = (newPermissions: RolePermissions) => {
    setRolePermissions(newPermissions);
    logAudit('UPDATE', 'settings', 'Menyesuaikan matriks hak akses peran pengguna');
    addToast('success', 'Hak Akses Disimpan', 'Matriks otorisasi peran berhasil dimutakhirkan.');
  };

  // Institutions CRUD & Quota History
  const addInstitution = async (inst: Omit<Institution, 'id'>) => {
    const total = Number(inst.smallPortions) + Number(inst.largePortions);
    const newInst: Institution = { ...inst, id: 'inst-' + Date.now(), totalPortions: total };
    setInstitutions(prev => [...prev, newInst]);
    await logAudit('CREATE', 'institutions', `Menambah data lembaga penerima manfaat: ${inst.name}`);
    addToast('success', 'Lembaga Ditambahkan', `${inst.name} berhasil didaftarkan ke sistem.`);
  };

  const updateInstitution = async (id: string, inst: Partial<Institution>) => {
    setInstitutions(prev =>
      prev.map(item => {
        if (item.id === id) {
          const small = inst.smallPortions !== undefined ? Number(inst.smallPortions) : item.smallPortions;
          const large = inst.largePortions !== undefined ? Number(inst.largePortions) : item.largePortions;
          return {
            ...item,
            ...inst,
            smallPortions: small,
            largePortions: large,
            totalPortions: small + large,
          };
        }
        return item;
      })
    );
    await logAudit('UPDATE', 'institutions', `Memperbarui data lembaga ID: ${id}`);
    addToast('success', 'Data Diperbarui', 'Data lembaga penerima berhasil diperbarui.');
  };

  const updateInstitutionQuotaWithHistory = async (
    id: string,
    newSmall: number,
    newLarge: number,
    reason: string
  ) => {
    const target = institutions.find(i => i.id === id);
    if (!target) return;

    const previousSmall = target.smallPortions;
    const previousLarge = target.largePortions;
    const previousTotal = target.totalPortions;
    const newTotal = Number(newSmall) + Number(newLarge);
    const deltaTotal = newTotal - previousTotal;

    // 1. Update institution
    setInstitutions(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              smallPortions: newSmall,
              largePortions: newLarge,
              totalPortions: newTotal,
            }
          : item
      )
    );

    // 2. Append to Quota History
    const historyEntry: BeneficiaryQuotaHistory = {
      id: 'qh-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      institutionId: target.id,
      institutionName: target.name,
      previousSmall,
      previousLarge,
      previousTotal,
      newSmall,
      newLarge,
      newTotal,
      deltaTotal,
      reason,
      updatedBy: currentUser.name,
    };

    setBeneficiaryQuotaHistory(prev => [historyEntry, ...prev]);

    await logAudit(
      'UPDATE',
      'institutions',
      `Perubahan kuota ${target.name}: ${previousTotal} -> ${newTotal} (${deltaTotal > 0 ? '+' : ''}${deltaTotal}). Alasan: ${reason}`
    );
    addToast(
      'success',
      'Kuota Diperbarui',
      `Kuota ${target.name} diubah menjadi ${newTotal} porsi. Riwayat tersimpan.`
    );
  };

  const deleteInstitution = async (id: string) => {
    const target = institutions.find(i => i.id === id);
    setInstitutions(prev => prev.filter(i => i.id !== id));
    await logAudit('DELETE', 'institutions', `Menghapus data lembaga: ${target?.name || id}`);
    addToast('warning', 'Lembaga Dihapus', 'Data lembaga telah dihapus dari sistem.');
  };

  // Master Bahan Pangan CRUD
  const addMasterBahan = async (item: Omit<MasterBahan, 'id'>) => {
    const newItem: MasterBahan = { ...item, id: 'mb-' + Date.now() };
    setMasterBahan(prev => [...prev, newItem]);
    await logAudit('CREATE', 'master_data', `Menambah master bahan pangan: ${item.name} (${item.code})`);
    addToast('success', 'Bahan Tersimpan', `${item.name} berhasil ditambahkan ke master bahan.`);
  };

  const updateMasterBahan = async (id: string, item: Partial<MasterBahan>) => {
    setMasterBahan(prev => prev.map(m => (m.id === id ? { ...m, ...item } : m)));
    await logAudit('UPDATE', 'master_data', `Memperbarui master bahan pangan ID: ${id}`);
    addToast('success', 'Bahan Dimutakhirkan', 'Data master bahan pangan berhasil diperbarui.');
  };

  const deleteMasterBahan = async (id: string) => {
    const target = masterBahan.find(m => m.id === id);
    setMasterBahan(prev => prev.filter(m => m.id !== id));
    await logAudit('DELETE', 'master_data', `Menghapus master bahan: ${target?.name || id}`);
    addToast('warning', 'Bahan Dihapus', 'Bahan telah dihapus dari master data.');
  };

  // Master Supplier CRUD
  const addMasterSupplier = async (sup: Omit<MasterSupplier, 'id'>) => {
    const newSup: MasterSupplier = { ...sup, id: 'sup-' + Date.now() };
    setMasterSuppliers(prev => [...prev, newSup]);
    await logAudit('CREATE', 'master_data', `Menambah master supplier: ${sup.name}`);
    addToast('success', 'Supplier Terdaftar', `${sup.name} berhasil disimpan di master supplier.`);
  };

  const updateMasterSupplier = async (id: string, sup: Partial<MasterSupplier>) => {
    setMasterSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...sup } : s)));
    await logAudit('UPDATE', 'master_data', `Memperbarui master supplier ID: ${id}`);
    addToast('success', 'Supplier Diperbarui', 'Data master supplier berhasil dimutakhirkan.');
  };

  const deleteMasterSupplier = async (id: string) => {
    const target = masterSuppliers.find(s => s.id === id);
    setMasterSuppliers(prev => prev.filter(s => s.id !== id));
    await logAudit('DELETE', 'master_data', `Menghapus master supplier: ${target?.name || id}`);
    addToast('warning', 'Supplier Dihapus', 'Data supplier telah dihapus.');
  };

  // Master Relawan CRUD
  const addMasterVolunteer = async (vol: Omit<MasterVolunteer, 'id'>) => {
    const newVol: MasterVolunteer = { ...vol, id: 'vol-' + Date.now() };
    setMasterVolunteers(prev => [...prev, newVol]);
    await logAudit('CREATE', 'master_data', `Menambah relawan: ${vol.name} (${vol.division})`);
    addToast('success', 'Relawan Terdaftar', `${vol.name} terdaftar di master SDM.`);
  };

  const updateMasterVolunteer = async (id: string, vol: Partial<MasterVolunteer>) => {
    setMasterVolunteers(prev => prev.map(v => (v.id === id ? { ...v, ...vol } : v)));
    await logAudit('UPDATE', 'master_data', `Memperbarui data relawan ID: ${id}`);
    addToast('success', 'Relawan Diperbarui', 'Data relawan berhasil dimutakhirkan.');
  };

  const deleteMasterVolunteer = async (id: string) => {
    const target = masterVolunteers.find(v => v.id === id);
    setMasterVolunteers(prev => prev.filter(v => v.id !== id));
    await logAudit('DELETE', 'master_data', `Menghapus relawan: ${target?.name || id}`);
    addToast('warning', 'Relawan Dihapus', 'Data relawan telah dihapus.');
  };

  // Master Satuan & Konversi
  const addMasterUnit = async (unit: Omit<MasterUnit, 'id'>) => {
    const newUnit: MasterUnit = { ...unit, id: 'u-' + Date.now() };
    setMasterUnits(prev => [...prev, newUnit]);
    await logAudit('CREATE', 'master_data', `Menambah master satuan: ${unit.name} (${unit.code})`);
    addToast('success', 'Satuan Ditambahkan', `Satuan ${unit.name} berhasil didaftarkan.`);
  };

  const updateMasterUnit = async (id: string, unit: Partial<MasterUnit>) => {
    setMasterUnits(prev => prev.map(u => (u.id === id ? { ...u, ...unit } : u)));
    await logAudit('UPDATE', 'master_data', `Memperbarui master satuan ID: ${id}`);
    addToast('success', 'Satuan Diperbarui', 'Konfigurasi satuan berhasil diubah.');
  };

  const deleteMasterUnit = async (id: string) => {
    setMasterUnits(prev => prev.filter(u => u.id !== id));
    await logAudit('DELETE', 'master_data', `Menghapus satuan ID: ${id}`);
    addToast('warning', 'Satuan Dihapus', 'Satuan telah dihapus.');
  };

  const addMaterialConversion = async (conv: MaterialDimensionConversion) => {
    setMaterialConversions(prev => [...prev, conv]);
    await logAudit('CREATE', 'master_data', `Menambah konversi dimensi bahan: ${conv.materialName} (${conv.gramsPerUnit}g)`);
    addToast('success', 'Konversi Disimpan', `Spesifikasi konversi ${conv.materialName} tersimpan.`);
  };

  const updateMaterialConversion = async (materialName: string, conv: Partial<MaterialDimensionConversion>) => {
    setMaterialConversions(prev =>
      prev.map(c => (c.materialName === materialName ? { ...c, ...conv } : c))
    );
    await logAudit('UPDATE', 'master_data', `Memperbarui konversi dimensi bahan: ${materialName}`);
    addToast('success', 'Konversi Diperbarui', `Dimensi ${materialName} berhasil diperbarui.`);
  };

  const deleteMaterialConversion = async (materialName: string) => {
    setMaterialConversions(prev => prev.filter(c => c.materialName !== materialName));
    await logAudit('DELETE', 'master_data', `Menghapus konversi dimensi: ${materialName}`);
    addToast('warning', 'Konversi Dihapus', 'Data konversi dimensi telah dihapus.');
  };

  // 7. Beneficiary Attendance Daily Logging with Strict Validations
  const recordBeneficiaryAttendance = (
    log: Omit<BeneficiaryAttendanceLog, 'id' | 'presentSmall' | 'presentLarge' | 'actualPortions' | 'totalRegistered' | 'totalAbsent'>
  ): { success: boolean; error?: string } => {
    // Validasi 1: jumlah tidak hadir tidak boleh melebihi jumlah terdaftar
    if (log.absentSmall > log.registeredSmall) {
      const err = `Jumlah tidak hadir porsi kecil (${log.absentSmall}) melebihi jumlah siswa terdaftar (${log.registeredSmall})!`;
      addToast('error', 'Validasi Gagal', err);
      return { success: false, error: err };
    }
    if (log.absentLarge > log.registeredLarge) {
      const err = `Jumlah tidak hadir porsi besar (${log.absentLarge}) melebihi jumlah siswa terdaftar (${log.registeredLarge})!`;
      addToast('error', 'Validasi Gagal', err);
      return { success: false, error: err };
    }

    // Rumus:
    // Jumlah hadir kecil = Jumlah terdaftar kecil - Jumlah tidak hadir kecil
    // Jumlah hadir besar = Jumlah terdaftar besar - Jumlah tidak hadir besar
    // Jumlah porsi aktual = Total jumlah hadir seluruh kategori
    const presentSmall = log.registeredSmall - log.absentSmall;
    const presentLarge = log.registeredLarge - log.absentLarge;
    const actualPortions = presentSmall + presentLarge;
    const totalRegistered = log.registeredSmall + log.registeredLarge;
    const totalAbsent = log.absentSmall + log.absentLarge;

    const newLog: BeneficiaryAttendanceLog = {
      ...log,
      id: 'att-' + Date.now(),
      totalRegistered,
      totalAbsent,
      presentSmall,
      presentLarge,
      actualPortions,
    };

    // Replace if exists for date & institution, or add new
    setBeneficiaryAttendance(prev => {
      const existsIdx = prev.findIndex(
        p => p.date === log.date && p.institutionId === log.institutionId
      );
      if (existsIdx >= 0) {
        const copy = [...prev];
        copy[existsIdx] = newLog;
        return copy;
      }
      return [newLog, ...prev];
    });

    logAudit(
      'CREATE',
      'institutions',
      `Presensi harian ${log.institutionName} (${log.date}): Hadir ${actualPortions}/${totalRegistered} porsi aktual.`
    );
    addToast(
      'success',
      'Presensi Siswa Disimpan',
      `${log.institutionName}: Porsi aktual ${actualPortions} (Tidak hadir: ${totalAbsent} siswa).`
    );
    return { success: true };
  };

  const updateBeneficiaryAttendance = async (
    id: string,
    logUpdate: Partial<BeneficiaryAttendanceLog>
  ) => {
    setBeneficiaryAttendance(prev =>
      prev.map(item => {
        if (item.id === id) {
          const regSmall = logUpdate.registeredSmall !== undefined ? logUpdate.registeredSmall : item.registeredSmall;
          const regLarge = logUpdate.registeredLarge !== undefined ? logUpdate.registeredLarge : item.registeredLarge;
          const absSmall = logUpdate.absentSmall !== undefined ? logUpdate.absentSmall : item.absentSmall;
          const absLarge = logUpdate.absentLarge !== undefined ? logUpdate.absentLarge : item.absentLarge;

          const presentSmall = regSmall - absSmall;
          const presentLarge = regLarge - absLarge;
          const actualPortions = presentSmall + presentLarge;

          return {
            ...item,
            ...logUpdate,
            registeredSmall: regSmall,
            registeredLarge: regLarge,
            absentSmall: absSmall,
            absentLarge: absLarge,
            totalRegistered: regSmall + regLarge,
            totalAbsent: absSmall + absLarge,
            presentSmall,
            presentLarge,
            actualPortions,
          };
        }
        return item;
      })
    );
    await logAudit('UPDATE', 'institutions', `Memperbarui log presensi penerima manfaat ID: ${id}`);
    addToast('success', 'Presensi Dimutakhirkan', 'Data kehadiran dan porsi aktual diperbarui.');
  };

  // Menu Items CRUD & Approval
  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = { ...item, id: 'menu-' + Date.now() };
    setMenuItems(prev => [...prev, newItem]);
    await logAudit('CREATE', 'menu', `Menyusun menu gizi baru tanggal: ${item.date} (${item.stapleFood})`);
    addToast('success', 'Menu Disimpan', `Menu siklus untuk tanggal ${item.date} berhasil ditambahkan.`);
  };

  const updateMenuItem = async (id: string, item: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(m => (m.id === id ? { ...m, ...item } : m)));
    await logAudit('UPDATE', 'menu', `Memperbarui rincian menu gizi ID: ${id}`);
    addToast('success', 'Menu Diperbarui', 'Komposisi gizi menu berhasil diperbarui.');
  };

  const deleteMenuItem = async (id: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== id));
    await logAudit('DELETE', 'menu', `Menghapus menu ID: ${id}`);
    addToast('warning', 'Menu Dihapus', 'Rencana menu telah dihapus.');
  };

  const approveMenuItem = async (id: string, approvedBy: string) => {
    setMenuItems(prev =>
      prev.map(m =>
        m.id === id
          ? {
              ...m,
              status: currentUser.role === 'Kepala SPPG' ? 'Disetujui Kepala' : 'Diverifikasi Gizi',
              approvedBy,
            }
          : m
      )
    );
    await logAudit('APPROVE', 'menu', `Menyetujui menu ID: ${id} oleh ${approvedBy}`);
    addToast('success', 'Menu Disetujui', 'Status persetujuan menu gizi berhasil diproses.');
  };

  // Inventory CRUD & Adjustments
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = { ...item, id: 'inv-' + Date.now() };
    setInventory(prev => [...prev, newItem]);
    await logAudit('CREATE', 'inventory', `Menambah stok bahan pangan baru: ${item.name}`);
    addToast('success', 'Bahan Terdaftar', `${item.name} berhasil ditambahkan ke inventaris gudang.`);
  };

  const updateInventoryItem = async (id: string, item: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => (i.id === id ? { ...i, ...item } : i)));
    await logAudit('UPDATE', 'inventory', `Memperbarui data stok bahan ID: ${id}`);
    addToast('success', 'Inventaris Diperbarui', 'Data stok bahan telah diperbarui.');
  };

  const deleteInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    await logAudit('DELETE', 'inventory', `Menghapus bahan gudang ID: ${id}`);
    addToast('warning', 'Bahan Dihapus', 'Item telah dihapus dari inventaris.');
  };

  const adjustStock = async (id: string, delta: number, reason: string) => {
    setInventory(prev =>
      prev.map(i => {
        if (i.id === id) {
          const newStock = Math.max(0, i.currentStock + delta);
          return {
            ...i,
            currentStock: newStock,
            qualityStatus: newStock <= i.minimumStock ? 'Perlu Pemantauan' : 'Baik',
          };
        }
        return i;
      })
    );
    await logAudit('UPDATE', 'inventory', `Penyesuaian stok (${delta > 0 ? '+' : ''}${delta}) ID: ${id}. Alasan: ${reason}`);
    addToast('info', 'Stok Disesuaikan', `Stok berhasil dimutakhirkan (${delta > 0 ? '+' : ''}${delta}).`);
  };

  // Purchase Orders Workflow
  const addPurchaseOrder = async (po: Omit<PurchaseOrder, 'id'>) => {
    const newPO: PurchaseOrder = { ...po, id: 'po-' + Date.now() };
    setPurchaseOrders(prev => [newPO, ...prev]);

    // Relational sync: update matching RAB items if rabId is provided
    if (po.rabId) {
      const totalQty = po.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setRabItems(prev =>
        prev.map(r => {
          if (r.id === po.rabId) {
            return {
              ...r,
              poCreatedQuantity: (r.poCreatedQuantity || 0) + totalQty,
              poCreatedAmount: (r.poCreatedAmount || 0) + po.totalAmount,
            };
          }
          return r;
        })
      );
    }

    await logAudit('CREATE', 'procurement', `Membuat Purchase Order baru: ${po.poNumber} (${po.supplierName})`);
    addToast('success', 'PO Berhasil Dibuat', `Purchase Order ${po.poNumber} berhasil diajukan.`);
  };

  const updatePurchaseOrder = async (id: string, po: Partial<PurchaseOrder>) => {
    setPurchaseOrders(prev => prev.map(p => (p.id === id ? { ...p, ...po } : p)));
    await logAudit('UPDATE', 'procurement', `Memperbarui Purchase Order ID: ${id}`);
    addToast('success', 'PO Diperbarui', 'Data Purchase Order berhasil diperbarui.');
  };

  const verifyPurchaseOrderFinance = async (id: string, verifierName: string) => {
    setPurchaseOrders(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              verifiedByFinance: verifierName,
              status: 'Disetujui Kepala',
            }
          : p
      )
    );
    await logAudit('APPROVE', 'procurement', `Verifikasi anggaran keuangan PO ID: ${id} oleh ${verifierName}`);
    addToast('success', 'PO Terverifikasi', 'Purchase Order diverifikasi oleh Pengawas Keuangan.');
  };

  const approvePurchaseOrderHead = async (id: string, approverName: string) => {
    setPurchaseOrders(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              approvedBy: approverName,
              status: 'Disetujui Kepala',
            }
          : p
      )
    );
    await logAudit('APPROVE', 'procurement', `Persetujuan PO ID: ${id} oleh Kepala SPPG: ${approverName}`);
    addToast('success', 'PO Disetujui', 'Purchase Order resmi disetujui Kepala SPPG.');
  };

  const updatePOQualityControl = async (id: string, qcStatus: PurchaseOrder['qcStatus'], notes: string) => {
    setPurchaseOrders(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              qcStatus,
              qcNotes: notes,
            }
          : p
      )
    );
    await logAudit('UPDATE', 'procurement', `Pemeriksaan QC PO ID: ${id} hasil: ${qcStatus}`);
    addToast('info', 'QC Dicatat', `Hasil uji mutu penerimaan: ${qcStatus}`);
  };

  const receivePOToWarehouse = async (id: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;

    setPurchaseOrders(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'Diterima di Gudang' } : p))
    );

    po.items.forEach(item => {
      adjustStock(item.itemId, item.quantity, `Penerimaan PO ${po.poNumber}`);
    });

    await logAudit('UPDATE', 'inventory', `Penerimaan fisik barang PO ${po.poNumber} masuk ke stok gudang`);
    addToast('success', 'Bahan Diterima di Gudang', `Stok barang otomatis ditambahkan ke inventaris.`);
  };

  // Modul PLOK: RAB Handlers
  const addRABItem = async (item: Omit<RABItem, 'id' | 'totalBudget'>) => {
    const totalBudget = item.volume * item.unitPrice;
    const newRAB: RABItem = {
      ...item,
      id: 'rab-' + Date.now(),
      totalBudget,
      poCreatedQuantity: 0,
      poCreatedAmount: 0,
    };
    setRabItems(prev => [newRAB, ...prev]);
    await logAudit('CREATE', 'procurement', `Membuat anggaran baru ${newRAB.budgetCode}: ${newRAB.itemName} senilai Rp ${totalBudget.toLocaleString('id-ID')}`);
    addToast('success', 'RAB Ditambahkan', `Anggaran ${newRAB.budgetCode} berhasil diajukan.`);
  };

  const updateRABItem = async (id: string, item: Partial<RABItem>) => {
    setRabItems(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updated = { ...r, ...item };
          if (item.volume !== undefined || item.unitPrice !== undefined) {
            updated.totalBudget = (updated.volume || 0) * (updated.unitPrice || 0);
          }
          return updated;
        }
        return r;
      })
    );
    await logAudit('UPDATE', 'procurement', `Memperbarui anggaran RAB ID: ${id}`);
    addToast('success', 'RAB Diperbarui', 'Data Rencana Anggaran Belanja diperbarui.');
  };

  const deleteRABItem = async (id: string) => {
    setRabItems(prev => prev.filter(r => r.id !== id));
    await logAudit('DELETE', 'procurement', `Menghapus anggaran RAB ID: ${id}`);
    addToast('info', 'RAB Dihapus', 'Data anggaran berhasil dihapus.');
  };

  const approveRABItem = async (id: string, approverName: string) => {
    setRabItems(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: 'Disetujui',
              approvedBy: approverName,
              approvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : r
      )
    );
    await logAudit('APPROVE', 'procurement', `Persetujuan RAB ID: ${id} oleh ${approverName}`);
    addToast('success', 'RAB Disetujui', 'RAB disetujui Kepala SPPG.');
  };

  // Modul PLOK: Quality Control Handlers with Automated Stock Addition
  const addQualityControlRecord = async (qc: Omit<QualityControlRecord, 'id' | 'inspectedAt'>) => {
    const inspectedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const uniqueSuffix = Math.random().toString(36).slice(2, 6);
    const differenceQuantity =
      qc.differenceQuantity !== undefined
        ? qc.differenceQuantity
        : qc.receivedQuantity - qc.orderedQuantity;
    const newQC: QualityControlRecord = {
      ...qc,
      differenceQuantity,
      id: `qc-${Date.now()}-${uniqueSuffix}`,
      inspectedAt,
    };
    setQualityControlRecords(prev => [newQC, ...prev]);

    // Relational sync 1: update PO status
    setPurchaseOrders(prev =>
      prev.map(p => {
        if (p.id === qc.poId || p.poNumber === qc.poNumber) {
          const nextStatus =
            qc.status === 'Diterima' || qc.status === 'Lolos Penuh'
              ? 'Diterima di Gudang'
              : qc.status === 'Diterima sebagian'
              ? 'Sebagian diterima'
              : qc.status === 'Ditolak'
              ? 'Ditolak'
              : p.status;
          return {
            ...p,
            qcStatus: qc.status,
            status: nextStatus,
            qcNotes: qc.notes,
            qcRecords: [...(p.qcRecords || []), newQC],
          };
        }
        return p;
      })
    );

    // Relational sync 2: If accepted, increase warehouse stock automatically!
    if (
      (qc.status === 'Diterima' || qc.status === 'Lolos Penuh' || qc.status === 'Diterima sebagian') &&
      qc.receivedQuantity > 0 &&
      qc.inventoryAdded
    ) {
      setInventory(prev => {
        const existingIdx = prev.findIndex(
          i => i.name.toLowerCase() === qc.itemName.toLowerCase()
        );
        if (existingIdx !== -1) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          const nextStock = curr.currentStock + qc.receivedQuantity;
          const newTx = {
            id: 'tx-qc-' + Date.now(),
            date: inspectedAt.slice(0, 10),
            type: 'Masuk' as const,
            quantity: qc.receivedQuantity,
            balanceAfter: nextStock,
            reason: `Penerimaan QC Lolos PO ${qc.poNumber} (${qc.supplierName})`,
            pic: qc.inspectorName,
            batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
            expiryDate: qc.expiryDate,
          };
          updated[existingIdx] = {
            ...curr,
            currentStock: nextStock,
            lastRestocked: inspectedAt.slice(0, 10),
            qualityStatus: 'Baik',
          };
          return updated;
        } else {
          const newItem: InventoryItem = {
            id: 'inv-' + Date.now(),
            code: 'BAHAN-' + Date.now().toString().slice(-4),
            name: qc.itemName,
            category: 'Bahan Segar',
            initialStock: qc.receivedQuantity,
            currentStock: qc.receivedQuantity,
            unit: qc.unit,
            minimumStock: Math.round(qc.receivedQuantity * 0.2),
            pricePerUnit: 20000,
            storageLocation: qc.receivingTemp && qc.receivingTemp < 5 ? 'Cold Storage 1' : 'Gudang Kering A',
            supplierName: qc.supplierName,
            lastRestocked: inspectedAt.slice(0, 10),
            expiryDate: qc.expiryDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            qualityStatus: 'Baik',
          };
          return [newItem, ...prev];
        }
      });
    }

    await logAudit('CREATE', 'procurement', `Pemeriksaan QC PO ${qc.poNumber}: ${qc.itemName} status ${qc.status} (${qc.receivedQuantity} ${qc.unit})`);
    addToast('success', 'QC Dicatat', `Pemeriksaan QC PO ${qc.poNumber} berhasil disimpan.`);
  };

  const updateQualityControlRecord = async (id: string, qc: Partial<QualityControlRecord>) => {
    setQualityControlRecords(prev =>
      prev.map(r => (r.id === id ? { ...r, ...qc } : r))
    );
    await logAudit('UPDATE', 'procurement', `Memperbarui data QC ID: ${id}`);
    addToast('success', 'QC Diperbarui', 'Data pemeriksaan mutu diperbarui.');
  };

  // Distribution Tracking
  const addDistributionLog = async (log: Omit<DistributionLog, 'id'>) => {
    const newLog: DistributionLog = { ...log, id: 'dist-' + Date.now() };
    setDistributionLogs(prev => [newLog, ...prev]);
    await logAudit('CREATE', 'distribution', `Jadwal pengiriman porsi ke ${log.institutionName}`);
    addToast('success', 'Pengiriman Terjadwal', `Distribusi ke ${log.institutionName} berhasil dicatat.`);
  };

  const updateDistributionLog = async (id: string, log: Partial<DistributionLog>) => {
    setDistributionLogs(prev => prev.map(d => (d.id === id ? { ...d, ...log } : d)));
    await logAudit('UPDATE', 'distribution', `Status pengiriman diperbarui untuk ID: ${id}`);
    addToast('success', 'Distribusi Dimutakhirkan', 'Status serah terima berhasil diperbarui.');
  };

  // Finance Transactions
  const addTransaction = async (tx: Omit<FinancialTransaction, 'id'>) => {
    const newTx: FinancialTransaction = { ...tx, id: 'tx-' + Date.now() };
    setFinancialTransactions(prev => [newTx, ...prev]);
    await logAudit('CREATE', 'finance', `Mencatat ${tx.type} Rp ${tx.amount} (${tx.description}) [${tx.approvalStatus}]`);
    addToast('success', 'Transaksi Tercatat', `Kas ${tx.type} Rp ${tx.amount.toLocaleString('id-ID')} berhasil dicatat.`);
  };

  const updateTransaction = async (id: string, update: Partial<FinancialTransaction>) => {
    setFinancialTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...update } : t)));
    await logAudit('UPDATE', 'finance', `Memperbarui transaksi kas ID: ${id}`);
    addToast('info', 'Transaksi Diperbarui', 'Pembaruan data transaksi berhasil disimpan.');
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    const target = financialTransactions.find(t => t.id === id);
    if (!target) return false;

    // ATURAN TEGAS: Transaksi yang sudah disetujui tidak boleh dihapus tanpa proses pembatalan dan jejak audit
    if (target.approvalStatus === 'Disetujui') {
      addToast('error', 'Hapus Ditolak', 'Transaksi yang berstatus Disetujui tidak boleh dihapus secara permanen. Gunakan prosedur Pembatalan Resmi dengan jejak audit.');
      return false;
    }

    setFinancialTransactions(prev => prev.filter(t => t.id !== id));
    await logAudit('DELETE', 'finance', `Menghapus transaksi draf/ditolak kas ID: ${id} (${target.transactionNumber})`);
    addToast('warning', 'Transaksi Dihapus', 'Pencatatan kas telah dihapus.');
    return true;
  };

  const approveTransaction = async (id: string, approverName: string) => {
    const now = new Date().toLocaleString('id-ID');
    setFinancialTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, approvalStatus: 'Disetujui', approvedBy: approverName, approvedAt: now } : t))
    );
    await logAudit('APPROVE', 'finance', `Menyetujui transaksi kas ID: ${id} oleh ${approverName}`);
    addToast('success', 'Transaksi Disetujui', 'Pencatatan kas resmi disahkan dan mempengaruhi saldo kas.');
  };

  const rejectTransaction = async (id: string, reason: string) => {
    setFinancialTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, approvalStatus: 'Ditolak', notes: (t.notes ? t.notes + ' | ' : '') + `Ditolak: ${reason}` } : t))
    );
    await logAudit('UPDATE', 'finance', `Menolak transaksi kas ID: ${id} alasan: ${reason}`);
    addToast('warning', 'Transaksi Ditolak', 'Status pengajuan kas telah ditolak.');
  };

  const cancelTransaction = async (id: string, reason: string, cancelledByName: string) => {
    const now = new Date().toLocaleString('id-ID');
    setFinancialTransactions(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              approvalStatus: 'Dibatalkan',
              cancellationReason: reason,
              cancelledBy: cancelledByName,
              cancelledAt: now,
            }
          : t
      )
    );
    await logAudit('DELETE', 'finance', `PEMBATALAN TRANSAKSI RESMI ID: ${id} alasan: "${reason}" oleh: ${cancelledByName}`);
    addToast('error', 'Transaksi Dibatalkan', 'Transaksi disetujui telah dibatalkan dengan jejak audit permanen.');
  };

  // Volunteers Attendance
  const recordAttendance = async (att: Omit<VolunteerAttendance, 'id'>) => {
    const newAtt: VolunteerAttendance = { ...att, id: 'v-' + Date.now() };
    setVolunteerAttendance(prev => [newAtt, ...prev]);
    await logAudit('CREATE', 'volunteers', `Absensi relawan: ${att.volunteerName} (${att.status})`);
    addToast('success', 'Presensi Dicatat', `Kehadiran ${att.volunteerName} berhasil disimpan.`);
  };

  const updateAttendance = async (id: string, att: Partial<VolunteerAttendance>) => {
    setVolunteerAttendance(prev => prev.map(v => (v.id === id ? { ...v, ...att } : v)));
    await logAudit('UPDATE', 'volunteers', `Memperbarui data kehadiran relawan ID: ${id}`);
    addToast('info', 'Presensi Dimutakhirkan', 'Status kehadiran relawan telah diperbarui.');
  };

  // Letters
  const addLetter = async (letter: Omit<OfficialLetter, 'id'>) => {
    const newLetter: OfficialLetter = { ...letter, id: 'let-' + Date.now() };
    setOfficialLetters(prev => [newLetter, ...prev]);
    await logAudit('CREATE', 'letters', `Mencatat ${letter.type} No: ${letter.letterNumber}`);
    addToast('success', 'Surat Diarsipkan', `Surat ${letter.letterNumber} berhasil disimpan.`);
  };

  const updateLetter = async (id: string, letter: Partial<OfficialLetter>) => {
    setOfficialLetters(prev => prev.map(l => (l.id === id ? { ...l, ...letter } : l)));
    await logAudit('UPDATE', 'letters', `Disposisi surat ID: ${id}`);
    addToast('success', 'Surat Diperbarui', 'Status surat telah dimutakhirkan.');
  };

  // Kitchen Progress
  const updateKitchenProgress = (progress: Partial<KitchenProgress>) => {
    setKitchenProgress(prev => ({ ...prev, ...progress }));
    addToast('info', 'Progres Dapur Diperbarui', 'Checklist kesiapan produksi harian dimutakhirkan.');
  };

  // 5 Divisi Dapur & Operasional Actions
  const addPrepRecord = async (rec: Omit<PreparationInspectionRecord, 'id'>) => {
    const newRec: PreparationInspectionRecord = {
      ...rec,
      id: `prep-${Date.now()}`,
    };
    setPrepRecords(prev => [newRec, ...prev]);
    addToast('success', 'Data Persiapan Tersimpan', `Pemeriksaan bahan rusak dan suhu oleh ${rec.officerName} berhasil dicatat.`);
    await logAudit('CREATE', 'production', `Mencatat inspeksi bahan rusak & suhu Divisi Persiapan: ${rec.damagedVegetable.name}`);
  };

  const updatePrepRecord = async (id: string, update: Partial<PreparationInspectionRecord>) => {
    setPrepRecords(prev => prev.map(r => (r.id === id ? { ...r, ...update } : r)));
    addToast('success', 'Laporan Persiapan Diperbarui', 'Pembaruan suhu & bukti foto Divisi Persiapan berhasil disimpan.');
    await logAudit('UPDATE', 'production', `Memperbarui laporan suhu/foto Divisi Persiapan (${id})`);
  };

  const addCookingRecord = async (rec: Omit<CookingInspectionRecord, 'id'>) => {
    const newRec: CookingInspectionRecord = {
      ...rec,
      id: `cook-${Date.now()}`,
    };
    setCookingRecords(prev => [newRec, ...prev]);
    addToast('success', 'Data Pengolahan Tersimpan', `Titik kendali kritis (CCP) suhu matang masakan dicatat.`);
    await logAudit('CREATE', 'production', `Mencatat suhu makanan matang Divisi Pengolahan oleh ${rec.officerName}`);
  };

  const updateCookingRecord = async (id: string, update: Partial<CookingInspectionRecord>) => {
    setCookingRecords(prev => prev.map(r => (r.id === id ? { ...r, ...update } : r)));
    addToast('success', 'Laporan Pengolahan Diperbarui', 'Pembaruan suhu & bukti foto Divisi Pengolahan berhasil disimpan.');
    await logAudit('UPDATE', 'production', `Memperbarui laporan suhu/foto Divisi Pengolahan (${id})`);
  };

  const addPortioningRecord = async (rec: Omit<PortioningInspectionRecord, 'id'>) => {
    const newRec: PortioningInspectionRecord = {
      ...rec,
      id: `port-${Date.now()}`,
    };
    setPortioningRecords(prev => [newRec, ...prev]);
    addToast('success', 'Data Pemorsian Tersimpan', `Penimbangan porsi kecil (${rec.smallPortionWeightGrams}g) & besar (${rec.largePortionWeightGrams}g) dicatat.`);
    await logAudit('CREATE', 'production', `Mencatat pemorsian ompreng steril oleh ${rec.officerName}`);
  };

  const updatePortioningRecord = async (id: string, update: Partial<PortioningInspectionRecord>) => {
    setPortioningRecords(prev => prev.map(r => (r.id === id ? { ...r, ...update } : r)));
    addToast('success', 'Laporan Pemorsian Diperbarui', 'Pembaruan suhu & bukti foto Divisi Pemorsian berhasil disimpan.');
    await logAudit('UPDATE', 'production', `Memperbarui laporan suhu/foto Divisi Pemorsian (${id})`);
  };

  const addDistributionDelivery = async (rec: Omit<DistributionDeliveryRecord, 'id'>) => {
    const newRec: DistributionDeliveryRecord = {
      ...rec,
      id: `dist-deliv-${Date.now()}`,
    };
    setDistributionDeliveries(prev => [newRec, ...prev]);
    addToast('success', 'Distribusi Terjadwal', `Pengiriman ${rec.totalPortions} porsi ke ${rec.institutionName} berhasil dicatat.`);
    await logAudit('CREATE', 'distribution', `Mencatat pengiriman makanan ke ${rec.institutionName} via ${rec.vehicleNumber}`);
  };

  const updateDistributionDelivery = async (id: string, update: Partial<DistributionDeliveryRecord>) => {
    setDistributionDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...update } : d));
    addToast('info', 'Status Distribusi Diperbarui', 'Pembaruan data & dokumentasi distribusi berhasil disimpan.');
    await logAudit('UPDATE', 'distribution', `Memperbarui log distribusi ${id}`);
  };

  const addOmprengReturn = async (rec: Omit<OmprengReturnRecord, 'id'>) => {
    const newRec: OmprengReturnRecord = {
      ...rec,
      id: `ret-${Date.now()}`,
    };
    setOmprengReturns(prev => [newRec, ...prev]);
    addToast('success', 'Pengembalian Ompreng Dicatat', `Diterima ${rec.totalPortions} ompreng kembali dari ${rec.institutionName}.`);
    await logAudit('CREATE', 'distribution', `Mencatat pengembalian ${rec.totalPortions} ompreng dari ${rec.institutionName}`);
  };

  const addFuelLog = async (rec: Omit<FuelLogRecord, 'id'>) => {
    const newRec: FuelLogRecord = {
      ...rec,
      id: `fuel-${Date.now()}`,
    };
    setFuelLogs(prev => [newRec, ...prev]);
    addToast('success', 'Pengisian BBM Tersimpan', `Log BBM ${rec.vehicleNumber} senilai Rp ${rec.nominalCost.toLocaleString('id-ID')} dicatat.`);
    await logAudit('CREATE', 'distribution', `Mencatat pengisian BBM ${rec.nominalCost} untuk ${rec.vehicleNumber}`);
  };

  const addWashingWasteRecord = async (rec: Omit<WashingWasteRecord, 'id'>) => {
    const newRec: WashingWasteRecord = {
      ...rec,
      id: `waste-${Date.now()}`,
    };
    setWashingWasteRecords(prev => [newRec, ...prev]);
    addToast('success', 'Food Waste & Cuci Ompreng Dicatat', `Total limbah makanan ${rec.totalWasteWeight} kg berhasil direkam.`);
    await logAudit('CREATE', 'production', `Mencatat audit sisa makanan (food waste) ${rec.totalWasteWeight} kg`);
  };

  const updateWashingWasteRecord = async (id: string, update: Partial<WashingWasteRecord>) => {
    setWashingWasteRecords(prev => prev.map(w => (w.id === id ? { ...w, ...update } : w)));
    addToast('success', 'Laporan Sanitasi Diperbarui', 'Pembaruan suhu & bukti foto Divisi Cuci Ompreng berhasil disimpan.');
    await logAudit('UPDATE', 'production', `Memperbarui laporan suhu/foto Divisi Cuci Ompreng (${id})`);
  };

  // 14. Modul Administrasi Surat (Mailing & Salinan Template)
  const addOutgoingDocument = async (docData: Omit<OutgoingDocument, 'id' | 'createdAt'>) => {
    const newDoc: OutgoingDocument = {
      ...docData,
      id: `out-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setOutgoingDocuments(prev => [newDoc, ...prev]);
    addToast('success', 'Dokumen Berhasil Dibuat', `Salinan dokumen resmi ${newDoc.letterNumber} berhasil di-generate.`);
    await logAudit('CREATE', 'letters', `Membuat salinan dokumen resmi [${newDoc.type}]: ${newDoc.letterNumber} (${newDoc.subject})`);
  };

  const updateOutgoingDocument = async (id: string, docData: Partial<OutgoingDocument>) => {
    setOutgoingDocuments(prev => prev.map(d => d.id === id ? { ...d, ...docData } : d));
    addToast('success', 'Dokumen Diperbarui', 'Data dokumen resmi berhasil diperbarui.');
    await logAudit('UPDATE', 'letters', `Memperbarui dokumen resmi ID: ${id}`);
  };

  const deleteOutgoingDocument = async (id: string) => {
    const target = outgoingDocuments.find(d => d.id === id);
    setOutgoingDocuments(prev => prev.filter(d => d.id !== id));
    addToast('info', 'Dokumen Dihapus', `Dokumen ${target?.letterNumber || id} dihapus dari arsip.`);
    await logAudit('DELETE', 'letters', `Menghapus arsip dokumen resmi: ${target?.letterNumber || id}`);
  };

  // 15. Modul Surat Masuk (Register, Disposisi & Scan)
  const addIncomingLetter = async (lettrData: Omit<IncomingLetter, 'id'>) => {
    const newLettr: IncomingLetter = {
      ...lettrData,
      id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setIncomingLetters(prev => [newLettr, ...prev]);
    addToast('success', 'Surat Masuk Diregistrasi', `Surat masuk dari ${newLettr.sender} berhasil diregistrasi.`);
    await logAudit('CREATE', 'letters', `Registrasi surat masuk: ${newLettr.letterNumber} dari ${newLettr.sender}`);
  };

  const updateIncomingLetter = async (id: string, lettrData: Partial<IncomingLetter>) => {
    setIncomingLetters(prev => prev.map(l => l.id === id ? { ...l, ...lettrData } : l));
    addToast('success', 'Surat Masuk Diperbarui', 'Data dan disposisi surat masuk berhasil dimutakhirkan.');
    await logAudit('UPDATE', 'letters', `Memperbarui status/disposisi surat masuk: ${id}`);
  };

  const deleteIncomingLetter = async (id: string) => {
    const target = incomingLetters.find(l => l.id === id);
    setIncomingLetters(prev => prev.filter(l => l.id !== id));
    addToast('info', 'Surat Masuk Dihapus', `Surat masuk ${target?.letterNumber || id} dihapus.`);
    await logAudit('DELETE', 'letters', `Menghapus register surat masuk: ${target?.letterNumber || id}`);
  };

  // MODUL KETIDAKHADIRAN RELAWAN
  const addVolunteerAbsence = async (rec: Omit<VolunteerAbsenceRecord, 'id' | 'createdAt'>) => {
    const newRec: VolunteerAbsenceRecord = {
      ...rec,
      id: `abs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setVolunteerAbsences(prev => [newRec, ...prev]);
    addToast('success', 'Ketidakhadiran Dicatat', `Pengajuan ketidakhadiran ${newRec.volunteerName} berhasil disimpan.`);
    await logAudit('CREATE', 'volunteers', `Mencatat ketidakhadiran relawan: ${newRec.volunteerName} (Divisi: ${newRec.division}) -> Pengganti: ${newRec.replacementVolunteerName}`);
  };

  const updateVolunteerAbsence = async (id: string, rec: Partial<VolunteerAbsenceRecord>) => {
    setVolunteerAbsences(prev => prev.map(a => a.id === id ? { ...a, ...rec } : a));
    addToast('success', 'Data Diperbarui', 'Data ketidakhadiran relawan berhasil dimutakhirkan.');
    await logAudit('UPDATE', 'volunteers', `Memperbarui data ketidakhadiran ID: ${id}`);
  };

  const approveVolunteerAbsence = async (id: string, approverName: string) => {
    const target = volunteerAbsences.find(a => a.id === id);
    if (!target) return;

    const approvedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setVolunteerAbsences(prev => prev.map(a => a.id === id ? {
      ...a,
      approvalStatus: 'Disetujui',
      approvedBy: approverName,
      approvedAt,
    } : a));

    // Otomatis sinkronisasi ke presensi relawan
    setVolunteerAttendance(prev => {
      const existing = prev.find(att => att.date === target.date && (att.volunteerName === target.volunteerName || att.volunteerId === target.volunteerId));
      if (existing) {
        return prev.map(att => att.id === existing.id ? {
          ...att,
          status: target.reason === 'Sakit' ? 'Sakit' : 'Izin',
          healthCheckPassed: target.reason !== 'Sakit',
          reason: `${target.reason}: ${target.reasonDetails || ''}`.trim(),
          replacementVolunteer: target.replacementVolunteerName,
          notes: `Disetujui oleh ${approverName}. Pengganti: ${target.replacementVolunteerName} (Divisi ${target.replacementDivision})`,
        } : att);
      } else {
        const newAtt: VolunteerAttendance = {
          id: `att-abs-${Date.now()}`,
          date: target.date,
          volunteerId: target.volunteerId,
          volunteerName: target.volunteerName,
          division: target.division as any,
          shift: 'Pagi (03:30 - 08:30)',
          status: target.reason === 'Sakit' ? 'Sakit' : 'Izin',
          healthCheckPassed: target.reason !== 'Sakit',
          hygieneGearComplete: false,
          replacementVolunteer: target.replacementVolunteerName,
          reason: target.reason,
          notes: `Disetujui oleh ${approverName}. Pengganti: ${target.replacementVolunteerName} (Divisi ${target.replacementDivision})`,
        };
        return [newAtt, ...prev];
      }
    });

    addToast('success', 'Ketidakhadiran Disetujui', `Pergantian relawan ${target.volunteerName} oleh ${target.replacementVolunteerName} disetujui.`);
    await logAudit('APPROVE', 'volunteers', `Menyetujui ketidakhadiran & pergantian relawan: ${target.volunteerName} -> ${target.replacementVolunteerName}`);
  };

  const rejectVolunteerAbsence = async (id: string, reason: string) => {
    const target = volunteerAbsences.find(a => a.id === id);
    setVolunteerAbsences(prev => prev.map(a => a.id === id ? {
      ...a,
      approvalStatus: 'Ditolak',
      rejectionReason: reason,
    } : a));
    addToast('info', 'Ketidakhadiran Ditolak', `Pengajuan ketidakhadiran ${target?.volunteerName || id} ditolak.`);
    await logAudit('UPDATE', 'volunteers', `Menolak pengajuan ketidakhadiran: ${target?.volunteerName || id} (Alasan: ${reason})`);
  };

  const deleteVolunteerAbsence = async (id: string) => {
    const target = volunteerAbsences.find(a => a.id === id);
    setVolunteerAbsences(prev => prev.filter(a => a.id !== id));
    addToast('info', 'Data Dihapus', `Catatan ketidakhadiran ${target?.volunteerName || id} dihapus.`);
    await logAudit('DELETE', 'volunteers', `Menghapus catatan ketidakhadiran ID: ${id}`);
  };

  // MODUL PORTAL SUPPLIER
  const supplierConfirmPO = async (poId: string, estimatedDelivery: string, driverName?: string, driverPhone?: string, vehicleNumber?: string) => {
    const confirmedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setPurchaseOrders(prev => prev.map(po => po.id === poId ? {
      ...po,
      supplierConfirmed: true,
      supplierConfirmedAt: confirmedAt,
      supplierEstimatedDelivery: estimatedDelivery,
      supplierDriverName: driverName,
      supplierDriverPhone: driverPhone,
      supplierVehicleNumber: vehicleNumber,
      supplierDeliveryStatus: 'Dikonfirmasi Supplier',
    } : po));
    addToast('success', 'Pesanan Dikonfirmasi', `Pesanan PO berhasil dikonfirmasi. Estimasi pengiriman: ${estimatedDelivery}`);
    await logAudit('UPDATE', 'procurement', `Supplier mengonfirmasi PO ${poId} (Estimasi: ${estimatedDelivery})`);
  };

  const supplierUpdatePOStatus = async (poId: string, status: NonNullable<PurchaseOrder['supplierDeliveryStatus']>, notes?: string) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === poId) {
        let updatedPOStatus = po.status;
        if (status === 'Dalam Pengiriman') {
          updatedPOStatus = 'Dikirim ke supplier';
        }
        return {
          ...po,
          supplierDeliveryStatus: status,
          status: updatedPOStatus,
          notes: notes ? `${po.notes ? po.notes + ' | ' : ''}Update Supplier: ${notes}` : po.notes,
        };
      }
      return po;
    }));
    addToast('success', 'Status Pesanan Diperbarui', `Status pengiriman PO kini: ${status}`);
    await logAudit('UPDATE', 'procurement', `Supplier memperbarui status pengiriman PO ${poId} menjadi ${status}`);
  };

  const supplierRejectPO = async (poId: string, reason: string) => {
    setPurchaseOrders(prev => prev.map(po => po.id === poId ? {
      ...po,
      supplierConfirmed: false,
      supplierDeliveryStatus: 'Ditolak Supplier',
      supplierRejectionReason: reason,
      status: 'Ditolak',
    } : po));
    addToast('warning', 'Pesanan Ditolak Supplier', `Pesanan PO ditolak oleh supplier dengan alasan: ${reason}`);
    await logAudit('UPDATE', 'procurement', `Supplier menolak pesanan PO ${poId}: ${reason}`);
  };

  const supplierUploadDocument = async (poId: string, doc: Omit<SupplierDocument, 'id' | 'uploadedAt'>) => {
    const newDoc: SupplierDocument = {
      ...doc,
      id: `sdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === poId) {
        return {
          ...po,
          supplierDocuments: [...(po.supplierDocuments || []), newDoc],
        };
      }
      return po;
    }));
    addToast('success', 'Dokumen Terunggah', `Dokumen ${doc.type} (${doc.fileName}) berhasil diunggah.`);
    await logAudit('UPDATE', 'procurement', `Supplier mengunggah dokumen [${doc.type}] untuk PO ${poId}`);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated,
        authReady,
        loginWithProfile,
        logout,
        switchRole,
        hasPermission,
        rolePermissions,
        updateRolePermissions,
        webAccessUsers,
        webAccessPolicy,
        addWebAccessUser,
        updateWebAccessUser,
        toggleWebAccessStatus,
        deleteWebAccessUser,
        updateWebAccessPolicy,
        recordWebLoginTimestamp,
        findWebAccessUser,
        sppgConfig,
        updateSPPGConfig,
        institutions,
        addInstitution,
        updateInstitution,
        updateInstitutionQuotaWithHistory,
        deleteInstitution,
        masterBahan,
        addMasterBahan,
        updateMasterBahan,
        deleteMasterBahan,
        masterSuppliers,
        addMasterSupplier,
        updateMasterSupplier,
        deleteMasterSupplier,
        masterVolunteers,
        addMasterVolunteer,
        updateMasterVolunteer,
        deleteMasterVolunteer,
        masterUnits,
        addMasterUnit,
        updateMasterUnit,
        deleteMasterUnit,
        materialConversions,
        addMaterialConversion,
        updateMaterialConversion,
        deleteMaterialConversion,
        beneficiaryAttendance,
        recordBeneficiaryAttendance,
        updateBeneficiaryAttendance,
        beneficiaryQuotaHistory,
        menuItems,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        approveMenuItem,
        inventory,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustStock,
        purchaseOrders,
        addPurchaseOrder,
        updatePurchaseOrder,
        verifyPurchaseOrderFinance,
        approvePurchaseOrderHead,
        updatePOQualityControl,
        receivePOToWarehouse,
        rabItems,
        addRABItem,
        updateRABItem,
        deleteRABItem,
        approveRABItem,
        qualityControlRecords,
        addQualityControlRecord,
        updateQualityControlRecord,
        distributionLogs,
        addDistributionLog,
        updateDistributionLog,
        financialTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        approveTransaction,
        rejectTransaction,
        cancelTransaction,
        volunteerAttendance,
        recordAttendance,
        updateAttendance,
        volunteerAbsences,
        addVolunteerAbsence,
        updateVolunteerAbsence,
        approveVolunteerAbsence,
        rejectVolunteerAbsence,
        deleteVolunteerAbsence,
        supplierConfirmPO,
        supplierUpdatePOStatus,
        supplierRejectPO,
        supplierUploadDocument,
        officialLetters,
        addLetter,
        updateLetter,
        outgoingDocuments,
        addOutgoingDocument,
        updateOutgoingDocument,
        deleteOutgoingDocument,
        incomingLetters,
        addIncomingLetter,
        updateIncomingLetter,
        deleteIncomingLetter,
        auditLogs,
        logAudit,
        kitchenProgress,
        updateKitchenProgress,
        prepRecords,
        addPrepRecord,
        updatePrepRecord,
        cookingRecords,
        addCookingRecord,
        updateCookingRecord,
        portioningRecords,
        addPortioningRecord,
        updatePortioningRecord,
        distributionDeliveries,
        addDistributionDelivery,
        updateDistributionDelivery,
        omprengReturns,
        addOmprengReturn,
        fuelLogs,
        addFuelLog,
        washingWasteRecords,
        addWashingWasteRecord,
        updateWashingWasteRecord,
        darkMode,
        toggleDarkMode,
        toasts,
        addToast,
        removeToast,
        dynamicFormSchemas,
        isAdminUser,
        saveDynamicFormSchema,
        resetDynamicFormSchema,
        isFirebaseConnected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
