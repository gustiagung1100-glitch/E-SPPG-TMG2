/**
 * E-SPPG TMG2 (Sistem Informasi Satuan Pelayanan Pemenuhan Gizi)
 * 39 Master & Operational Collections Database Types
 * Multi-Tenant SPPG Scoping, Audit Trail, and Soft Delete Support
 */

export interface BaseEntityMetadata {
  id: string;
  sppgId: string; // Multi-tenant isolation per SPPG (e.g. "GFBQSYXD")
  createdAt: string; // ISO 8601 Timestamp
  createdBy: string; // User UID or Name
  updatedAt: string; // ISO 8601 Timestamp
  updatedBy: string; // User UID or Name
  status: string; // Entity operational status
  changeHistory?: ChangeHistoryItem[];
  isDeleted?: boolean; // Soft delete flag
  deletedAt?: string;
  deletedBy?: string;
}

export interface ChangeHistoryItem {
  timestamp: string;
  modifiedBy: string;
  modifiedByName?: string;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'APPROVE' | 'REJECT' | 'SOFT_DELETE' | 'RESTORE';
  previousStatus?: string;
  newStatus?: string;
  changesSummary: string;
  fieldDiffs?: Record<string, { from: any; to: any }>;
}

// -----------------------------------------------------------------------------
// 1-4. User, Identity, Roles & Permissions
// -----------------------------------------------------------------------------
export interface UserDocument extends BaseEntityMetadata {
  uid: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  division?: string;
  phone?: string;
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface RoleDocument extends BaseEntityMetadata {
  roleCode: string;
  roleName: string;
  description: string;
  level: number; // 1 = Admin Utama, 2 = Kepala SPPG, 3 = Pengawas, 4 = Staff, 5 = Relawan, 6 = Eksternal
  permissionIds: string[];
  isSystemRole: boolean;
}

export interface PermissionDocument extends BaseEntityMetadata {
  moduleKey: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'print' | 'export';
  permissionCode: string; // e.g. "procurement:approve", "finance:edit"
  description: string;
}

export interface SPPGProfileDocument extends BaseEntityMetadata {
  sppgName: string;
  foundationName: string;
  address: string;
  rtRw: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  headOfSppg: string;
  nutritionOfficer: string;
  financeOfficer: string;
  logisticsOfficer: string;
  phone: string;
  email: string;
  programName: string;
  dailyCapacityTarget: number;
  smallPortionBudget: number;
  largePortionBudget: number;
  isVerified: boolean;
}

// -----------------------------------------------------------------------------
// 5-7. Institutions, Beneficiaries & Daily Records
// -----------------------------------------------------------------------------
export interface InstitutionDocument extends BaseEntityMetadata {
  name: string;
  institutionType: 'Sekolah Dasar (SD)' | 'Madrasah Ibtidaiyah (MI)' | 'SMP' | 'MTs' | 'SMA' | 'SMK' | 'PAUD/TK' | 'Pondok Pesantren';
  level: 'PAUD' | 'SD' | 'MI' | 'SMP' | 'MTs' | 'SMA' | 'SMK' | 'Pesantren';
  npsn: string;
  address: string;
  contactPerson: string;
  phone: string;
  picName: string;
  picPhone: string;
  smallPortions: number;
  largePortions: number;
  totalPortions: number;
  deliveryRoute: string;
  deliveryOrder: number;
  allergiesNote?: string;
}

export interface BeneficiaryDocument extends BaseEntityMetadata {
  institutionId: string;
  institutionName: string;
  cohortName: string; // e.g. "Kelas 1A", "Santri Putri Tahfidz"
  category: 'Porsi Kecil' | 'Porsi Besar';
  totalCount: number;
  allergiesDetail?: string;
  specialDietNotes?: string;
}

export interface BeneficiaryDailyRecordDocument extends BaseEntityMetadata {
  date: string;
  institutionId: string;
  institutionName: string;
  targetSmall: number;
  targetLarge: number;
  targetTotal: number;
  absentSmall: number;
  absentLarge: number;
  actualSmall: number;
  actualLarge: number;
  actualTotal: number;
  bastConfirmed: boolean;
  notes?: string;
}

// -----------------------------------------------------------------------------
// 8-9. Volunteers & Suppliers
// -----------------------------------------------------------------------------
export interface VolunteerDocument extends BaseEntityMetadata {
  volunteerCode: string;
  name: string;
  division: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan';
  phone: string;
  address: string;
  joinDate: string;
  emergencyContact: string;
  healthCertExpiry?: string;
  isAvailable: boolean;
}

export interface SupplierDocumentRecord extends BaseEntityMetadata {
  supplierCode: string;
  name: string;
  companyName: string;
  address: string;
  contactPerson: string;
  phone: string;
  email?: string;
  categories: string[]; // e.g. ["Daging Ayam", "Beras Organik"]
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  npwp?: string;
  halalCertNumber?: string;
}

// -----------------------------------------------------------------------------
// 10-12. Ingredients, Prices & Nutrition References
// -----------------------------------------------------------------------------
export interface IngredientDocument extends BaseEntityMetadata {
  code: string;
  name: string;
  category: 'Bahan Segar' | 'Bahan Kering' | 'Bumbu & Rempah' | 'Kemasan & Higiene' | 'Pelengkap';
  unit: string;
  currentStock: number;
  minimumStock: number;
  latestPrice: number;
  storageLocation: 'Gudang Kering A' | 'Gudang Kering B' | 'Cold Storage 1' | 'Chiller Dapur' | 'Rak Bumbu';
  supplierId?: string;
  supplierName?: string;
}

export interface IngredientPriceDocument extends BaseEntityMetadata {
  ingredientId: string;
  ingredientName: string;
  pricePerUnit: number;
  effectiveDate: string;
  priceType: 'Harga Acuan BGN' | 'Harga Kontrak Rekanan' | 'Harga Pasar Riil';
  supplierId?: string;
  notes?: string;
}

export interface NutritionReferenceDocument extends BaseEntityMetadata {
  ingredientName: string;
  foodGroup: string;
  portionUnit: string;
  calories100g: number;
  protein100g: number;
  fat100g: number;
  carb100g: number;
  fiber100g: number;
  calcium100g: number;
  iron100g: number;
  sourceStandard: 'TKPI Kemenkes' | 'BGN RI 2025';
}

// -----------------------------------------------------------------------------
// 13-18. Menu Plans, Items, Recipes, Calculations & Food Costs
// -----------------------------------------------------------------------------
export interface MenuPlanDocument extends BaseEntityMetadata {
  planTitle: string;
  periodMonth: string;
  cycleWeek: number;
  startDate: string;
  endDate: string;
  totalPortionsPlanned: number;
  approvalStatus: 'Draft' | 'Ditinjau Gizi' | 'Disetujui Kepala' | 'Aktif';
}

export interface MenuItemDocument extends BaseEntityMetadata {
  menuPlanId?: string;
  date: string;
  dayName: string;
  cycleWeek: number;
  menuCode: string;
  name: string;
  stapleFood: string;
  animalProtein: string;
  plantProtein: string;
  vegetable: string;
  fruit: string;
  milkOrExtra: string;
  caloriesSmall: number;
  caloriesLarge: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
  targetPortions: number;
  estimatedCostPerPortion: number;
}

export interface RecipeDocument extends BaseEntityMetadata {
  menuItemId?: string;
  recipeName: string;
  dishCategory: 'Makanan Pokok' | 'Lauk Hewani' | 'Lauk Nabati' | 'Sayuran' | 'Buah & Minuman';
  standardBatchSize: number; // e.g. 500 porsi
  cookingMethod: string;
  safetyCcpTemperature: number; // min 75°C
  notes?: string;
}

export interface RecipeIngredientDocument extends BaseEntityMetadata {
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  netWeightSmall: number;
  netWeightLarge: number;
  grossWeightMultiplier: number; // e.g. 1.25 for edible portion / BDD
}

export interface NutritionCalculationDocument extends BaseEntityMetadata {
  menuItemId: string;
  menuName: string;
  targetGroup: 'Porsi Kecil' | 'Porsi Besar';
  totalEnergyKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbG: number;
  complianceAkgPercent: number; // e.g. 102.5%
  isCompliantBgn: boolean;
  certifiedByNutrisionist: string;
}

export interface FoodCostDocument extends BaseEntityMetadata {
  menuItemId: string;
  menuName: string;
  portionCostReal: number;
  bgnCeilingBudget: number; // Rp 12.500 / Rp 15.000
  marginSavings: number;
  efficiencyRatioPercent: number;
  verifiedByFinance: string;
}

// -----------------------------------------------------------------------------
// 19-23. RAB, Purchase Orders & Quality Control
// -----------------------------------------------------------------------------
export interface RABHeaderDocument extends BaseEntityMetadata {
  rabCode: string;
  periodMonth: string;
  totalBudgetPlanned: number;
  totalRealizedPO: number;
  approvalStatus: 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  approvedBy?: string;
  approvedAt?: string;
}

export interface RABItemDocument extends BaseEntityMetadata {
  rabHeaderId: string;
  budgetCode: string;
  category: 'RAB Bahan Pangan' | 'RAB Operasional';
  itemName: string;
  volume: number;
  unit: string;
  unitPrice: number;
  totalBudget: number;
  poCreatedQuantity: number;
  poCreatedAmount: number;
  remainingPagu: number;
}

export interface PurchaseOrderDocument extends BaseEntityMetadata {
  poNumber: string;
  date: string;
  deliveryDate: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  rabId?: string;
  totalAmount: number;
  orderStatus: 'Draft' | 'Menunggu persetujuan' | 'Disetujui' | 'Dikirim ke supplier' | 'Sebagian diterima' | 'Selesai diterima' | 'Ditolak';
  qcStatus: 'Belum QC' | 'Diterima' | 'Diterima sebagian' | 'Ditolak' | 'Lolos Penuh';
  supplierConfirmed?: boolean;
  supplierEstimatedDelivery?: string;
  notes?: string;
}

export interface PurchaseOrderItemDocument extends BaseEntityMetadata {
  purchaseOrderId: string;
  poNumber: string;
  ingredientId: string;
  itemName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  rabItemId?: string;
}

export interface QualityControlDocument extends BaseEntityMetadata {
  qcNumber: string;
  poId: string;
  poNumber: string;
  ingredientId: string;
  itemName: string;
  supplierName: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  condition: 'Baik' | 'Kemasan Cacat' | 'Rusak Ringan' | 'Busuk/Tercemar';
  qualityGrade: 'Grade A (Sangat Baik)' | 'Grade B (Standar)' | 'Afkir (Tidak Layak)';
  receivingTemp?: number;
  expiryDate: string;
  inspectorName: string;
  qcDecision: 'Lolos Penuh' | 'Diterima sebagian' | 'Ditolak';
  photoEvidenceUrl?: string;
  inventoryAdded: boolean;
}

// -----------------------------------------------------------------------------
// 24-25. Inventory Batches & Movements
// -----------------------------------------------------------------------------
export interface InventoryBatchDocument extends BaseEntityMetadata {
  ingredientId: string;
  ingredientName: string;
  batchNumber: string;
  poId?: string;
  qcId?: string;
  initialQuantity: number;
  remainingQuantity: number;
  unit: string;
  storageLocation: string;
  expiryDate: string;
  receivedDate: string;
}

export interface InventoryMovementDocument extends BaseEntityMetadata {
  movementType: 'Masuk' | 'Keluar' | 'Penyesuaian' | 'Retur' | 'Pemusnahan';
  ingredientId: string;
  ingredientName: string;
  batchId?: string;
  quantity: number;
  unit: string;
  balanceAfter: number;
  referenceDocType: 'QC_PO' | 'PRODUCTION_BATCH' | 'STOCK_OPNAME';
  referenceDocId: string;
  reason: string;
  handledBy: string;
}

// -----------------------------------------------------------------------------
// 26-30. Kitchen Production, Temperature, Waste, Portioning & Distribution
// -----------------------------------------------------------------------------
export interface ProductionLogDocument extends BaseEntityMetadata {
  productionBatchCode: string;
  date: string;
  menuItemId: string;
  menuName: string;
  headChefName: string;
  shift: 'Subuh (03:30)' | 'Pagi (06:00)' | 'Siang';
  actualPortionsCooked: number;
  cookingStartTime: string;
  cookingFinishTime: string;
  ccpVerificationPassed: boolean;
}

export interface TemperatureLogDocument extends BaseEntityMetadata {
  logType: 'Suhu Inti Masakan' | 'Suhu Pemorsian' | 'Suhu Ruang Steril' | 'Suhu Chiller' | 'Suhu Freezer';
  targetEntityName: string; // e.g. "Ayam Madu Wajan 1", "Cleanroom Pemorsian", "Cold Storage 1"
  measuredTemperature: number;
  standardMin?: number;
  standardMax?: number;
  isWithinStandard: boolean;
  timeRecorded: string;
  officerName: string;
}

export interface FoodWasteLogDocument extends BaseEntityMetadata {
  date: string;
  institutionId?: string;
  institutionName: string;
  omprengReturnedCount: number;
  riceWasteKg: number;
  proteinWasteKg: number;
  vegetableWasteKg: number;
  fruitWasteKg: number;
  totalWasteKg: number;
  wastePerPortionGram: number;
  dispositionMethod: 'Komposting Desa' | 'Pakan Maggot BSF' | 'Ternak Warga';
  officerName: string;
}

export interface PortioningRecordDocument extends BaseEntityMetadata {
  portioningBatchCode: string;
  date: string;
  menuItemId: string;
  menuName: string;
  lineOfficerName: string;
  smallPortionsPacked: number;
  largePortionsPacked: number;
  totalPacked: number;
  sampleWeightSmallGram: number; // standard 380g
  sampleWeightLargeGram: number; // standard 580g
  foodTempAtPortioning: number; // min 60°C
  tamperSealVerified: boolean;
}

export interface DistributionRecordDocument extends BaseEntityMetadata {
  deliveryCode: string;
  date: string;
  institutionId: string;
  institutionName: string;
  smallPortionsDelivered: number;
  largePortionsDelivered: number;
  totalPortionsDelivered: number;
  driverName: string;
  vehicleNumber: string;
  departureTime: string;
  arrivalTime: string;
  foodTempAtArrival: number;
  bastNumber: string;
  picReceiverName: string;
  deliveryStatus: 'Dalam Perjalanan' | 'Tiba di Lokasi' | 'Selesai Serah Terima';
  photoEvidenceUrl?: string;
}

// -----------------------------------------------------------------------------
// 31-35. Finance & Letter Administration
// -----------------------------------------------------------------------------
export interface FinancialTransactionDocument extends BaseEntityMetadata {
  transactionNumber: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category: 'Belanja Bahan Baku (PO)' | 'Operasional Gas & Listrik' | 'Insentif Relawan' | 'Logistik & BBM' | 'Higiene & Sanitasi' | 'Pencairan BGN/Yayasan';
  amount: number;
  description: string;
  sourceOrRecipient: string;
  paymentMethod: 'Transfer Bank' | 'Tunai';
  bankAccount: string;
  proofNumber: string;
  proofFileUrl?: string;
  approvalStatus: 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  approvedBy?: string;
  approvedAt?: string;
}

export interface IncomingLetterDocument extends BaseEntityMetadata {
  letterNumber: string;
  letterDate: string;
  receivedDate: string;
  sender: string;
  subject: string;
  category: 'Badan Gizi Nasional (BGN)' | 'Dinas / Pemda' | 'Sekolah / Lembaga' | 'Supplier / Vendor' | 'Yayasan / Internal' | 'Umum';
  dispositionTo: string;
  dispositionInstruction: string;
  followUpStatus: 'Diterima' | 'Didisposisikan' | 'Dalam Proses Tindak Lanjut' | 'Selesai Tindak Lanjut' | 'Diarsipkan';
  scannedDocumentUrl?: string;
}

export interface OutgoingLetterDocument extends BaseEntityMetadata {
  letterCode: string;
  letterNumber: string;
  type: 'Surat Perjalanan Dinas' | 'Surat Tugas' | 'Berita Acara Serah Terima' | 'Berita Acara Perubahan Penerima Manfaat' | 'Berita Acara Kekurangan Bahan' | 'Berita Acara Lainnya' | 'Surat Undangan' | 'Surat Keterangan';
  date: string;
  subject: string;
  recipientName: string;
  recipientInstitution?: string;
  templateId: string;
  mergedBody: string;
  signedBy: string;
  signedRole: string;
  letterStatus: 'Konsep' | 'Disahkan' | 'Terkirim' | 'Diarsipkan';
  googleDocUrl?: string;
}

export interface DocumentTemplateDocument extends BaseEntityMetadata {
  templateCode: string;
  templateName: string;
  documentType: string;
  headerFormat: string;
  bodyTemplate: string;
  availablePlaceholders: string[]; // e.g. ["{{NOMOR_SURAT}}", "{{NAMA_LEMBAGA}}"]
  isLockedDefault: boolean;
}

export interface GeneratedDocumentDocument extends BaseEntityMetadata {
  documentRegisterNumber: string;
  templateId: string;
  title: string;
  sourceModule: string;
  referenceEntityId: string;
  pdfExportUrl?: string;
  printedCount: number;
  lastPrintedAt?: string;
}

// -----------------------------------------------------------------------------
// 36-39. Attendance, Notifications, Audit & Settings
// -----------------------------------------------------------------------------
export interface AttendanceRecordDocument extends BaseEntityMetadata {
  date: string;
  personnelId: string;
  personnelName: string;
  roleOrDivision: string;
  shift: string;
  checkInTime: string;
  checkOutTime?: string;
  attendanceStatus: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  healthCheckPassed: boolean;
  hygieneComplete: boolean;
  replacementVolunteerName?: string;
  notes?: string;
}

export interface NotificationDocument extends BaseEntityMetadata {
  recipientUid: string;
  recipientRole?: string;
  title: string;
  message: string;
  notificationType: 'APPROVAL_REQUEST' | 'LOW_STOCK' | 'QC_ALERT' | 'DELIVERY_UPDATE' | 'SECURITY';
  referenceModule: string;
  referenceId?: string;
  isRead: boolean;
  readAt?: string;
}

export interface AuditLogDocument extends BaseEntityMetadata {
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'EXPORT' | 'RESTORE' | 'BACKUP';
  module: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  affectedCollection: string;
  affectedDocumentId?: string;
}

export interface AppSettingDocument extends BaseEntityMetadata {
  settingKey: string;
  settingCategory: 'Keamanan' | 'Operasional' | 'Unggahan' | 'Penyimpanan' | 'Backup';
  value: any;
  description: string;
  isEncrypted: boolean;
}

// -----------------------------------------------------------------------------
// Registry of all 39 Collections
// -----------------------------------------------------------------------------
export const FIRESTORE_COLLECTIONS = [
  'users',
  'roles',
  'permissions',
  'sppg_profiles',
  'institutions',
  'beneficiaries',
  'beneficiary_daily_records',
  'volunteers',
  'suppliers',
  'ingredients',
  'ingredient_prices',
  'nutrition_references',
  'menu_plans',
  'menu_items',
  'recipes',
  'recipe_ingredients',
  'nutrition_calculations',
  'food_costs',
  'rab_headers',
  'rab_items',
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
  'incoming_letters',
  'outgoing_letters',
  'document_templates',
  'generated_documents',
  'attendance_records',
  'notifications',
  'audit_logs',
  'app_settings',
] as const;

export type FirestoreCollectionKey = typeof FIRESTORE_COLLECTIONS[number];
