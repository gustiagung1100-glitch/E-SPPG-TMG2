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
  | 'pic_incentives'
  | 'volunteer_incentives'
  | 'petty_cash'
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

export type RoleModuleAccessMap = Record<RoleType, ModuleKey[]>;

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
  firebaseUid?: string;
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
export type InstitutionJenjangType = 'KB/PAUD' | 'TK' | 'MI' | 'MTs' | 'MA' | 'Posyandu';

export interface Institution {
  id: string;
  name: string;
  institutionType: InstitutionJenjangType | string;
  level: InstitutionJenjangType | string;
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
  customFields?: Record<string, any>;
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
  division: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan' | 'Keamanan';
  position: 'Koordinator Divisi' | 'Wakil Koordinator' | 'Juru Masak / Cook' | 'Asisten Dapur' | 'Petugas Timbang & Packing' | 'Driver Armada' | 'Petugas Sanitasi' | 'Petugas Keamanan';
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
  customFields?: Record<string, any>;
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

export interface BeneficiaryNutritionRecord {
  id: string;
  nik: string;
  fullName: string;
  gender: 'L' | 'P';
  birthDate?: string;
  ageMonths: number;
  institutionId: string;
  institutionName: string;
  classOrGroup: string;
  measurementDate: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  waz: number | null;
  haz: number;
  whz: number;
  whzIndexLabel: 'BB/TB' | 'IMT/U';
  wazCategory: string;
  hazCategory: string;
  whzCategory: string;
  isStunted: boolean;
  isUnderweight: boolean;
  isWasted: boolean;
  isOverweight: boolean;
  primaryStatus: 'Normal' | 'Stunting' | 'Underweight' | 'Wasting' | 'Gizi Lebih';
  severityLevel: 'Aman' | 'Sedang' | 'Berat' | 'Risiko Lebih';
  recommendation: string;
  notes?: string;
  recordedBy: string;
  updatedAt: string;
}

export type MaternalTrimester = 'Trimester I' | 'Trimester II' | 'Trimester III';
export type MaternalBmiCategory = 'Kurus (Underweight)' | 'Normal (Ideal)' | 'Gemuk (Overweight)' | 'Obesitas';
export type MaternalWeightGainStatus = 'Kenaikan Kurang' | 'Sesuai Target' | 'Kenaikan Berlebih';
export type MaternalAnemiaStatus = 'Normal' | 'Anemia Ringan' | 'Anemia Sedang' | 'Anemia Berat';
export type MaternalBpStatus = 'Normal' | 'Pra-Hipertensi / Waspada' | 'Hipertensi / Risiko Preeklamsia';
export type MaternalRiskLevel = 'Normal / Risiko Rendah' | 'Risiko Sedang' | 'Risiko Tinggi';

export interface MaternalHealthRecord {
  id: string;
  nik: string;
  fullName: string;
  ageYears: number;
  phone?: string;
  institutionId: string;
  institutionName: string;
  villageOrPosyandu: string;
  gravida: number;
  para: number;
  abortus: number;
  obstetricCode: string;
  hphtDate?: string;
  gestationalWeeks: number;
  gestationalDaysRemainder: number;
  dueDateHpl?: string;
  trimester: MaternalTrimester;
  prePregnancyWeightKg: number;
  currentWeightKg: number;
  heightCm: number;
  prePregnancyBmi: number;
  bmiCategory: MaternalBmiCategory;
  weightGainKg: number;
  targetWeightGainRange: string;
  weightGainStatus: MaternalWeightGainStatus;
  lilaCm: number;
  isKek: boolean;
  lilaCategory: string;
  hemoglobinGdL: number;
  anemiaStatus: MaternalAnemiaStatus;
  systolicBp: number;
  diastolicBp: number;
  bpStatus: MaternalBpStatus;
  recommendedKcal: number;
  recommendedProteinG: number;
  ttdCompliant: boolean;
  measurementDate: string;
  riskFlags: string[];
  riskLevel: MaternalRiskLevel;
  recommendation: string;
  notes?: string;
  recordedBy: string;
  updatedAt: string;
}

export type LactationPhase =
  | '0–6 Bulan (ASI Eksklusif)'
  | '> 6–12 Bulan (ASI + MP-ASI)'
  | '> 12–24 Bulan (ASI Lanjutan)';
export type LactatingBmiCategory = 'Kurus (Underweight)' | 'Normal (Ideal)' | 'Gemuk (Overweight)' | 'Obesitas';
export type LactatingAnemiaStatus = 'Normal' | 'Anemia Ringan' | 'Anemia Sedang' | 'Anemia Berat';
export type LactatingBpStatus = 'Normal' | 'Pra-Hipertensi / Waspada' | 'Hipertensi Pasca Persalinan';
export type LactationFeedingPattern =
  | 'ASI Eksklusif'
  | 'ASI + MP-ASI'
  | 'ASI Parsial (Campur Sufor)'
  | 'Kesulitan Menyusui';
export type BreastHealthStatus =
  | 'Normal & ASI Lancar'
  | 'Produksi ASI Kurang'
  | 'Bendungan ASI (Bengkak)'
  | 'Mastitis / Puting Lecet';
export type LactatingRiskLevel = 'Normal / Risiko Rendah' | 'Risiko Sedang' | 'Risiko Tinggi';

export interface LactatingHealthRecord {
  id: string;
  nik: string;
  fullName: string;
  ageYears: number;
  phone?: string;
  institutionId: string;
  institutionName: string;
  villageOrPosyandu: string;
  babyName: string;
  deliveryDate: string;
  babyAgeDays: number;
  lactationWeeks: number;
  babyAgeMonths: number;
  lactationPhase: LactationPhase;
  feedingPattern: LactationFeedingPattern;
  breastStatus: BreastHealthStatus;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiCategory: LactatingBmiCategory;
  lilaCm: number;
  isKek: boolean;
  lilaCategory: string;
  hemoglobinGdL: number;
  anemiaStatus: LactatingAnemiaStatus;
  systolicBp: number;
  diastolicBp: number;
  bpStatus: LactatingBpStatus;
  fluidIntakeMl: number;
  targetFluidMl: number;
  isHydrationLow: boolean;
  vitaminAPostpartum: boolean;
  ttdOrMultivitaminCompliant: boolean;
  recommendedKcal: number;
  recommendedProteinG: number;
  measurementDate: string;
  riskFlags: string[];
  riskLevel: LactatingRiskLevel;
  recommendation: string;
  notes?: string;
  recordedBy: string;
  updatedAt: string;
}

export interface MenuItemGrammage {
  id: string;
  categoryKey:
    | 'stapleFood'
    | 'animalProtein'
    | 'plantProtein'
    | 'vegetable'
    | 'fruit'
    | 'milkOrExtra'
    | 'custom';
  categoryLabel: string;
  itemName: string;
  smallGrams: number;
  largeGrams: number;
  notes?: string;
  isManuallyEdited?: boolean;
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
  itemGrammages?: MenuItemGrammage[];
  customFields?: Record<string, any>;
}

// Submodul PLOG: Perencanaan Menu, Bahan, Gizi, Food Cost, & Jobdesk Divisi
export interface RecipeIngredientManualOverrides {
  bddSmall?: number;
  bddLarge?: number;
  bkSmall?: number;
  bkLarge?: number;
  porsiSmall?: number;
  porsiLarge?: number;
  kebutuhanSmall?: number;
  kebutuhanLarge?: number;
  bufferSmall?: number;
  bufferLarge?: number;
  totalSmall?: number;
  totalLarge?: number;
  pembulatanSmall?: number;
  pembulatanLarge?: number;
  unitSmall?: string;
  unitLarge?: string;
  totalKuantiti?: number;
}

export interface RecipeCustomColumn {
  id: string;
  title: string;
  inputType: 'text' | 'textarea' | 'number';
  placeholder?: string;
  createdAt: string;
  createdBy?: string;
}

export interface RecipeIngredient {
  id: string;
  menuName?: string; // Nama hidangan pada kolom MENU
  name: string;
  category: string;
  netWeightSmall: number; // BB porsi kecil (gram per porsi TK/SD 1-3)
  netWeightLarge: number; // BB porsi besar (gram per porsi SD 4-6/SMP/SMA)
  unit: string;
  ediblePortionPercent: number; // % BDD (Bagian Dapat Dimakan / Edible Portion, e.g. 100%, 75%, 68%)
  conversionFactorToBase: number; // e.g. 1000g = 1 kg (factor 0.001)
  purchaseUnit: string;   // 'kg', 'butir', 'ikat', 'liter'
  bufferPercentSmall?: number; // Persentase buffer cadangan porsi kecil (%)
  bufferPercentLarge?: number; // Persentase buffer cadangan porsi besar (%)
  unitPrice: number;      // Harga acuan/aktual per purchaseUnit (Rp)
  // Nilai gizi per 100g bahan
  calories100g: number;
  protein100g: number;
  fat100g: number;
  carb100g: number;
  fiber100g: number;
  referenceSource: string; // e.g. "TKPI Kemenkes RI 2020", "USDA FoodData Central"
  manualOverrides?: RecipeIngredientManualOverrides;
  customRecipeValues?: Record<string, string>;
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
  date?: string;
  updatedAt?: string;
  updatedBy?: string;
  divisionName: 'Relawan Div. Persiapan' | 'Relawan Div. Pengolahan' | 'Relawan Div. Pemorsian' | 'Relawan Div. Distribusi' | 'Relawan Div. Cuci Ompreng';
  ingredientsHandled: string;
  tasks: string;
  photoUrl: string;
  photoUrls?: string[];
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
  qcId?: string;
  customFields?: Record<string, any>;
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
  sourceType?: 'quality_control' | 'manual';
  latestQcId?: string;
  latestPoNumber?: string;
  qcRecordIds?: string[];
  qcTotalReceived?: number;
  customFields?: Record<string, any>;
}

// Submodul PLOK: Perencanaan dan Pelaporan Operasional (RAB, PO, QC)
export type RABCategory = 'RAB Bahan Pangan' | 'RAB Operasional';
export type RABApprovalStatus = 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';

export interface RABRincianItem {
  id: string;
  menuName: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  sourceMenuId?: string;
  sourceMenuCode?: string;
  isManual?: boolean;
}

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
  sourceType?: 'menu_planning' | 'manual' | 'operasional' | 'inventory_alert';
  sourceMenuId?: string;
  sourceMenuCode?: string;
  sourceMenuLabel?: string;
  rincianItems?: RABRincianItem[];
  isRincianManual?: boolean;
  isManualOverride?: boolean;
  sourceIngredientKey?: string;
  customFields?: Record<string, any>;
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
  acceptedStatusAt?: string;
  inventoryAdded: boolean;
}

export type POItemApprovalStatus =
  | 'Menunggu persetujuan'
  | 'Disetujui'
  | 'Ditolak';

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  rabId?: string;
  receivedQuantity?: number;
  category?: 'RAB Bahan Pangan' | 'RAB Operasional';
  approvalStatus?: POItemApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  supplierConfirmed?: boolean;
  supplierConfirmedAt?: string;
  supplierEstimatedDelivery?: string;
  supplierDriverName?: string;
  supplierDriverPhone?: string;
  supplierVehicleNumber?: string;
  supplierDeliveryStatus?: 'Menunggu Konfirmasi' | 'Dikonfirmasi Supplier' | 'Sedang Dipersiapkan' | 'Dalam Pengiriman' | 'Telah Tiba di Gudang' | 'Ditolak Supplier';
  supplierRejectionReason?: string;
  deliveredQuantity?: number;
  deliveredAt?: string;
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
  distributionDate?: string;
  poCategory?: 'Bahan Pangan' | 'Operasional' | 'Gabungan';
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
  registeredSmall?: number;
  registeredLarge?: number;
  absentSmall?: number;
  absentLarge?: number;
  attendanceLogId?: string;
  portionSource?: 'presensi_realtime' | 'kuota_terdaftar';
  customFields?: Record<string, any>;
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
  customFields?: Record<string, any>;
}

export interface VolunteerAttendance {
  id: string;
  date: string;
  volunteerId: string;
  volunteerName: string;
  division: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan' | 'Keamanan';
  shift: 'Pagi (03:30 - 08:30)' | 'Siang (08:00 - 13:00)';
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  healthCheckPassed: boolean;
  hygieneGearComplete: boolean;
  replacementVolunteer?: string;
  reason?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export type AbsenceApprovalStatus = 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';

export interface VolunteerAbsenceRecord {
  id: string;
  date: string;
  volunteerId: string;
  volunteerName: string;
  division: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan' | 'Keamanan' | string;
  reason: 'Sakit' | 'Izin Keperluan Keluarga' | 'Tugas Belajar / Kuliah' | 'Kendala Transportasi / Cuaca' | 'Kedukaan' | 'Lainnya';
  reasonDetails?: string;
  replacementVolunteerId?: string;
  replacementVolunteerName: string;
  replacementDivision: 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng' | 'Kebersihan' | 'Keamanan' | string;
  approvalStatus: AbsenceApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
  customFields?: Record<string, any>;
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
  humidityMap?: Record<string, number>; // Kelembapan (%) per key ruangan/pendingin
  timeMap?: Record<string, string>; // Waktu pencatatan (HH:mm) per key ruangan/pendingin
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
  additionalDamagedItems?: DamagedMaterialItem[];
  facilityTemps?: FacilityTemperatures;
  notes: string;
}

// B. Divisi Pengolahan
export interface CookedFoodItem {
  temp: number;
  photoUrl?: string;
  notes?: string;
  equipment?: string;
  session2Temp?: number;
  session2PhotoUrl?: string;
  session3Temp?: number;
  session3PhotoUrl?: string;
  dangerZone?: string;
  rawWeightGrams?: number;
  rawWeightSmallGrams?: number;
  conversionFactor?: number;
  conversionFactorSmall?: number;
  cookedWeightGrams?: number;
  cookedWeightSmallGrams?: number;
  smallPortionSession1Temp?: number;
  smallPortionSession1PhotoUrl?: string;
  smallPortionSession2Temp?: number;
  smallPortionSession2PhotoUrl?: string;
  smallPortionSession3Temp?: number;
  smallPortionSession3PhotoUrl?: string;
}

export interface CookingItemDetail {
  id: string;
  categoryKey: MenuItemGrammage['categoryKey'];
  categoryLabel: string;
  itemName: string; // Nama item menu terhubung dengan PLOG
  smallGrams: number; // Gramasi porsi kecil (g) terhubung Sub-menu Gramasi Item Menu PLOG
  largeGrams: number; // Gramasi porsi besar (g) terhubung Sub-menu Gramasi Item Menu PLOG
  grammagePhotoUrl?: string; // Foto gramasi item menu (umum)
  grammageSmallPhotoUrl?: string; // Foto penimbangan gramasi porsi kecil
  grammageLargePhotoUrl?: string; // Foto penimbangan gramasi porsi besar
  temp: number; // Suhu matang Sesi 1 (°C)
  photoUrl?: string; // Foto item menu matang (Sesi 1)
  equipment?: string;
  session2Temp?: number;
  session2PhotoUrl?: string;
  session3Temp?: number;
  session3PhotoUrl?: string;
  notes?: string;
}

export interface CookingInspectionRecord {
  id: string;
  date: string;
  time: string;
  officerName: string;
  menuId?: string;
  cookedFoods: {
    rice: CookedFoodItem;
    animalProtein: CookedFoodItem;
    plantProtein: CookedFoodItem;
    vegetable: CookedFoodItem;
    fruit: CookedFoodItem;
  };
  itemEntries?: CookingItemDetail[];
  smallPortionOmprengPhoto?: string;
  largePortionOmprengPhoto?: string;
  facilityTemps?: FacilityTemperatures;
  notes: string;
}

// C. Divisi Pemorsian
export interface PortioningInspectionRecord {
  id: string;
  date: string;
  time: string;
  portioningTime: string;
  officerName: string;
  menuId?: string;
  foodTemps: {
    rice: CookedFoodItem;
    animalProtein: CookedFoodItem;
    plantProtein: CookedFoodItem;
    vegetable: CookedFoodItem;
    fruit: CookedFoodItem;
  };
  facilityTemps?: FacilityTemperatures;
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
  locationPhoto?: string;
  bastNumber: string;
  picName: string;
  status: 'Dalam Perjalanan' | 'Tiba di Lokasi' | 'Selesai Serah Terima';
  facilityTemps?: FacilityTemperatures;
  notes: string;
  registeredSmall?: number;
  registeredLarge?: number;
  absentSmall?: number;
  absentLarge?: number;
  attendanceLogId?: string;
  portionSource?: 'presensi_realtime' | 'kuota_terdaftar';
  customFields?: Record<string, any>;
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
  locationPhoto?: string;
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
  customFields?: Record<string, any>;
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
  type?: 'text' | 'date' | 'number' | 'textarea' | 'time';
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

// 30 Laporan Resmi Pusat Laporan & Cetak SPPG
export type OfficialReportKey =
  | 'bast_distribusi'
  | 'surat_tugas'
  | 'perjalanan_dinas'
  | 'organoleptik_penerima'
  | 'organoleptik_plog'
  | 'checklist_organoleptik_plog'
  | 'sampel_menu'
  | 'flyer_menu'
  | 'penerima_harian'
  | 'informasi_gizi'
  | 'food_cost'
  | 'rab'
  | 'purchase_order'
  | 'quality_control'
  | 'suhu_ruang_pengolahan'
  | 'suhu_ruang_pemorsian'
  | 'suhu_gudang_basah'
  | 'suhu_gudang_kering'
  | 'suhu_freezer_1'
  | 'suhu_freezer_2'
  | 'suhu_chiller_1'
  | 'suhu_chiller_2'
  | 'suhu_chiller_3'
  | 'suhu_chiller_4'
  | 'suhu_makanan_pengolahan'
  | 'suhu_makanan_pemorsian'
  | 'food_waste'
  | 'keuangan'
  | 'kartu_stok'
  | 'rekap_distribusi'
  | 'status_gizi_who';

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

// -------------------------------------------------------------
// DYNAMIC & EDITABLE FORM BUILDER (JSON SCHEMA CONFIGURATION)
// -------------------------------------------------------------
export type DynamicFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'photo';

export interface DynamicFormField {
  id: string;
  key: string;
  label: string;
  type: DynamicFieldType;
  placeholder?: string;
  helperText?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string | number | boolean;
  isSystem?: boolean;
  showInTable?: boolean;
  width?: 'half' | 'full';
}

export type DynamicFormId =
  | 'institution_form'
  | 'beneficiary_attendance_form'
  | 'menu_form'
  | 'distribution_dispatch_form'
  | 'distribution_report_form'
  | 'finance_tx_form'
  | 'volunteer_absence_form'
  | 'volunteer_attendance_form'
  | 'inventory_item_form'
  | 'inventory_mutation_form'
  | 'procurement_rab_form'
  | 'production_waste_form';

export interface DynamicFormSchema {
  formId: DynamicFormId;
  title: string;
  description: string;
  moduleKey: ModuleKey;
  version: number;
  updatedAt: string;
  updatedBy?: string;
  fields: DynamicFormField[];
}

// -------------------------------------------------------------
// MODUL INSENTIF PIC LEMBAGA, INSENTIF RELAWAN & KAS PETTY CASH
// -------------------------------------------------------------

export type PICIncentiveRateMode = 'per_porsi' | 'flat_harian';
export type IncentivePayoutStatus = 'Menunggu Pencairan' | 'Disetujui' | 'Sudah Dibayarkan';

export interface PICInstitutionTariffOverride {
  rateMode: PICIncentiveRateMode;
  unitRate: number;
  minPortionThreshold?: number;
}

export interface PICIncentiveConfig {
  rateMode: PICIncentiveRateMode;
  ratePerPortion: number;
  flatDailyRate: number;
  minPortionThreshold: number;
  institutionRates?: Record<string, PICInstitutionTariffOverride>;
  updatedAt: string;
  updatedBy: string;
}

export interface PICIncentivePayout {
  id: string;
  attendanceLogId: string;
  date: string;
  institutionId: string;
  institutionName: string;
  picName: string;
  picPhone?: string;
  bankName?: string;
  accountNumber?: string;
  bankAccountName?: string;
  registeredPortions: number;
  presentPortions: number;
  rateMode: PICIncentiveRateMode;
  unitRate: number;
  totalIncentive: number;
  status: IncentivePayoutStatus;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  pettyCashTxId?: string;
  notes?: string;
}

export interface VolunteerIncentiveConfig {
  defaultDailyRate: number;
  divisionRates: Record<string, number>;
  positionRates?: Record<string, number>;
  divisionPositionRates?: Record<string, Record<string, number>>;
  updatedAt: string;
  updatedBy: string;
}

export interface VolunteerIncentivePayout {
  id: string;
  attendanceId: string;
  date: string;
  volunteerId: string;
  volunteerName: string;
  division: string;
  shift: string;
  attendanceStatus: VolunteerAttendance['status'];
  isSubstitute?: boolean;
  replacedVolunteerName?: string;
  dailyRate: number;
  totalIncentive: number;
  status: IncentivePayoutStatus;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  pettyCashTxId?: string;
  notes?: string;
}

export type PettyCashCategory =
  | 'Top Up Saldo Kas'
  | 'Dana Operasional Yayasan'
  | 'Belanja Bahan Segar/Darurat'
  | 'Insentif PIC Lembaga'
  | 'Insentif Relawan'
  | 'Gas LPG & Utilitas'
  | 'BBM & Armada'
  | 'Perlengkapan & Sanitasi'
  | 'Lainnya';

export interface PettyCashTransaction {
  id: string;
  voucherNumber: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category: PettyCashCategory | string;
  description: string;
  counterparty: string;
  amount: number;
  recordedBy: string;
  sourceModule?: 'manual' | 'pic_incentives' | 'volunteer_incentives' | 'fuel_logs';
  sourceRefId?: string;
  proofNumber?: string;
  proofFileUrl?: string;
  notes?: string;
  createdAt: string;
  customFields?: Record<string, any>;
}

export type DashboardSectionId =
  | 'welcome_banner'
  | 'critical_alerts'
  | 'beneficiary_kpi'
  | 'today_menu'
  | 'kitchen_progress'
  | 'distribution_status'
  | 'menu_material_adjustment'
  | 'finance_petty_cash'
  | 'inventory_admin_kpi'
  | 'waste_rejected_charts'
  | 'nutrition_who'
  | 'plog_daily_sop';

export type DashboardSectionWidth = 'full' | 'half' | 'third';

export type DashboardDensity = 'compact' | 'comfortable' | 'spacious';

export type DashboardKpiColumns = 'auto' | 2 | 3 | 4 | 5;

export interface DashboardSectionConfig {
  id: DashboardSectionId;
  enabled: boolean;
  width: DashboardSectionWidth;
  allowedRoles: RoleType[];
  allowedEmails: string[];
  blockedEmails: string[];
}

export interface DashboardLayoutConfig {
  sectionOrder: DashboardSectionId[];
  density: DashboardDensity;
  kpiColumns: DashboardKpiColumns;
  sections: Record<DashboardSectionId, DashboardSectionConfig>;
  updatedAt?: string;
  updatedBy?: string;
}
