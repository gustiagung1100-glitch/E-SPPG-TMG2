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
} from '../types';
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
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchRole: (role: RoleType) => void;
  hasPermission: (module: ModuleKey, action: ActionPermission) => boolean;
  rolePermissions: RolePermissions;
  updateRolePermissions: (permissions: RolePermissions) => void;

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

  distributionLogs: DistributionLog[];
  addDistributionLog: (log: Omit<DistributionLog, 'id'>) => Promise<void>;
  updateDistributionLog: (id: string, log: Partial<DistributionLog>) => Promise<void>;

  financialTransactions: FinancialTransaction[];
  addTransaction: (tx: Omit<FinancialTransaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  volunteerAttendance: VolunteerAttendance[];
  recordAttendance: (att: Omit<VolunteerAttendance, 'id'>) => Promise<void>;
  updateAttendance: (id: string, att: Partial<VolunteerAttendance>) => Promise<void>;

  officialLetters: OfficialLetter[];
  addLetter: (letter: Omit<OfficialLetter, 'id'>) => Promise<void>;
  updateLetter: (id: string, letter: Partial<OfficialLetter>) => Promise<void>;

  auditLogs: AuditLog[];
  logAudit: (action: AuditLog['action'], module: AuditLog['module'], details: string) => Promise<void>;

  kitchenProgress: KitchenProgress;
  updateKitchenProgress: (progress: Partial<KitchenProgress>) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;

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
};

const initialUsers: UserProfile[] = [
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
];

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
    transactionNumber: 'KAS-IN/2026/XI/001',
    date: '2026-11-01',
    type: 'Pemasukan',
    category: 'Dana Termin BGN',
    amount: 384750000,
    description: 'Pencairan Dana Alokasi MBG BGN Termin I November 2026 (25 Hari Operasi x 2.850 Porsi)',
    sourceOrRecipient: 'KPPN Probolinggo / Badan Gizi Nasional',
    proofNumber: 'SP2D-BGN-09823/2026',
    recordedBy: 'M. Farhan, S.E.',
    paymentMethod: 'Transfer Bank',
  },
  {
    id: 'tx-2',
    transactionNumber: 'KAS-OUT/2026/XI/0012',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Bahan Baku',
    amount: 10640000,
    description: 'Pembayaran PO Daging Ayam Fillet Segar 280 kg untuk Menu Minggu 8 Nov 2026',
    sourceOrRecipient: 'PT Unggas Barokah Probolinggo',
    proofNumber: 'KWT-UB-00912',
    recordedBy: 'M. Farhan, S.E.',
    paymentMethod: 'Transfer Bank',
  },
  {
    id: 'tx-3',
    transactionNumber: 'KAS-OUT/2026/XI/0013',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Bahan Baku',
    amount: 5220000,
    description: 'Pembelian Buah Pisang Cavendish Segar 2.900 butir',
    sourceOrRecipient: 'Kebun Pisang Gending',
    proofNumber: 'NOTA-KPG-771',
    recordedBy: 'M. Farhan, S.E.',
    paymentMethod: 'Tunai',
  },
  {
    id: 'tx-4',
    transactionNumber: 'KAS-OUT/2026/XI/0014',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Operasional Dapur',
    amount: 1850000,
    description: 'Refill Tabung Gas LPG 50 kg x 2 Tabung untuk Dapur Pengolahan Utama',
    sourceOrRecipient: 'Agen LPG Pertamina Krejengan',
    proofNumber: 'NOTA-LPG-332',
    recordedBy: 'M. Farhan, S.E.',
    paymentMethod: 'Tunai',
  },
  {
    id: 'tx-5',
    transactionNumber: 'KAS-OUT/2026/XI/0015',
    date: '2026-11-08',
    type: 'Pengeluaran',
    category: 'Logistik & Armada',
    amount: 750000,
    description: 'Bahan Bakar Minyak Dexlite 3 Unit Kendaraan Distribusi SPPG TMG2',
    sourceOrRecipient: 'SPBU Krejengan',
    proofNumber: 'STRUK-SPBU-88192',
    recordedBy: 'M. Farhan, S.E.',
    paymentMethod: 'Tunai',
  },
  {
    id: 'tx-6',
    transactionNumber: 'KAS-OUT/2026/XI/0016',
    date: '2026-11-08',
    type: 'Pengeluaran',
    category: 'Upah Relawan',
    amount: 3500000,
    description: 'Insentif Harian 28 Relawan Dapur & Distribusi Tanggal 8 November 2026',
    sourceOrRecipient: 'Koordinator Relawan SPPG TMG2',
    proofNumber: 'DAFTAR-INSENTIF-0811',
    recordedBy: 'M. Farhan, S.E.',
    paymentMethod: 'Tunai',
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

  // Permission Check
  const hasPermission = (module: ModuleKey, action: ActionPermission): boolean => {
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
    await logAudit('CREATE', 'finance', `Mencatat ${tx.type} Rp ${tx.amount} (${tx.description})`);
    addToast('success', 'Transaksi Tercatat', `Kas ${tx.type} Rp ${tx.amount.toLocaleString('id-ID')} berhasil disimpan.`);
  };

  const deleteTransaction = async (id: string) => {
    setFinancialTransactions(prev => prev.filter(t => t.id !== id));
    await logAudit('DELETE', 'finance', `Menghapus transaksi kas ID: ${id}`);
    addToast('warning', 'Transaksi Dihapus', 'Pencatatan kas telah dihapus.');
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        hasPermission,
        rolePermissions,
        updateRolePermissions,
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
        distributionLogs,
        addDistributionLog,
        updateDistributionLog,
        financialTransactions,
        addTransaction,
        deleteTransaction,
        volunteerAttendance,
        recordAttendance,
        updateAttendance,
        officialLetters,
        addLetter,
        updateLetter,
        auditLogs,
        logAudit,
        kitchenProgress,
        updateKitchenProgress,
        darkMode,
        toggleDarkMode,
        toasts,
        addToast,
        removeToast,
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
