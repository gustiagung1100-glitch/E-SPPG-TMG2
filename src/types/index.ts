/**
 * E-SPPG TMG2 System Types
 * Electronic Sistem Informasi Satuan Pelayanan Pemenuhan Gizi
 * SPPG Probolinggo Krejengan Temenggungan 2 - Yayasan Hafshawaty
 */

export type RoleType =
  | 'Admin Utama'
  | 'Kepala SPPG'
  | 'Pengawas Gizi'
  | 'Pengawas Keuangan'
  | 'Asisten Lapangan'
  | 'Admin Gudang'
  | 'Cheff'
  | 'Relawan Div. Persiapan'
  | 'Relawan Div. Pengolahan'
  | 'Relawan Div. Pemorsian'
  | 'Relawan Div. Distribusi'
  | 'Relawan Div. Cuci Ompreng'
  | 'Supplier / Mitra Pangan';

export type ActionPermission = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'print' | 'export';

export type ModuleKey =
  | 'dashboard'
  | 'master_data'
  | 'institutions'
  | 'menu'
  | 'procurement'
  | 'inventory'
  | 'production'
  | 'distribution'
  | 'finance'
  | 'volunteers'
  | 'letters'
  | 'reports'
  | 'settings'
  | 'supplier_portal'
  | 'menu_flyer';

export type FlyerTemplateId = 'modern_bgn' | 'nutri_infographic' | 'nusantara_warm' | 'school_friendly';
export type FlyerSizeId = 'a4' | 'social_square' | 'social_story';

export interface FlyerConfig {
  id: string;
  menuId: string;
  menuDate: string;
  template: FlyerTemplateId;
  size: FlyerSizeId;
  title: string;
  customPhotoUrl?: string;
  selectedPhotoType: 'portioning_small' | 'portioning_large' | 'menu_display' | 'custom';
  showNutritionFacts: boolean;
  showConsumptionDeadline: boolean;
  smallConsumptionDeadline: string;
  largeConsumptionDeadline: string;
  customNotes?: string;
  displaySchoolTarget: string;
  bgnStandardNote: string;
}

export interface RolePermissions {
  [key: string]: {
    [action in ActionPermission]: boolean;
  };
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: RoleType;
  division?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  supplierId?: string;
  supplierName?: string;
}

export interface WebAccessUser {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  division?: string;
  supplierId?: string;
  supplierName?: string;
  passwordHash: string;
  isActive: boolean;
  allowGoogleLogin: boolean;
  isProtectedAdmin?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface WebAccessPolicy {
  strictWhitelistOnly: boolean;
  allowSelfRegistration: boolean;
  allowDemoPreview: boolean;
}

export interface SPPGConfig {
  sppgName: string;
  foundationName: string;
  sppgId: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  rtRw: string;
  headOfSppg: string;
  nutritionOfficer: string;
  financeOfficer: string;
  phone: string;
  email: string;
  programName: string;
  nationalAgency: string;
  dailyPortionTarget: number;
  smallPortionBudget: number;
  largePortionBudget: number;
}

// Master A: Master Penerima Manfaat & Lembaga
export interface Institution {
  id: string;
  name: string;
  institutionType: 'Sekolah Dasar (SD)' | 'Madrasah Ibtidaiyah (MI)' | 'SMP' | 'MTs' | 'SMA' | 'SMK' | 'PAUD/TK' | 'Pondok Pesantren';
  level: 'PAUD' | 'SD' | 'MI' | 'SMP' | 'MTs' | 'SMA' | 'SMK' | 'Pesantren';
  address: string;
  npsn: string;
  contactPerson: string;
  phone: string;
  picName: string;
  picPhone: string;
  bankName?: string;
  accountNumber?: string;
  bankAccountName?: string;
  smallPortions: number; // TK/PAUD & Kelas 1-3
  largePortions: number; // Kelas 4-6, SMP, SMA, Santri
  totalPortions: number; // smallPortions + largePortions
  deliveryRoute: string;
  deliveryOrder: number;
  allergiesNote?: string;
  isActive: boolean;
}

// Master B: Master Bahan Pangan
export interface MasterBahan {
  id: string;
  code: string;
  name: string;
  category: 'Bahan Segar' | 'Bahan Kering' | 'Bumbu & Rempah' | 'Kemasan & Higiene' | 'Pelengkap';
  unit: string;
  referencePrice: number; // Harga acuan BGN / Standar Pemerintah (Rp)
  actualPrice: number;    // Harga aktual pembelian (Rp)
  minimumStock: number;
  // Nutrition per 100g
  calories100g: number; // kkal
  protein100g: number;  // g
  fat100g: number;      // g
  carb100g: number;     // g
  fiber100g: number;    // g
  calcium100g: number;  // mg
  iron100g: number;     // mg
  isActive: boolean;
  notes?: string;
}

// Master C: Master Supplier
export interface MasterSupplier {
  id: string;
  code: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email?: string;
  suppliedCategories: string[]; // Contoh: ['Daging Ayam Segar', 'Telur Ras', 'Beras', 'Sayuran']
  bankName: string;
  accountNumber: string;
  bankAccountName: string;
  isActive: boolean;
  npwp?: string;
  notes?: string;
}

// Master D: Master Relawan
export interface MasterVolunteer {
  id: string;
  code: string;
  name: string;
  division: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan';
  position: 'Koordinator Divisi' | 'Wakil Koordinator' | 'Juru Masak / Cook' | 'Asisten Dapur' | 'Petugas Timbang & Packing' | 'Driver Armada' | 'Petugas Sanitasi';
  phone: string;
  address: string;
  idCardNumber?: string;
  isActive: boolean;
  joinDate: string;
  emergencyContact?: string;
  notes?: string;
}

// Master E: Master Satuan dan Kategori Konversi Dimensi
export interface MaterialDimensionConversion {
  materialName: string;
  category: string;
  unit: string;
  gramsPerUnit: number; // Contoh: 1 buah semangka = 3000g, 1 butir telur = 60g, 1 buah pisang = 120g, 1 ikat bayam = 250g
  notes?: string;
}

export interface MasterUnit {
  id: string;
  code: string;
  name: string;
  type: 'Berat' | 'Volume' | 'Satuan Bahan (Pieces/Dimensi)' | 'Kemasan';
  baseUnit: 'gram' | 'ml' | 'satuan';
  conversionToBase: number; // 1 kg = 1000 gram, 1 liter = 1000 ml
  isConfigurable: boolean;
}

// 7. Modul Penerima Manfaat: Kehadiran Harian & Riwayat
export interface BeneficiaryAttendanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  institutionId: string;
  institutionName: string;
  registeredSmall: number;
  registeredLarge: number;
  totalRegistered: number; // registeredSmall + registeredLarge
  absentSmall: number;
  absentLarge: number;
  totalAbsent: number; // absentSmall + absentLarge
  presentSmall: number; // registeredSmall - absentSmall
  presentLarge: number; // registeredLarge - absentLarge
  actualPortions: number; // presentSmall + presentLarge (Total porsi aktual)
  notes?: string;
  recordedBy: string;
  bastConfirmed: boolean;
}

export interface BeneficiaryQuotaHistory {
  id: string;
  timestamp: string;
  institutionId: string;
  institutionName: string;
  previousSmall: number;
  previousLarge: number;
  previousTotal: number;
  newSmall: number;
  newLarge: number;
  newTotal: number;
  deltaTotal: number;
  reason: string;
  updatedBy: string;
}

export interface MenuItem {
  id: string;
  date: string;
  dayName: string;
  cycleWeek: number;
  menuCode: string;
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
  calciumMg?: number;
  ironMg?: number;
  targetPortions: number;
  estimatedCostPerPortion: number;
  status: 'Draft' | 'Diverifikasi Gizi' | 'Disetujui Kepala' | 'Selesai Dimasak';
  approvedBy?: string;
  notes?: string;
  ingredients?: RecipeIngredient[];
}

// Submodul PLOG: Perencanaan Menu, Bahan, Gizi, Food Cost, & Jobdesk Divisi
export interface RecipeIngredient {
  id: string;
  name: string;
  category: string;
  netWeightSmall: number; // gram per porsi kecil (TK/SD 1-3)
  netWeightLarge: number; // gram per porsi besar (SD 4-6/SMP/SMA)
  unit: string;
  ediblePortionPercent: number; // % BDD (Bagian Dapat Dimakan / Edible Portion, e.g. 100%, 75%, 68%)
  conversionFactorToBase: number; // e.g. 1000g = 1 kg (factor 0.001)
  purchaseUnit: string;   // 'kg', 'butir', 'ikat', 'liter'
  unitPrice: number;      // Harga acuan/aktual per purchaseUnit (Rp)
  // Nilai gizi per 100g bahan
  calories100g: number;
  protein100g: number;
  fat100g: number;
  carb100g: number;
  fiber100g: number;
  referenceSource: string; // e.g. "TKPI Kemenkes RI 2020", "USDA FoodData Central"
}

export interface FoodCompositionItem {
  id: string;
  code: string;
  name: string;
  category: string;
  ediblePortion: number; // % BDD
  calories: number;      // kkal per 100g
  protein: number;       // g per 100g
  fat: number;           // g per 100g
  carbs: number;         // g per 100g
  fiber: number;         // g per 100g
  sourceReference: string; // e.g. "TKPI 2020 - Kemenkes RI", "USDA FoodData Central"
  defaultUnitPrice: number;
  purchaseUnit: string;
}

export interface NutritionTargetConfig {
  isConfigured: boolean;
  referenceSource: string;
  smallPortionTarget: {
    caloriesMin: number;
    caloriesMax: number;
    proteinMin: number;
    proteinMax: number;
    fatMin: number;
    fatMax: number;
    carbMin: number;
    carbMax: number;
    fiberMin: number;
    fiberMax: number;
  };
  largePortionTarget: {
    caloriesMin: number;
    caloriesMax: number;
    proteinMin: number;
    proteinMax: number;
    fatMin: number;
    fatMax: number;
    carbMin: number;
    carbMax: number;
    fiberMin: number;
    fiberMax: number;
  };
}

export interface DivisionJobdesk {
  id: string;
  menuId: string;
  menuName: string;
  divisionName: 'Relawan Div. Persiapan' | 'Relawan Div. Pengolahan' | 'Relawan Div. Pemorsian' | 'Relawan Div. Distribusi' | 'Relawan Div. Cuci Ompreng';
  ingredientsHandled: string;
  tasks: string;
  photoUrl: string;
  photoCaption?: string;
  picName: string;
  status: 'Belum Mulai' | 'Sedang Berjalan' | 'Selesai Sesuai Standar';
}

export interface StockBatch {
  id: string;
  batchNumber: string;
  receivedDate: string;
  expiryDate: string;
  initialQty: number;
  remainingQty: number;
  unitPrice: number;
  supplierName: string;
}

export type MutationType =
  | 'Stok Awal'
  | 'Barang Masuk'
  | 'Barang Keluar'
  | 'Retur Keluar'
  | 'Retur Masuk'
  | 'Stok Opname';

export interface StockMutation {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  date: string;
  timestamp: string;
  type: MutationType;
  referenceNumber: string;
  batchNumber?: string;
  expiryDate?: string;
  supplierName?: string;
  unit: string;
  orderedQuantity?: number;
  quantityIn: number;
  quantityOut: number;
  differenceQuantity?: number;
  balance: number; // Stok Akhir setelah mutasi
  unitPrice: number;
  totalPrice: number;
  photoUrl?: string;
  photoUrls?: string[];
  notes: string;
  operatorName: string;
  recipientOrDepartment?: string;
}

export interface StockOpnameRecord {
  id: string;
  opnameNumber: string;
  date: string;
  itemId: string;
  itemName: string;
  unit: string;
  systemStock: number;
  physicalStock: number;
  difference: number; // physical - system
  unitPrice: number;
  differenceValuation: number; // difference * unitPrice
  reason: string;
  inspectorName: string;
  status: 'Menunggu Verifikasi' | 'Disetujui' | 'Ditolak';
  verifiedBy?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Bahan Segar' | 'Bahan Kering' | 'Bumbu & Rempah' | 'Kemasan & Higiene' | 'Pelengkap';
  initialStock: number;
  currentStock: number;
  minimumStock: number;
  unit: string;
  pricePerUnit: number;
  storageLocation: 'Gudang Kering A' | 'Gudang Kering B' | 'Cold Storage 1' | 'Chiller Dapur' | 'Rak Bumbu';
  supplierName: string;
  lastRestocked: string;
  expiryDate: string;
  qualityStatus: 'Baik' | 'Perlu Pemantauan' | 'Kadaluarsa';
  batches?: StockBatch[];
}

// Submodul PLOK: Perencanaan dan Pelaporan Operasional (RAB, PO, QC)
export type RABCategory = 'RAB Bahan Pangan' | 'RAB Operasional';
export type RABApprovalStatus = 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';

export interface RABItem {
  id: string;
  category: RABCategory;
  budgetCode: string; // e.g. "RAB-BP-2026-001", "RAB-OP-2026-002"
  planDate: string;   // YYYY-MM-DD
  periodMonth: string; // e.g. "November 2026"
  itemName: string;
  volume: number;
  unit: string;
  unitPrice: number;
  totalBudget: number; // volume * unitPrice
  notes?: string;
  status: RABApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  poCreatedQuantity?: number;
  poCreatedAmount?: number;
}

export type POStatusPLOK =
  | 'Draft'
  | 'Menunggu persetujuan'
  | 'Disetujui'
  | 'Dikirim ke supplier'
  | 'Sebagian diterima'
  | 'Selesai diterima'
  | 'Ditolak'
  | 'Dibatalkan'
  | 'Menunggu Verifikasi Keuangan'
  | 'Disetujui Kepala'
  | 'Diterima di Gudang';

export type QCStatusPLOK =
  | 'Diterima'
  | 'Diterima sebagian'
  | 'Ditolak'
  | 'Perlu pemeriksaan ulang'
  | 'Belum QC'
  | 'Lolos Penuh'
  | 'Lolos Sebagian';

export interface QualityControlRecord {
  id: string;
  poId: string;
  poNumber: string;
  supplierName: string;
  itemName: string;
  orderedQuantity: number;
  unit: string;
  receivedQuantity: number;
  differenceQuantity?: number;
  condition: 'Baik' | 'Kemasan Cacat' | 'Rusak Ringan' | 'Busuk/Tercemar';
  qualityGrade: 'Grade A (Sangat Baik)' | 'Grade B (Standar)' | 'Afkir (Tidak Layak)';
  receivingTemp?: number;
  expiryDate: string;
  photoUrl?: string;
  photoUrls?: string[];
  notes?: string;
  inspectorName: string;
  status: QCStatusPLOK;
  inspectedAt: string;
  inventoryAdded: boolean;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  rabId?: string;
  receivedQuantity?: number;
}

export interface SupplierDocument {
  id: string;
  type: 'Surat Jalan' | 'Faktur' | 'Sertifikat Halal' | 'Hasil Uji Lab' | 'Foto Bahan';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  supplierName: string;
  supplierContact: string;
  deliveryDate: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  rabId?: string;
  supplierId?: string;
  status: POStatusPLOK;
  qcStatus: QCStatusPLOK;
  qcNotes?: string;
  approvedBy?: string;
  verifiedByFinance?: string;
  notes?: string;
  qcRecords?: QualityControlRecord[];
  // Portal Supplier Interactive Fields
  supplierConfirmed?: boolean;
  supplierConfirmedAt?: string;
  supplierEstimatedDelivery?: string;
  supplierDriverName?: string;
  supplierDriverPhone?: string;
  supplierVehicleNumber?: string;
  supplierDeliveryStatus?: 'Menunggu Konfirmasi' | 'Dikonfirmasi Supplier' | 'Sedang Dipersiapkan' | 'Dalam Pengiriman' | 'Telah Tiba di Gudang' | 'Ditolak Supplier';
  supplierRejectionReason?: string;
  supplierDocuments?: SupplierDocument[];
}

export interface DistributionLog {
  id: string;
  date: string;
  institutionId: string;
  institutionName: string;
  smallPortions: number;
  largePortions: number;
  totalPortions: number;
  vehicleNumber: string;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  foodTempAtDispatch: number;
  foodTempAtArrival?: number;
  receivedBy?: string;
  receiverTitle?: string;
  status: 'Dijadwalkan' | 'Dalam Perjalanan' | 'Tiba di Lokasi' | 'Selesai Serah Terima';
  photoEvidenceUrl?: string;
  bastNumber?: string;
  notes?: string;
}

export type FinancialApprovalStatus = 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak' | 'Dibatalkan';

export type BankAccountType =
  | 'Bank BRI SPPG Yayasan Hafshawaty (0034-01-00291-53-1)'
  | 'Bank Jatim Cab. Kraksaan (0132-99-8812)'
  | 'Kas Tunai Dapur (Petty Cash)'
  | 'Kas Operasional Lapangan';

export interface FinancialTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category:
    | 'Bahan Baku'
    | 'Operasional Dapur'
    | 'Upah Relawan'
    | 'Logistik & Armada'
    | 'Dana Termin BGN'
    | 'Dana Talangan Yayasan'
    | 'Perlengkapan'
    | 'Utilitas Listrik/Gas/Air'
    | 'Higiene & Sanitasi';
  amount: number;
  description: string;
  sourceOrRecipient: string;
  supplierName?: string;
  proofNumber: string;
  recordedBy: string;
  paymentMethod: 'Transfer Bank' | 'Tunai';
  bankAccount: BankAccountType;
  proofFileUrl?: string;
  approvalStatus: FinancialApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  notes?: string;
}

export interface VolunteerAttendance {
  id: string;
  date: string;
  volunteerId: string;
  volunteerName: string;
  division: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan';
  shift: 'Pagi (03:30 - 08:30)' | 'Siang (08:00 - 13:00)';
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  healthCheckPassed: boolean;
  hygieneGearComplete: boolean;
  replacementVolunteer?: string;
  reason?: string;
  notes?: string;
}

export type AbsenceApprovalStatus = 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';

export interface VolunteerAbsenceRecord {
  id: string;
  date: string;
  volunteerId: string;
  volunteerName: string;
  division: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan' | string;
  reason: 'Sakit' | 'Izin Keperluan Keluarga' | 'Tugas Belajar / Kuliah' | 'Kendala Transportasi / Cuaca' | 'Kedukaan' | 'Lainnya';
  reasonDetails?: string;
  replacementVolunteerId?: string;
  replacementVolunteerName: string;
  replacementDivision: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan' | string;
  approvalStatus: AbsenceApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface OfficialLetter {
  id: string;
  letterNumber: string;
  type: 'Surat Masuk' | 'Surat Keluar' | 'Surat Perintah Kerja (SPK)' | 'Berita Acara (BAST)';
  date: string;
  subject: string;
  senderOrReceiver: string;
  category: 'Dinas/BGN' | 'Sekolah/Lembaga' | 'Supplier/Vendor' | 'Internal SPPG';
  status: 'Diterima' | 'Diproses' | 'Terkirim' | 'Selesai Disposisi';
  attachmentUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: RoleType;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'PRINT' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  module: ModuleKey | 'auth' | 'system';
  details: string;
}

export interface KitchenProgress {
  preparation: number;
  cooking: number;
  portioning: number;
  distribution: number;
  washing: number;
  tasteCheckDone: boolean;
  temperatureLogged: boolean;
}

// -------------------------------------------------------------
// MODUL PRODUKSI DAN OPERASIONAL DAPUR (5 DIVISI)
// -------------------------------------------------------------

export interface FacilityTemperatures {
  prepRoomTemp: number; // Legacy fallback key -> dipetakan ke Ruang Pemorsian (°C)
  prepRoomPhoto?: string;
  portioningRoomTemp?: number; // Ruang Pemorsian (°C)
  portioningRoomPhoto?: string;
  cookingRoomTemp: number; // Ruang Pengolahan (°C)
  cookingRoomPhoto?: string;
  wetWarehouseTemp?: number; // Ruang Gudang Basah (°C)
  wetWarehousePhoto?: string;
  dryWarehouseTemp?: number; // Ruang Gudang Kering (°C)
  dryWarehousePhoto?: string;
  freezer1Temp: number; // Freezer 1 Daging/Ayam (-18 s/d -22°C)
  freezer1Photo?: string;
  freezer2Temp: number; // Freezer 2 Ikan/Seafood (-18 s/d -22°C)
  freezer2Photo?: string;
  fridge1Temp: number; // Kulkas 1 Telur (4 s/d 7°C)
  fridge1Photo?: string;
  fridge2Temp: number; // Kulkas 2 Sayuran (5 s/d 8°C)
  fridge2Photo?: string;
  fridge3Temp: number; // Kulkas 3 Buah & Olahan (5 s/d 8°C)
  fridge3Photo?: string;
  fridge4Temp: number; // Kulkas 4 Bumbu Basah (4 s/d 6°C)
  fridge4Photo?: string;
}

export interface DamagedMaterialItem {
  name: string;
  quantity: number;
  unit: string;
  temp: number;
  photoUrl?: string;
}

// A. Divisi Persiapan
export interface PreparationInspectionRecord {
  id: string;
  date: string;
  time: string;
  officerName: string;
  damagedVegetable: DamagedMaterialItem;
  damagedAnimal: DamagedMaterialItem;
  damagedFruit: DamagedMaterialItem;
  facilityTemps: FacilityTemperatures;
  notes: string;
}

// B. Divisi Pengolahan
export interface CookedFoodItem {
  temp: number;
  photoUrl?: string;
  notes?: string;
}

export interface CookingInspectionRecord {
  id: string;
  date: string;
  time: string;
  officerName: string;
  cookedFoods: {
    rice: CookedFoodItem;
    animalProtein: CookedFoodItem;
    plantProtein: CookedFoodItem;
    vegetable: CookedFoodItem;
    fruit: CookedFoodItem;
  };
  facilityTemps: FacilityTemperatures;
  notes: string;
}

// C. Divisi Pemorsian
export interface PortioningInspectionRecord {
  id: string;
  date: string;
  time: string;
  portioningTime: string;
  officerName: string;
  foodTemps: {
    rice: CookedFoodItem;
    animalProtein: CookedFoodItem;
    plantProtein: CookedFoodItem;
    vegetable: CookedFoodItem;
    fruit: CookedFoodItem;
  };
  facilityTemps: FacilityTemperatures;
  smallPortionWeightGrams: number;
  largePortionWeightGrams: number;
  smallPortionPhoto?: string;
  largePortionPhoto?: string;
  notes: string;
}

// D. Divisi Distribusi
export interface DistributionDeliveryRecord {
  id: string;
  date: string;
  institutionId: string;
  institutionName: string;
  smallPortions: number;
  largePortions: number;
  totalPortions: number;
  departureTime: string;
  arrivalTime: string;
  driverName: string;
  vehicleNumber: string;
  activityPhoto?: string;
  handoverPhoto?: string;
  picOrganolepticPhoto?: string;
  bastNumber: string;
  picName: string;
  status: 'Dalam Perjalanan' | 'Tiba di Lokasi' | 'Selesai Serah Terima';
  facilityTemps?: FacilityTemperatures;
  notes: string;
}

export interface OmprengReturnRecord {
  id: string;
  date: string;
  institutionId: string;
  institutionName: string;
  smallPortions: number;
  largePortions: number;
  totalPortions: number;
  departureTime: string;
  arrivalTime: string;
  driverName: string;
  vehicleNumber: string;
  activityPhoto?: string;
  returnHandoverPhoto?: string;
  receivedByOfficer: string;
  conditionStatus: 'Lengkap & Utuh' | 'Ada Selisih' | 'Perlu Perbaikan';
  notes: string;
}

export interface FuelLogRecord {
  id: string;
  date: string;
  time: string;
  vehicleNumber: string;
  driverName: string;
  fuelType: 'Pertalite' | 'Pertamax' | 'Dexlite' | 'Solar';
  nominalCost: number;
  volumeLiters: number;
  odometerKm: number;
  gasStationName: string;
  activityPhoto?: string;
  receiptPhoto?: string;
  notes: string;
}

// E. Divisi Cuci Ompreng & Food Waste Monitoring
export interface WasteItem {
  weight: number;
  unit: string;
  photoUrl?: string;
}

export interface WashingWasteRecord {
  id: string;
  date: string;
  time: string;
  officerName: string;
  wasteRice: WasteItem;
  wasteAnimalProtein: WasteItem;
  wastePlantProtein: WasteItem;
  wasteVegetable: WasteItem;
  wasteFruit: WasteItem;
  totalWasteWeight: number; // in kg
  unit: string;
  facilityTemps?: FacilityTemperatures;
  notes: string;
  sterilizationChecked: boolean;
}

// -------------------------------------------------------------
// 14. MODUL ADMINISTRASI SURAT & 15. MODUL SURAT MASUK
// -------------------------------------------------------------

export type OfficialDocumentType =
  | 'Surat Perjalanan Dinas'
  | 'Surat Tugas'
  | 'Berita Acara Serah Terima'
  | 'Berita Acara Perubahan Penerima Manfaat'
  | 'Berita Acara Kekurangan Bahan'
  | 'Berita Acara Lainnya'
  | 'Surat Undangan'
  | 'Surat Keterangan';

export interface TemplateFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  type?: 'text' | 'date' | 'number' | 'textarea';
}

export interface DocumentTemplate {
  id: string;
  type: OfficialDocumentType;
  codePrefix: string;
  title: string;
  description: string;
  defaultSubject: string;
  templateBody: string;
  fields: TemplateFieldConfig[];
}

export interface OutgoingDocument {
  id: string;
  letterCode: string;
  letterNumber: string;
  type: OfficialDocumentType;
  date: string;
  subject: string;
  recipientName: string;
  recipientInstitution?: string;
  recipientAddress?: string;
  templateId: string;
  mergedBody: string; // Salinan surat hasil mail merge (template asli tidak berubah)
  fieldsData: Record<string, string>;
  signedBy: string;
  signedRole: string;
  status: 'Konsep' | 'Disahkan' | 'Terkirim' | 'Diarsipkan';
  googleDocUrl?: string;
  createdAt: string;
}

export interface IncomingLetter {
  id: string;
  letterNumber: string; // Nomor surat asli dari pengirim
  letterDate: string; // Tanggal surat
  receivedDate: string; // Tanggal diterima di SPPG
  sender: string; // Asal surat
  subject: string; // Perihal
  category: 'Badan Gizi Nasional (BGN)' | 'Dinas / Pemda' | 'Sekolah / Lembaga' | 'Supplier / Vendor' | 'Yayasan / Internal' | 'Umum';
  dispositionTo: string; // Disposisi kepada (Kepala SPPG, Pengawas Gizi, Pengawas Keuangan, Aslap, dll.)
  dispositionInstruction: string; // Instruksi tindak lanjut
  dispositionNotes?: string; // Catatan disposisi
  dispositionDate?: string;
  followUpStatus: 'Diterima' | 'Didisposisikan' | 'Dalam Proses Tindak Lanjut' | 'Selesai Tindak Lanjut' | 'Diarsipkan';
  scannedDocumentUrl?: string; // Scan dokumen / bukti fisik
  recordedBy: string;
}

// 20 Laporan Resmi Pusat Laporan & Cetak SPPG
export type OfficialReportKey =
  | 'bast_distribusi'
  | 'surat_tugas'
  | 'perjalanan_dinas'
  | 'organoleptik_penerima'
  | 'organoleptik_plog'
  | 'sampel_menu'
  | 'flyer_menu'
  | 'penerima_harian'
  | 'informasi_gizi'
  | 'food_cost'
  | 'rab'
  | 'purchase_order'
  | 'quality_control'
  | 'suhu_ruang'
  | 'suhu_makanan_pengolahan'
  | 'suhu_makanan_pemorsian'
  | 'food_waste'
  | 'keuangan'
  | 'kartu_stok'
  | 'rekap_distribusi';

export interface ReportMetaConfig {
  key: OfficialReportKey;
  title: string;
  category: 'Distribusi & Lapangan' | 'Gizi & Menu' | 'Operasional & Rantai Pasok' | 'Dapur & Keamanan Pangan' | 'Keuangan & Tata Usaha';
  codePrefix: string;
  description: string;
  sourceModule: string;
  defaultOrientation: 'portrait' | 'landscape';
  approverRole: string;
}



