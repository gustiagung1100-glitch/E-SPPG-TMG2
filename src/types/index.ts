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
  | 'Relawan Div. Cuci Ompreng';

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
  | 'settings';

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

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Bahan Segar' | 'Bahan Kering' | 'Bumbu & Rempah' | 'Kemasan & Higiene' | 'Pelengkap';
  currentStock: number;
  minimumStock: number;
  unit: string;
  pricePerUnit: number;
  storageLocation: 'Gudang Kering A' | 'Gudang Kering B' | 'Cold Storage 1' | 'Chiller Dapur' | 'Rak Bumbu';
  supplierName: string;
  lastRestocked: string;
  expiryDate: string;
  qualityStatus: 'Baik' | 'Perlu Pemantauan' | 'Kadaluarsa';
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
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
  status: 'Draft' | 'Menunggu Verifikasi Keuangan' | 'Disetujui Kepala' | 'Ditolak' | 'Diterima di Gudang';
  qcStatus: 'Belum QC' | 'Lolos Penuh' | 'Lolos Sebagian' | 'Ditolak';
  qcNotes?: string;
  approvedBy?: string;
  verifiedByFinance?: string;
  notes?: string;
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

export interface FinancialTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category: 'Bahan Baku' | 'Operasional Dapur' | 'Upah Relawan' | 'Logistik & Armada' | 'Dana Termin BGN' | 'Dana Talangan Yayasan' | 'Perlengkapan';
  amount: number;
  description: string;
  sourceOrRecipient: string;
  proofNumber: string;
  recordedBy: string;
  paymentMethod: 'Transfer Bank' | 'Tunai';
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
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'PRINT' | 'EXPORT' | 'LOGIN';
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
