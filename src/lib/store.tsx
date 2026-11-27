import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  RoleType,
  UserProfile,
  SPPGConfig,
  Institution,
  MenuItem,
  InventoryItem,
  PurchaseOrder,
  PurchaseOrderItem,
  POStatusPLOK,
  QCStatusPLOK,
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
  BeneficiaryNutritionRecord,
  MaternalHealthRecord,
  LactatingHealthRecord,
  BreastHealthStatus,
  LactationFeedingPattern,
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
  RoleModuleAccessMap,
  PICIncentiveConfig,
  PICIncentivePayout,
  VolunteerIncentiveConfig,
  VolunteerIncentivePayout,
  PettyCashTransaction,
  StockMutation,
  StockOpnameRecord,
  MutationType,
  RecipeIngredient,
  RecipeCustomColumn,
  DivisionJobdesk,
  DashboardLayoutConfig,
} from '../types';
import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  buildDefaultDashboardLayoutConfig,
  sanitizeDashboardLayoutConfig,
} from './dashboardConfig';
import {
  defaultDynamicFormSchemas,
  mergeDynamicFormSchemas,
  isDynamicFormAdmin,
} from './dynamicFormSchemas';
import {
  hashLoginPassword,
  getWebAccessEmailDocId,
  isProtectedSuperAdminEmail,
  createSignedAuthSession,
  verifyStoredAuthSession,
  StoredAuthSession,
} from './authCrypto';
import {
  AUTH_SESSION_STORAGE_KEY,
  CURRENT_USER_STORAGE_KEY,
  ROLE_MODULE_ACCESS_STORAGE_KEY,
  LOGIN_PATH,
  canRoleAccessModule,
  buildDefaultRoleModuleAccess,
  sanitizeRoleModuleAccess,
} from './routeGuard';
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
  defaultFacilityTemperatures,
} from './productionData';
import { getDefaultDivisionOfficerName } from './volunteerUtils';
import {
  defaultOutgoingDocuments,
  defaultIncomingLetters,
} from './letterTemplatesData';
import {
  defaultRABItems,
  defaultQualityControlRecords,
} from './plokData';
import {
  defaultInventoryItemsWithBatches,
  defaultStockMutations,
  defaultStockOpnameRecords,
} from './inventoryData';
import {
  sampleIngredientsMenu1,
  defaultDivisionJobdesks,
} from './plogData';
import { initialBeneficiaryNutritionRecords } from './beneficiaryNutritionData';
import { calculateWHOZScore, validateNikFormat, normalizeNik } from './whoZScore';
import { initialMaternalHealthRecords } from './maternalHealthData';
import {
  calculateGestationFromHPHT,
  calculateMaternalHealthAssessment,
} from './maternalHealth';
import { initialLactatingHealthRecords } from './lactatingHealthData';
import {
  calculateLactationDuration,
  calculateLactatingHealthAssessment,
} from './lactatingHealth';
import {
  isMatchingMaterialNameShared,
  normalizeMaterialSyncName,
  buildDailyMenuIngredientKey,
  formatIndonesianPeriodMonth,
  resolveRecipeIngredientFormula,
  getDishLabelFromMenu,
  syncRABWithMenuPlans,
  seedAndSyncDailyPurchaseOrders,
  sortPOItemsBahanThenOperasional,
  resolvePOItemApprovalStatus,
  resolvePOItemSupplierConfirmed,
  resolvePOItemSupplierDeliveryStatus,
  reconcileRABWithPurchaseOrders as reconcileRABWithPurchaseOrdersShared,
  reconcilePurchaseOrdersWithQC,
  reconcileInventoryFromQualityControl,
  isQCAcceptedStatus,
  isMatchingPrepDamagedMaterial,
  resolvePOItemDistributionDate,
  convertDamagedQuantityToPOUnit,
} from './supplyChainSync';
import { toFiniteNumber, toNonNegativeNumber } from './numberUtils';
import { db, auth, getSecondaryAuth, handleFirestoreError, OperationType, sanitizeFirestoreData } from './firebase';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

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
  canSwitchRole: boolean;
  loginWithProfile: (
    user: UserProfile,
    rememberMe?: boolean,
    options?: { isDemoSession?: boolean }
  ) => void;
  logout: () => Promise<void>;
  switchRole: (role: RoleType) => void;
  hasPermission: (module: ModuleKey, action: ActionPermission) => boolean;
  rolePermissions: RolePermissions;
  updateRolePermissions: (permissions: RolePermissions) => void;
  roleModuleAccess: RoleModuleAccessMap;
  updateRoleModuleAccess: (accessMap: RoleModuleAccessMap) => Promise<void>;
  resetRoleModuleAccess: () => Promise<void>;
  dashboardLayoutConfig: DashboardLayoutConfig;
  updateDashboardLayoutConfig: (config: DashboardLayoutConfig) => Promise<void>;
  resetDashboardLayoutConfig: () => Promise<void>;

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
  registerSelfWebAccessUser: (payload: {
    name: string;
    email: string;
    password: string;
    firebaseUid?: string;
  }) => Promise<WebAccessUser | null>;
  updateWebAccessUser: (
    id: string,
    updates: Partial<Omit<WebAccessUser, 'id' | 'passwordHash'>> & { newPassword?: string }
  ) => Promise<boolean>;
  toggleWebAccessStatus: (id: string) => Promise<void>;
  deleteWebAccessUser: (id: string) => Promise<boolean>;
  updateWebAccessPolicy: (policy: Partial<WebAccessPolicy>) => Promise<void>;
  recordWebLoginTimestamp: (email: string) => void;
  findWebAccessUser: (identifier: string) => WebAccessUser | undefined;
  firebaseAuthEmail: string | null;
  syncAllWebAccessToCloud: () => Promise<{ synced: number; failed: number }>;
  connectFirebaseAdminSync: () => Promise<{ ok: boolean; message: string }>;

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

  // 7b. Data Anak, Antropometri & Status Gizi WHO/Kemenkes (Anti-Duplikasi NIK)
  beneficiaryRecords: BeneficiaryNutritionRecord[];
  isDataHydrating: boolean;
  checkDuplicateNik: (nik: string, excludeId?: string) => BeneficiaryNutritionRecord | undefined;
  addBeneficiaryRecord: (input: {
    nik: string;
    fullName: string;
    gender: 'L' | 'P';
    birthDate?: string;
    ageMonths: number;
    institutionId: string;
    classOrGroup: string;
    measurementDate: string;
    weightKg: number;
    heightCm: number;
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string; record?: BeneficiaryNutritionRecord }>;
  updateBeneficiaryRecord: (
    id: string,
    updates: Partial<{
      nik: string;
      fullName: string;
      gender: 'L' | 'P';
      birthDate: string;
      ageMonths: number;
      institutionId: string;
      classOrGroup: string;
      measurementDate: string;
      weightKg: number;
      heightCm: number;
      notes: string;
    }>
  ) => Promise<{ ok: boolean; error?: string; record?: BeneficiaryNutritionRecord }>;
  deleteBeneficiaryRecord: (id: string) => Promise<void>;

  // 8. Kesehatan & Gizi Ibu Hamil (3B)
  maternalHealthRecords: MaternalHealthRecord[];
  checkDuplicateMaternalNik: (nik: string, excludeId?: string) => MaternalHealthRecord | undefined;
  addMaternalHealthRecord: (input: {
    nik: string;
    fullName: string;
    ageYears: number;
    phone?: string;
    institutionId: string;
    institutionNameOverride?: string;
    villageOrPosyandu: string;
    gravida: number;
    para: number;
    abortus: number;
    hphtDate?: string;
    gestationalWeeks: number;
    gestationalDaysRemainder?: number;
    dueDateHpl?: string;
    prePregnancyWeightKg: number;
    currentWeightKg: number;
    heightCm: number;
    lilaCm: number;
    hemoglobinGdL: number;
    systolicBp: number;
    diastolicBp: number;
    ttdCompliant: boolean;
    measurementDate: string;
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string; record?: MaternalHealthRecord }>;
  updateMaternalHealthRecord: (
    id: string,
    updates: Partial<{
      nik: string;
      fullName: string;
      ageYears: number;
      phone: string;
      institutionId: string;
      institutionNameOverride: string;
      villageOrPosyandu: string;
      gravida: number;
      para: number;
      abortus: number;
      hphtDate: string;
      gestationalWeeks: number;
      gestationalDaysRemainder: number;
      dueDateHpl: string;
      prePregnancyWeightKg: number;
      currentWeightKg: number;
      heightCm: number;
      lilaCm: number;
      hemoglobinGdL: number;
      systolicBp: number;
      diastolicBp: number;
      ttdCompliant: boolean;
      measurementDate: string;
      notes: string;
    }>
  ) => Promise<{ ok: boolean; error?: string; record?: MaternalHealthRecord }>;
  deleteMaternalHealthRecord: (id: string) => Promise<void>;

  // 9. Kesehatan & Gizi Ibu Menyusui (3B)
  lactatingHealthRecords: LactatingHealthRecord[];
  checkDuplicateLactatingNik: (nik: string, excludeId?: string) => LactatingHealthRecord | undefined;
  addLactatingHealthRecord: (input: {
    nik: string;
    fullName: string;
    ageYears: number;
    phone?: string;
    institutionId: string;
    institutionNameOverride?: string;
    villageOrPosyandu: string;
    babyName: string;
    deliveryDate: string;
    feedingPattern: LactationFeedingPattern;
    breastStatus: BreastHealthStatus;
    weightKg: number;
    heightCm: number;
    lilaCm: number;
    hemoglobinGdL: number;
    systolicBp: number;
    diastolicBp: number;
    fluidIntakeMl: number;
    vitaminAPostpartum: boolean;
    ttdOrMultivitaminCompliant: boolean;
    measurementDate: string;
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string; record?: LactatingHealthRecord }>;
  updateLactatingHealthRecord: (
    id: string,
    updates: Partial<{
      nik: string;
      fullName: string;
      ageYears: number;
      phone: string;
      institutionId: string;
      institutionNameOverride: string;
      villageOrPosyandu: string;
      babyName: string;
      deliveryDate: string;
      feedingPattern: LactationFeedingPattern;
      breastStatus: BreastHealthStatus;
      weightKg: number;
      heightCm: number;
      lilaCm: number;
      hemoglobinGdL: number;
      systolicBp: number;
      diastolicBp: number;
      fluidIntakeMl: number;
      vitaminAPostpartum: boolean;
      ttdOrMultivitaminCompliant: boolean;
      measurementDate: string;
      notes: string;
    }>
  ) => Promise<{ ok: boolean; error?: string; record?: LactatingHealthRecord }>;
  deleteLactatingHealthRecord: (id: string) => Promise<void>;

  // Operasional Lainnya
  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<MenuItem>;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  approveMenuItem: (id: string, approvedBy: string) => Promise<void>;
  menuIngredientsMap: Record<string, RecipeIngredient[]>;
  updateMenuIngredients: (menuId: string, ingredients: RecipeIngredient[]) => void;
  recipeCustomColumns: RecipeCustomColumn[];
  addRecipeCustomColumn: (
    col: Omit<RecipeCustomColumn, 'id' | 'createdAt' | 'createdBy'>
  ) => RecipeCustomColumn;
  updateRecipeCustomColumn: (
    colId: string,
    patch: Partial<Pick<RecipeCustomColumn, 'title' | 'inputType' | 'placeholder'>>
  ) => void;
  deleteRecipeCustomColumn: (colId: string) => void;
  divisionJobdesks: DivisionJobdesk[];
  updateDivisionJobdesks: (
    updater: DivisionJobdesk[] | ((prev: DivisionJobdesk[]) => DivisionJobdesk[])
  ) => void;

  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number, reason: string) => Promise<void>;

  // Mutasi & Opname Stok Terpusat (Single Source of Truth)
  stockMutations: StockMutation[];
  addStockMutation: (mutation: Omit<StockMutation, 'id' | 'timestamp' | 'balance'> & {
    expiryDate?: string;
    supplierName?: string;
  }) => Promise<StockMutation | null>;
  updateStockMutation: (id: string, updates: Partial<StockMutation>) => Promise<void>;
  stockOpnames: StockOpnameRecord[];
  recordStockOpname: (input: {
    itemId: string;
    physicalStock: number;
    reason: string;
    inspectorName: string;
  }) => Promise<StockOpnameRecord | null>;

  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => Promise<void>;
  updatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => Promise<void>;
  verifyPurchaseOrderFinance: (id: string, verifierName: string) => Promise<void>;
  approvePurchaseOrderHead: (id: string, approverName: string) => Promise<void>;
  updatePOQualityControl: (id: string, qcStatus: PurchaseOrder['qcStatus'], notes: string) => Promise<void>;
  receivePOToWarehouse: (id: string) => Promise<void>;
  syncDailyPOsFromRAB: (targetDate?: string) => Promise<number>;

  // Modul PLOK: RAB & Quality Control
  rabItems: RABItem[];
  addRABItem: (item: Omit<RABItem, 'id' | 'totalBudget'>) => Promise<void>;
  updateRABItem: (id: string, item: Partial<RABItem>) => Promise<void>;
  deleteRABItem: (id: string) => Promise<void>;
  approveRABItem: (id: string, approverName: string) => Promise<void>;
  syncCriticalInventoryToRAB: () => Promise<number>;
  syncAllMenuNeedsToRAB: (targetDate?: string) => Promise<number>;
  syncInventoryFromQualityControl: () => Promise<number>;
  syncMenuNeedsToRAB: (
    menuId: string,
    needs: Array<{
      name: string;
      category: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>
  ) => Promise<number>;
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

  // Modul Baru: Insentif PIC Lembaga (terhubung data harian penerima manfaat)
  picIncentiveConfig: PICIncentiveConfig;
  updatePICIncentiveConfig: (cfg: Partial<PICIncentiveConfig>) => Promise<void>;
  picIncentivePayouts: PICIncentivePayout[];
  upsertPICIncentivePayout: (payout: Omit<PICIncentivePayout, 'id'> & { id?: string }, recordToPettyCash?: boolean) => Promise<void>;
  batchApprovePICIncentives: (items: (Omit<PICIncentivePayout, 'id'> & { id?: string })[]) => Promise<void>;

  // Modul Baru: Insentif Relawan (terhubung data absensi relawan)
  volunteerIncentiveConfig: VolunteerIncentiveConfig;
  updateVolunteerIncentiveConfig: (cfg: Partial<VolunteerIncentiveConfig>) => Promise<void>;
  volunteerIncentivePayouts: VolunteerIncentivePayout[];
  upsertVolunteerIncentivePayout: (payout: Omit<VolunteerIncentivePayout, 'id'> & { id?: string }, recordToPettyCash?: boolean) => Promise<void>;
  batchApproveVolunteerIncentives: (items: (Omit<VolunteerIncentivePayout, 'id'> & { id?: string })[]) => Promise<void>;

  // Modul Baru: Kas Petty Cash (Saldo Awal, Pemasukan, Pengeluaran, Saldo Akhir)
  pettyCashOpeningBalance: number;
  setPettyCashOpeningBalance: (amount: number) => Promise<void>;
  pettyCashTransactions: PettyCashTransaction[];
  addPettyCashTransaction: (tx: Omit<PettyCashTransaction, 'id' | 'createdAt'>) => Promise<PettyCashTransaction>;
  updatePettyCashTransaction: (id: string, tx: Partial<PettyCashTransaction>) => Promise<void>;
  deletePettyCashTransaction: (id: string) => Promise<void>;

  volunteerAttendance: VolunteerAttendance[];
  recordAttendance: (att: Omit<VolunteerAttendance, 'id'>) => Promise<void>;
  updateAttendance: (id: string, att: Partial<VolunteerAttendance>) => Promise<void>;
  syncVolunteerAttendanceFromMaster: (date: string) => Promise<{ createdCount: number; updatedCount: number }>;

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
  supplierConfirmPOItem: (poId: string, itemMatch: { itemId?: string; itemName: string }, estimatedDelivery: string, driverName?: string, driverPhone?: string, vehicleNumber?: string) => Promise<void>;
  supplierUpdatePOItemStatus: (poId: string, itemMatch: { itemId?: string; itemName: string }, status: NonNullable<PurchaseOrder['supplierDeliveryStatus']>, notes?: string) => Promise<void>;
  supplierRejectPOItem: (poId: string, itemMatch: { itemId?: string; itemName: string }, reason: string) => Promise<void>;
  supplierResetPOItem: (poId: string, itemMatch: { itemId?: string; itemName: string }) => Promise<void>;
  supplierReducePOItemQuantity: (poId: string, itemMatch: { itemId?: string; itemName: string }, newOrderedQty: number, notes?: string) => Promise<void>;
  supplierCoverPOItemShortage: (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    addedQty: number,
    options?: {
      deliveredAt?: string;
      condition?: QualityControlRecord['condition'];
      qualityGrade?: QualityControlRecord['qualityGrade'];
      notes?: string;
    }
  ) => Promise<void>;
  supplierEditDeliveredPOItem: (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    payload: {
      deliveredAt: string;
      orderedQuantity: number;
      deliveredQuantity: number;
      qcPassedQuantity?: number;
      damagedQuantity?: number;
      status: QCStatusPLOK;
      notes?: string;
    }
  ) => Promise<void>;
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
  addCookingRecord: (rec: Omit<CookingInspectionRecord, 'id'>) => Promise<CookingInspectionRecord>;
  updateCookingRecord: (id: string, rec: Partial<CookingInspectionRecord>) => Promise<void>;

  portioningRecords: PortioningInspectionRecord[];
  addPortioningRecord: (rec: Omit<PortioningInspectionRecord, 'id'>) => Promise<void>;
  updatePortioningRecord: (id: string, rec: Partial<PortioningInspectionRecord>) => Promise<void>;

  distributionDeliveries: DistributionDeliveryRecord[];
  addDistributionDelivery: (rec: Omit<DistributionDeliveryRecord, 'id'>) => Promise<void>;
  updateDistributionDelivery: (id: string, rec: Partial<DistributionDeliveryRecord>) => Promise<void>;

  omprengReturns: OmprengReturnRecord[];
  addOmprengReturn: (rec: Omit<OmprengReturnRecord, 'id'>) => Promise<void>;
  updateOmprengReturn: (id: string, rec: Partial<OmprengReturnRecord>) => Promise<void>;

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
  smallPortionBudget: 8000,
  largePortionBudget: 10000,
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
    deliveryDate: '2026-11-07',
    distributionDate: '2026-11-08',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-2',
    items: [
      { itemId: 'inv-2', itemName: 'Daging Ayam Broiler Fillet Dada Segar', quantity: 250, unit: 'kg', unitPrice: 38000, subtotal: 9500000, rabId: 'rab-2', receivedQuantity: 250, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 9500000,
    status: 'Selesai diterima',
    qcStatus: 'Diterima',
    qcNotes: 'Suhu tiba 2.8°C, bau segar alami, potongan seragam bersih tanpa lemak berlebih.',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Pengiriman batch H-1 (menu 2026-11-08) dari alokasi RAB-BP-2026-11-002.',
    supplierConfirmed: true,
    supplierConfirmedAt: '2026-11-07 14:00',
    supplierEstimatedDelivery: '2026-11-07 18:30 WIB',
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
    date: '2026-11-06',
    supplierName: 'Koperasi Tani Makmur Krejengan',
    supplierContact: 'H. Abdurrahman - 0852-3344-9988',
    deliveryDate: '2026-11-07',
    distributionDate: '2026-11-08',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-1',
    items: [
      { itemId: 'inv-1', itemName: 'Beras Pulen Wangi Standar BGN (50kg)', quantity: 1800, unit: 'kg', unitPrice: 14500, subtotal: 26100000, rabId: 'rab-1', receivedQuantity: 1800, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 26100000,
    status: 'Selesai diterima',
    qcStatus: 'Diterima',
    qcNotes: 'Kadar air < 14%, butir utuh > 95%, bebas kutu dan batu kecil.',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Pengadaan beras gelombang 1 dari RAB-BP-2026-11-001.',
    supplierConfirmed: true,
    supplierConfirmedAt: '2026-11-06 11:30',
    supplierEstimatedDelivery: '2026-11-07 14:00 WIB',
    supplierDriverName: 'Sugiarto',
    supplierDriverPhone: '0852-9988-1122',
    supplierVehicleNumber: 'N 8140 DR',
    supplierDeliveryStatus: 'Telah Tiba di Gudang',
  },
  {
    id: 'po-3',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0087',
    date: '2026-11-06',
    supplierName: 'Kebun Pisang Gending',
    supplierContact: 'Moch. Mansur - 0819-2233-4455',
    deliveryDate: '2026-11-07',
    distributionDate: '2026-11-08',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-5',
    items: [
      { itemId: 'inv-6', itemName: 'Pisang Cavendish Masak Pohon', quantity: 250, unit: 'kg', unitPrice: 13500, subtotal: 3375000, rabId: 'rab-5', receivedQuantity: 250, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 3375000,
    status: 'Selesai diterima',
    qcStatus: 'Diterima',
    qcNotes: 'Tingkat kematangan 85%, kulit mulus tanpa memar.',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Distribusi untuk menu siklus minggu ke-2 dari RAB-BP-2026-11-005.',
    supplierConfirmed: true,
    supplierConfirmedAt: '2026-11-06 13:00',
    supplierEstimatedDelivery: '2026-11-07 05:00 WIB',
    supplierDriverName: 'Moch. Mansur',
    supplierDriverPhone: '0819-2233-4455',
    supplierVehicleNumber: 'N 7721 GD',
    supplierDeliveryStatus: 'Telah Tiba di Gudang',
  },
  {
    id: 'po-5',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0090',
    date: '2026-11-07',
    supplierName: 'CV Segar Sayur Bromo',
    supplierContact: 'Ibu Endang - 0813-5566-7788',
    deliveryDate: '2026-11-07',
    distributionDate: '2026-11-08',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-4',
    items: [
      { itemId: 'inv-4', itemName: 'Wortel & Buncis Segar Dataran Tinggi', quantity: 220, unit: 'kg', unitPrice: 12000, subtotal: 2640000, rabId: 'rab-4', receivedQuantity: 210, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 2640000,
    status: 'Sebagian diterima',
    qcStatus: 'Diterima sebagian',
    qcNotes: '210 kg diterima baik, 10 kg wortel berlendir ditolak.',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Pasokan sayur segar H-1 (menu 2026-11-08) dari RAB-BP-2026-11-004.',
    supplierConfirmed: true,
    supplierConfirmedAt: '2026-11-07 15:00',
    supplierEstimatedDelivery: '2026-11-07 17:30 WIB',
    supplierDeliveryStatus: 'Telah Tiba di Gudang',
  },
  {
    id: 'po-6',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0092',
    date: '2026-11-06',
    supplierName: 'Peternakan Ayam Barokah Pajarakan',
    supplierContact: 'H. Yusuf - 0812-4455-6677',
    deliveryDate: '2026-11-07',
    distributionDate: '2026-11-08',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-3',
    items: [
      { itemId: 'inv-3', itemName: 'Telur Ayam Ras Grade A Segar', quantity: 180, unit: 'kg', unitPrice: 27500, subtotal: 4950000, rabId: 'rab-3', receivedQuantity: 180, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 4950000,
    status: 'Selesai diterima',
    qcStatus: 'Diterima',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Telur segar grade A dari RAB-BP-2026-11-003.',
    supplierConfirmed: true,
    supplierDeliveryStatus: 'Telah Tiba di Gudang',
  },
  {
    id: 'po-7',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0093',
    date: '2026-11-04',
    supplierName: 'Distributor Resmi Susu Nasional',
    supplierContact: 'CS Susu MBG - 0811-3344-5566',
    deliveryDate: '2026-11-07',
    distributionDate: '2026-11-08',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-6',
    items: [
      { itemId: 'inv-7', itemName: 'Susu UHT Plain / Cokelat 125ml', quantity: 4800, unit: 'pcs', unitPrice: 3600, subtotal: 17280000, rabId: 'rab-6', receivedQuantity: 4800, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 17280000,
    status: 'Selesai diterima',
    qcStatus: 'Diterima',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Susu UHT kemasan 125ml dari RAB-BP-2026-11-006.',
    supplierConfirmed: true,
    supplierDeliveryStatus: 'Telah Tiba di Gudang',
  },
  {
    id: 'po-4',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0091',
    date: '2026-11-09',
    supplierName: 'PT Unggas Barokah Probolinggo',
    supplierContact: 'H. Suwandi - 0812-7788-9911',
    deliveryDate: '2026-11-09',
    distributionDate: '2026-11-10',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-2',
    items: [
      { itemId: 'inv-2', itemName: 'Daging Ayam Broiler Fillet Dada Segar', quantity: 290, unit: 'kg', unitPrice: 38000, subtotal: 11020000, rabId: 'rab-2', receivedQuantity: 0, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 11020000,
    status: 'Dikirim ke supplier',
    qcStatus: 'Belum QC',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Kebutuhan pasokan ayam potong segar untuk menu hari Selasa, 10 November 2026 (RAB-BP-2026-11-002). Target kirim H-1 (2026-11-09). Siap dilakukan QC kedatangan.',
    supplierConfirmed: true,
    supplierDeliveryStatus: 'Dalam Pengiriman',
  },
  {
    id: 'po-8',
    poNumber: 'PO/SPPG-TMG2/2026/XI/0094',
    date: '2026-11-09',
    supplierName: 'Koperasi Tani Makmur Krejengan',
    supplierContact: 'H. Abdurrahman - 0852-3344-9988',
    deliveryDate: '2026-11-09',
    distributionDate: '2026-11-10',
    poCategory: 'Bahan Pangan',
    rabId: 'rab-1',
    items: [
      { itemId: 'inv-1', itemName: 'Beras Pulen Wangi Standar BGN (50kg)', quantity: 1000, unit: 'kg', unitPrice: 14500, subtotal: 14500000, rabId: 'rab-1', receivedQuantity: 0, category: 'RAB Bahan Pangan' },
    ],
    totalAmount: 14500000,
    status: 'Dikirim ke supplier',
    qcStatus: 'Belum QC',
    approvedBy: 'Dr. H. Ahmad Zaini, S.Pd.',
    verifiedByFinance: 'M. Farhan, S.E.',
    notes: 'Pengadaan beras gelombang 2 untuk menu 10 November 2026 (RAB-BP-2026-11-001). Target kirim H-1 (2026-11-09). Menunggu pemeriksaan QC kedatangan.',
    supplierConfirmed: true,
    supplierDeliveryStatus: 'Dalam Pengiriman',
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

const defaultPICIncentiveConfig: PICIncentiveConfig = {
  rateMode: 'per_porsi',
  ratePerPortion: 200,
  flatDailyRate: 50000,
  minPortionThreshold: 1,
  institutionRates: {},
  updatedAt: '2026-11-08 07:00:00',
  updatedBy: 'M. Farhan Al-Hafshi, S.E.',
};

const defaultVolunteerIncentiveConfig: VolunteerIncentiveConfig = {
  defaultDailyRate: 100000,
  divisionRates: {
    Persiapan: 100000,
    Pengolahan: 115000,
    Pemorsian: 100000,
    Distribusi: 110000,
    'Cuci Ompreng': 95000,
    Kebersihan: 90000,
    Keamanan: 95000,
  },
  positionRates: {},
  divisionPositionRates: {},
  updatedAt: '2026-11-08 07:00:00',
  updatedBy: 'M. Farhan Al-Hafshi, S.E.',
};

const DEFAULT_PETTY_CASH_OPENING_BALANCE = 15000000;

const initialPettyCashTransactions: PettyCashTransaction[] = [
  {
    id: 'pc-1',
    voucherNumber: 'BKM-PC/SPPG-TMG2/2026/XI/001',
    date: '2026-11-06',
    type: 'Pemasukan',
    category: 'Top Up Saldo Kas',
    description: 'Pengisian Kas Kecil Operasional Dapur SPPG TMG2 Minggu II Nov 2026',
    counterparty: 'Bendahara Yayasan Hafshawaty',
    amount: 10000000,
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    sourceModule: 'manual',
    proofNumber: 'TRF-YYS-0881',
    notes: 'Top up likuiditas petty cash untuk belanja darurat, gas, BBM, dan insentif harian.',
    createdAt: '2026-11-06 08:15:00',
  },
  {
    id: 'pc-2',
    voucherNumber: 'BKK-PC/SPPG-TMG2/2026/XI/001',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Gas LPG & Utilitas',
    description: 'Refill Tabung Gas LPG 50 kg x 2 Tabung Dapur Pengolahan Utama',
    counterparty: 'Agen LPG Pertamina Krejengan',
    amount: 1850000,
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    sourceModule: 'manual',
    proofNumber: 'NOTA-LPG-332',
    notes: 'Kebutuhan bahan bakar masak siklus 3 hari ke depan.',
    createdAt: '2026-11-07 16:45:00',
  },
  {
    id: 'pc-3',
    voucherNumber: 'BKK-PC/SPPG-TMG2/2026/XI/002',
    date: '2026-11-07',
    type: 'Pengeluaran',
    category: 'Belanja Bahan Segar/Darurat',
    description: 'Pembelian Bumbu Dapur Segar & Daun Jeruk Tambahan 15 kg',
    counterparty: 'Pasar Baru Krejengan',
    amount: 425000,
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    sourceModule: 'manual',
    proofNumber: 'KWT-PBK-119',
    notes: 'Kekurangan bumbu segar untuk batch pengolahan kloter pagi.',
    createdAt: '2026-11-07 17:20:00',
  },
  {
    id: 'pc-4',
    voucherNumber: 'BKK-PC/SPPG-TMG2/2026/XI/003',
    date: '2026-11-08',
    type: 'Pengeluaran',
    category: 'BBM & Armada',
    description: 'BBM Dexlite 3 Unit Kendaraan Distribusi Box Isothermal SPPG TMG2',
    counterparty: 'SPBU Krejengan Probolinggo',
    amount: 750000,
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    sourceModule: 'manual',
    proofNumber: 'STRUK-SPBU-88192',
    notes: 'Klaim BBM armada rute timur dan barat tanggal 8 Nov 2026.',
    createdAt: '2026-11-08 07:30:00',
  },
  {
    id: 'pc-5',
    voucherNumber: 'BKK-PC/SPPG-TMG2/2026/XI/004',
    date: '2026-11-08',
    type: 'Pengeluaran',
    category: 'Perlengkapan & Sanitasi',
    description: 'Pembelian Sabun Food Grade, Cairan Desinfektan & Tisu Dapur Steril',
    counterparty: 'Toko Kebersihan Berkah Kraksaan',
    amount: 540000,
    recordedBy: 'M. Farhan Al-Hafshi, S.E.',
    sourceModule: 'manual',
    proofNumber: 'NOTA-TBK-204',
    notes: 'Stok sanitasi ruang cuci ompreng dan pemorsian.',
    createdAt: '2026-11-08 11:10:00',
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
    volunteerName: 'Lina Marlina',
    division: 'Pemorsian',
    reason: 'Izin Keperluan Keluarga',
    reasonDetails: 'Menghadiri wisuda adik kandung di Kraksaan',
    replacementVolunteerId: 'vol-05',
    replacementVolunteerName: 'Nurul Hidayati',
    replacementDivision: 'Pemorsian',
    approvalStatus: 'Disetujui',
    approvedBy: 'Siti Aminah, S.Gz.',
    approvedAt: '2026-11-08 19:30:00',
    notes: 'Surat permohonan izin diajukan H-1, pengganti dari Master Relawan telah konfirmasi sanggup hadir.',
    createdAt: '2026-11-08 16:00:00',
  },
  {
    id: 'abs-3',
    date: '2026-11-10',
    volunteerId: 'vol-07',
    volunteerName: 'Agus Santoso',
    division: 'Distribusi',
    reason: 'Kendala Transportasi / Cuaca',
    reasonDetails: 'Perbaikan motor operasional pribadi',
    replacementVolunteerId: 'vol-08',
    replacementVolunteerName: 'Kholifah',
    replacementDivision: 'Cuci Ompreng',
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


const AppContext = createContext<AppContextType | undefined>(undefined);

export const GUEST_UNAUTHENTICATED_USER: UserProfile = {
  uid: 'guest-unauthenticated',
  name: 'Pengguna Belum Masuk',
  email: '',
  role: 'Relawan Div. Cuci Ompreng',
  isActive: false,
};

function clearStoredSessionStorage() {
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

function readStoredWebAccessUsers(): WebAccessUser[] {
  try {
    const saved = localStorage.getItem('esppg_web_access_users_v1');
    if (!saved) return buildDefaultWebAccessUsers();
    return mergeProtectedAdmins(JSON.parse(saved));
  } catch {
    return buildDefaultWebAccessUsers();
  }
}

function readStoredWebAccessPolicy(): WebAccessPolicy {
  try {
    const saved = localStorage.getItem('esppg_web_access_policy_v1');
    if (!saved) return DEFAULT_WEB_ACCESS_POLICY;
    return { ...DEFAULT_WEB_ACCESS_POLICY, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_WEB_ACCESS_POLICY;
  }
}

function resolveDivisionForRole(role: RoleType, explicitDivision?: string): string | undefined {
  if (explicitDivision && explicitDivision.trim()) return explicitDivision.trim();
  const map: Partial<Record<RoleType, string>> = {
    'Relawan Div. Persiapan': 'Persiapan',
    'Relawan Div. Pengolahan': 'Pengolahan',
    'Relawan Div. Pemorsian': 'Pemorsian',
    'Relawan Div. Distribusi': 'Distribusi',
    'Relawan Div. Cuci Ompreng': 'Cuci Ompreng',
  };
  return map[role];
}

function validateStoredSessionAgainstPolicy(
  usersList: WebAccessUser[],
  policy: WebAccessPolicy
): { session: StoredAuthSession; user: UserProfile; isOriginAdmin: boolean } | null {
  try {
    const localSess = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    const tabSess = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    const raw = localSess || tabSess;
    if (!raw) return null;

    const verified = verifyStoredAuthSession(JSON.parse(raw));
    if (!verified) {
      clearStoredSessionStorage();
      return null;
    }

    const emailLower = verified.email.toLowerCase();
    const isSuperAdmin = isProtectedSuperAdminEmail(emailLower);

    if (verified.isDemoSession) {
      if (!policy.allowDemoPreview) {
        clearStoredSessionStorage();
        return null;
      }
      let savedUser: UserProfile | null = null;
      try {
        const rawUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (rawUser) savedUser = JSON.parse(rawUser);
      } catch {
        savedUser = null;
      }
      const matchedDemo = initialUsers.find(u => u.email.toLowerCase() === emailLower);
      const demoRole = (matchedDemo?.role || verified.role) as RoleType;
      const isOriginAdmin = demoRole === 'Admin Utama' || isSuperAdmin;
      const demoProfile: UserProfile =
        isOriginAdmin && savedUser && savedUser.isActive
          ? savedUser
          : matchedDemo || {
              uid: verified.uid,
              name: verified.email.split('@')[0],
              email: verified.email,
              role: demoRole,
              isActive: true,
            };
      return { session: verified, user: demoProfile, isOriginAdmin };
    }

    const webEntry = usersList.find(u => u.email.trim().toLowerCase() === emailLower);

    if (webEntry) {
      if (!webEntry.isActive && !isSuperAdmin) {
        clearStoredSessionStorage();
        return null;
      }
      const effectiveRole: RoleType = isSuperAdmin ? 'Admin Utama' : webEntry.role;
      let savedUser: UserProfile | null = null;
      try {
        const rawUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (rawUser) savedUser = JSON.parse(rawUser);
      } catch {
        savedUser = null;
      }
      const isOriginAdmin = effectiveRole === 'Admin Utama' || isSuperAdmin;
      const activeProfile: UserProfile =
        isOriginAdmin && savedUser && savedUser.isActive
          ? savedUser
          : {
              uid: verified.uid,
              name: webEntry.name,
              email: webEntry.email,
              role: effectiveRole,
              division: webEntry.division,
              supplierId: webEntry.supplierId,
              supplierName: webEntry.supplierName,
              isActive: webEntry.isActive,
            };
      return { session: verified, user: activeProfile, isOriginAdmin };
    }

    if (policy.strictWhitelistOnly && !isSuperAdmin) {
      clearStoredSessionStorage();
      return null;
    }

    let savedUser: UserProfile | null = null;
    try {
      const rawUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (rawUser) savedUser = JSON.parse(rawUser);
    } catch {
      savedUser = null;
    }

    const fallbackRole = (isSuperAdmin ? 'Admin Utama' : verified.role) as RoleType;
    const isOriginAdmin = fallbackRole === 'Admin Utama' || isSuperAdmin;
    const userProfile: UserProfile =
      savedUser && savedUser.email?.toLowerCase() === emailLower && savedUser.isActive
        ? savedUser
        : {
            uid: verified.uid,
            name: verified.email.split('@')[0],
            email: verified.email,
            role: fallbackRole,
            isActive: true,
          };

    return { session: verified, user: userProfile, isOriginAdmin };
  } catch {
    clearStoredSessionStorage();
    return null;
  }
}

// =============================================================================
// REAL-TIME CROSS-MODULE DATA SYNCHRONIZATION HELPERS
// =============================================================================
export const normalizeSyncName = normalizeMaterialSyncName;
export const isMatchingMaterialName = isMatchingMaterialNameShared;
const reconcileRABWithPurchaseOrders = reconcileRABWithPurchaseOrdersShared;

function buildDefaultMenuIngredientsMap(): Record<string, RecipeIngredient[]> {
  return {
    'menu-1': sampleIngredientsMenu1,
    'menu-2': [
      {
        id: 'ing-201',
        name: 'Beras Kuning Kunyit',
        category: 'Makanan Pokok',
        netWeightSmall: 85,
        netWeightLarge: 125,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 15500,
        calories100g: 365,
        protein100g: 6.9,
        fat100g: 1.2,
        carb100g: 78.0,
        fiber100g: 1.0,
        referenceSource: 'TKPI 2020 (A01)',
      },
      {
        id: 'ing-202',
        name: 'Daging Sapi Murni Suwir',
        category: 'Lauk Hewani',
        netWeightSmall: 45,
        netWeightLarge: 70,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 125000,
        calories100g: 201,
        protein100g: 20.0,
        fat100g: 13.0,
        carb100g: 0.0,
        fiber100g: 0.0,
        referenceSource: 'TKPI 2020 (B01)',
      },
      {
        id: 'ing-203',
        name: 'Perkedel Tempe Rempah',
        category: 'Lauk Nabati',
        netWeightSmall: 40,
        netWeightLarge: 60,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 12000,
        calories100g: 193,
        protein100g: 20.8,
        fat100g: 8.8,
        carb100g: 13.5,
        fiber100g: 1.4,
        referenceSource: 'TKPI 2020 (C02)',
      },
      {
        id: 'ing-204',
        name: 'Tumis Buncis & Jagung Pipil',
        category: 'Sayuran',
        netWeightSmall: 60,
        netWeightLarge: 90,
        unit: 'gram',
        ediblePortionPercent: 90,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 14000,
        calories100g: 63,
        protein100g: 2.6,
        fat100g: 0.8,
        carb100g: 14.0,
        fiber100g: 2.7,
        referenceSource: 'TKPI 2020 (D06 & D09)',
      },
      {
        id: 'ing-205',
        name: 'Semangka Merah Manis',
        category: 'Buah Segar',
        netWeightSmall: 100,
        netWeightLarge: 140,
        unit: 'gram',
        ediblePortionPercent: 54,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 7500,
        calories100g: 30,
        protein100g: 0.6,
        fat100g: 0.2,
        carb100g: 7.6,
        fiber100g: 0.4,
        referenceSource: 'TKPI 2020 (E18)',
      },
      {
        id: 'ing-206',
        name: 'Puding Kacang Hijau Santan Encer',
        category: 'Ekstra / Susu',
        netWeightSmall: 75,
        netWeightLarge: 100,
        unit: 'pcs',
        ediblePortionPercent: 100,
        conversionFactorToBase: 1,
        purchaseUnit: 'pcs',
        unitPrice: 2800,
        calories100g: 110,
        protein100g: 4.0,
        fat100g: 2.5,
        carb100g: 18.0,
        fiber100g: 1.8,
        referenceSource: 'TKPI Kemenkes RI',
      },
    ],
    'menu-3': [
      {
        id: 'ing-301',
        name: 'Beras Pulen Wangi',
        category: 'Makanan Pokok',
        netWeightSmall: 85,
        netWeightLarge: 125,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 14500,
        calories100g: 360,
        protein100g: 6.8,
        fat100g: 0.7,
        carb100g: 78.9,
        fiber100g: 0.8,
        referenceSource: 'TKPI 2020 (A01)',
      },
      {
        id: 'ing-302',
        menuName: 'Ikan Tenggiri / Kakap Asam Manis Nanas',
        name: 'Ikan Tenggiri Fillet Segar',
        category: 'Lauk Hewani',
        netWeightSmall: 55,
        netWeightLarge: 80,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 54000,
        calories100g: 112,
        protein100g: 21.4,
        fat100g: 2.3,
        carb100g: 0.0,
        fiber100g: 0.0,
        referenceSource: 'TKPI 2020 (B11)',
      },
      {
        id: 'ing-303',
        menuName: 'Ikan Tenggiri / Kakap Asam Manis Nanas',
        name: 'Nanas Segar',
        category: 'Lauk Hewani',
        netWeightSmall: 20,
        netWeightLarge: 30,
        unit: 'gram',
        ediblePortionPercent: 53,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 12000,
        calories100g: 40,
        protein100g: 0.6,
        fat100g: 0.3,
        carb100g: 9.9,
        fiber100g: 1.4,
        referenceSource: 'TKPI 2020 (E10)',
      },
      {
        id: 'ing-304',
        name: 'Tahu Putih Kedelai',
        category: 'Lauk Nabati',
        netWeightSmall: 45,
        netWeightLarge: 65,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 10000,
        calories100g: 80,
        protein100g: 10.9,
        fat100g: 4.7,
        carb100g: 0.8,
        fiber100g: 0.1,
        referenceSource: 'TKPI 2020 (C01)',
      },
      {
        id: 'ing-305',
        menuName: 'Capcay Kuah Segar Bakso Sapi & Brokoli',
        name: 'Brokoli & Wortel Segar',
        category: 'Sayuran',
        netWeightSmall: 50,
        netWeightLarge: 75,
        unit: 'gram',
        ediblePortionPercent: 82,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 18000,
        calories100g: 35,
        protein100g: 1.9,
        fat100g: 0.5,
        carb100g: 7.1,
        fiber100g: 1.7,
        referenceSource: 'TKPI 2020 (D12 & D24)',
      },
      {
        id: 'ing-306',
        menuName: 'Capcay Kuah Segar Bakso Sapi & Brokoli',
        name: 'Bakso Daging Sapi',
        category: 'Sayuran',
        netWeightSmall: 20,
        netWeightLarge: 30,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 68000,
        calories100g: 202,
        protein100g: 13.4,
        fat100g: 9.0,
        carb100g: 16.5,
        fiber100g: 0.2,
        referenceSource: 'TKPI 2020 (B02)',
      },
      {
        id: 'ing-307',
        name: 'Jeruk Manis Probolinggo',
        category: 'Buah Segar',
        netWeightSmall: 80,
        netWeightLarge: 110,
        unit: 'gram',
        ediblePortionPercent: 72,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 18000,
        calories100g: 45,
        protein100g: 0.9,
        fat100g: 0.2,
        carb100g: 11.2,
        fiber100g: 1.4,
        referenceSource: 'TKPI 2020 (E06)',
      },
      {
        id: 'ing-308',
        name: 'Susu UHT Plain 125ml',
        category: 'Ekstra / Susu',
        netWeightSmall: 125,
        netWeightLarge: 125,
        unit: 'pcs',
        ediblePortionPercent: 100,
        conversionFactorToBase: 1,
        purchaseUnit: 'pcs',
        unitPrice: 3600,
        calories100g: 65,
        protein100g: 3.2,
        fat100g: 3.5,
        carb100g: 5.0,
        fiber100g: 0.0,
        referenceSource: 'SNI Susu UHT Kemenkes',
      },
      {
        id: 'ing-309',
        name: 'Minyak Goreng & Bumbu Halus',
        category: 'Bumbu & Minyak',
        netWeightSmall: 8,
        netWeightLarge: 12,
        unit: 'gram',
        ediblePortionPercent: 100,
        conversionFactorToBase: 0.001,
        purchaseUnit: 'kg',
        unitPrice: 22000,
        calories100g: 650,
        protein100g: 0.8,
        fat100g: 70.0,
        carb100g: 6.0,
        fiber100g: 0.5,
        referenceSource: 'TKPI 2020 (F01)',
      },
    ],
  };
}

function recomputeMenuItemsFromRecipes(
  menus: MenuItem[],
  recipesMap: Record<string, RecipeIngredient[]>,
  masterUnits: MasterUnit[],
  quotaSmall: number,
  quotaLarge: number
): MenuItem[] {
  const safeSmall = toNonNegativeNumber(quotaSmall, 0);
  const safeLarge = toNonNegativeNumber(quotaLarge, 0);
  const totalPortions = Math.max(1, safeSmall + safeLarge);
  return menus.map(menu => {
    const ings = recipesMap[menu.id];
    if (!ings || ings.length === 0) return menu;

    let calSmall = 0;
    let calLarge = 0;
    let protSmall = 0;
    let carbSmall = 0;
    let fatSmall = 0;
    let fibSmall = 0;
    let totalCost = 0;

    for (const ing of ings) {
      const formula = resolveRecipeIngredientFormula(ing, masterUnits, safeSmall, safeLarge);
      totalCost += toNonNegativeNumber(formula.totalCost, 0);

      const nwSmall = toNonNegativeNumber(ing.netWeightSmall, 0);
      const nwLarge = toNonNegativeNumber(ing.netWeightLarge, 0);
      calSmall += (nwSmall / 100) * toNonNegativeNumber(ing.calories100g, 0);
      calLarge += (nwLarge / 100) * toNonNegativeNumber(ing.calories100g, 0);
      protSmall += (nwSmall / 100) * toNonNegativeNumber(ing.protein100g, 0);
      carbSmall += (nwSmall / 100) * toNonNegativeNumber(ing.carb100g, 0);
      fatSmall += (nwSmall / 100) * toNonNegativeNumber(ing.fat100g, 0);
      fibSmall += (nwSmall / 100) * toNonNegativeNumber(ing.fiber100g, 0);
    }

    return {
      ...menu,
      caloriesSmall: Math.round(calSmall),
      caloriesLarge: Math.round(calLarge),
      proteinGrams: Number(protSmall.toFixed(1)),
      carbGrams: Number(carbSmall.toFixed(1)),
      fatGrams: Number(fatSmall.toFixed(1)),
      fiberGrams: Number(fibSmall.toFixed(1)),
      targetPortions: totalPortions,
      estimatedCostPerPortion: Math.round(totalCost / totalPortions),
    };
  });
}

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

const TRIAL_UPLOADED_IMAGES_CLEANED_KEY = 'esppg_trial_uploaded_images_cleaned_v1';

const TRIAL_IMAGE_STORAGE_KEYS: string[] = [
  'esppg_prep_records',
  'esppg_cooking_records',
  'esppg_portioning_records',
  'esppg_qc_records',
  'esppg_distribution_deliveries',
  'esppg_ompreng_returns',
  'esppg_fuel_logs',
  'esppg_washing_waste_records',
  'esppg_stock_mutations_v1',
  'esppg_letters',
  'esppg_outgoing_docs',
  'esppg_incoming_letters',
  'esppg_division_jobdesks_v1',
  'esppg_petty_cash_transactions_v1',
];

function stripUploadedTrialDataUrls(node: unknown): { value: unknown; changed: boolean } {
  if (typeof node === 'string') {
    if (node.startsWith('data:image/') || node.startsWith('data:application/')) {
      return { value: '', changed: true };
    }
    return { value: node, changed: false };
  }
  if (Array.isArray(node)) {
    let anyChanged = false;
    const mapped = node
      .map(item => {
        const res = stripUploadedTrialDataUrls(item);
        if (res.changed) anyChanged = true;
        return res.value;
      })
      .filter(item => item !== '');
    return { value: anyChanged ? mapped : node, changed: anyChanged };
  }
  if (node !== null && typeof node === 'object') {
    let anyChanged = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const res = stripUploadedTrialDataUrls(v);
      if (res.changed) anyChanged = true;
      out[k] = res.value;
    }
    return { value: anyChanged ? out : node, changed: anyChanged };
  }
  return { value: node, changed: false };
}

/**
 * One-time cleanup of experimental/trial base64 images stored inside operational records,
 * strictly preserving logo (`esppg_config`), kop surat, and flyer assets.
 */
function cleanupLegacyUploadedTrialImagesOnce(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(TRIAL_UPLOADED_IMAGES_CLEANED_KEY) === '1') return;

    for (const key of TRIAL_IMAGE_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      if (!raw.includes('data:image/') && !raw.includes('data:application/')) continue;
      try {
        const parsed = JSON.parse(raw);
        const { value, changed } = stripUploadedTrialDataUrls(parsed);
        if (changed) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch {
        // Skip malformed JSON
      }
    }

    localStorage.setItem(TRIAL_UPLOADED_IMAGES_CLEANED_KEY, '1');
  } catch {
    // Non-blocking storage cleanup
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useMemo(() => {
    cleanupLegacyUploadedTrialImagesOnce();
    return true;
  }, []);

  const [webAccessUsers, setWebAccessUsers] = useState<WebAccessUser[]>(() => readStoredWebAccessUsers());

  const [webAccessPolicy, setWebAccessPolicy] = useState<WebAccessPolicy>(() => readStoredWebAccessPolicy());

  const initialVerifiedState = React.useMemo(
    () => validateStoredSessionAgainstPolicy(webAccessUsers, webAccessPolicy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [currentUser, setCurrentUser] = useState<UserProfile>(() =>
    initialVerifiedState ? initialVerifiedState.user : GUEST_UNAUTHENTICATED_USER
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    Boolean(initialVerifiedState)
  );
  const [isOriginAdminSession, setIsOriginAdminSession] = useState<boolean>(() =>
    Boolean(initialVerifiedState?.isOriginAdmin)
  );
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [firebaseAuthEmail, setFirebaseAuthEmail] = useState<string | null>(() => auth.currentUser?.email || null);
  const explicitLogoutRef = React.useRef<boolean>(false);
  const webAccessUsersRef = React.useRef<WebAccessUser[]>(webAccessUsers);
  const webAccessPolicyRef = React.useRef<WebAccessPolicy>(webAccessPolicy);

  useEffect(() => {
    webAccessUsersRef.current = webAccessUsers;
  }, [webAccessUsers]);

  useEffect(() => {
    webAccessPolicyRef.current = webAccessPolicy;
  }, [webAccessPolicy]);

  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() =>
    readStoredJson<RolePermissions>('esppg_role_permissions', defaultPermissions)
  );

  const [roleModuleAccess, setRoleModuleAccess] = useState<RoleModuleAccessMap>(() => {
    try {
      const saved = localStorage.getItem(ROLE_MODULE_ACCESS_STORAGE_KEY);
      return saved ? sanitizeRoleModuleAccess(JSON.parse(saved)) : buildDefaultRoleModuleAccess();
    } catch {
      return buildDefaultRoleModuleAccess();
    }
  });

  const [dashboardLayoutConfig, setDashboardLayoutConfig] = useState<DashboardLayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
      return saved ? sanitizeDashboardLayoutConfig(JSON.parse(saved)) : buildDefaultDashboardLayoutConfig();
    } catch {
      return buildDefaultDashboardLayoutConfig();
    }
  });

  const [sppgConfig, setSppgConfig] = useState<SPPGConfig>(() => {
    try {
      const saved = localStorage.getItem('esppg_config');
      if (saved) {
        const parsed = JSON.parse(saved) as SPPGConfig;
        const migrationKey = 'esppg_budget_pagu_v2_migrated';
        if (!localStorage.getItem(migrationKey)) {
          const hasLegacyCap =
            (parsed.smallPortionBudget === 15000 || parsed.smallPortionBudget === 12500 || !parsed.smallPortionBudget) &&
            (parsed.largePortionBudget === 15000 || !parsed.largePortionBudget);
          localStorage.setItem(migrationKey, 'true');
          if (hasLegacyCap) {
            const migrated: SPPGConfig = {
              ...defaultSPPGConfig,
              ...parsed,
              smallPortionBudget: 8000,
              largePortionBudget: 10000,
            };
            localStorage.setItem('esppg_config', JSON.stringify(migrated));
            return migrated;
          }
        }
        return { ...defaultSPPGConfig, ...parsed };
      }
      localStorage.setItem('esppg_budget_pagu_v2_migrated', 'true');
    } catch {
      // ignore storage errors
    }
    return defaultSPPGConfig;
  });

  // Master Data & Beneficiaries States
  const [institutions, setInstitutions] = useState<Institution[]>(() =>
    readStoredJson<Institution[]>('esppg_institutions_v2', initialInstitutionsData)
  );

  const [masterBahan, setMasterBahan] = useState<MasterBahan[]>(() =>
    readStoredJson<MasterBahan[]>('esppg_master_bahan', initialMasterBahanData)
  );

  const [masterSuppliers, setMasterSuppliers] = useState<MasterSupplier[]>(() =>
    readStoredJson<MasterSupplier[]>('esppg_master_suppliers', initialMasterSuppliersData)
  );

  const [masterVolunteers, setMasterVolunteers] = useState<MasterVolunteer[]>(() =>
    readStoredJson<MasterVolunteer[]>('esppg_master_volunteers', initialMasterVolunteersData)
  );

  const [masterUnits, setMasterUnits] = useState<MasterUnit[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_master_units');
      const seededFlag = localStorage.getItem('esppg_master_units_v2_seeded');
      if (saved) {
        const parsed: MasterUnit[] = JSON.parse(saved);
        if (!seededFlag && Array.isArray(parsed)) {
          const existingCodes = new Set(parsed.map(u => (u.code || '').trim().toLowerCase()));
          const missingDefaults = initialMasterUnitsData.filter(
            d => !existingCodes.has(d.code.trim().toLowerCase())
          );
          localStorage.setItem('esppg_master_units_v2_seeded', '1');
          return [...parsed, ...missingDefaults];
        }
        return parsed;
      }
      localStorage.setItem('esppg_master_units_v2_seeded', '1');
      return initialMasterUnitsData;
    } catch {
      return initialMasterUnitsData;
    }
  });

  const [materialConversions, setMaterialConversions] = useState<MaterialDimensionConversion[]>(() =>
    readStoredJson<MaterialDimensionConversion[]>('esppg_material_conversions', initialMaterialConversionsData)
  );

  // 7. Beneficiary Attendance & Quota History
  const [beneficiaryAttendance, setBeneficiaryAttendance] = useState<BeneficiaryAttendanceLog[]>(() =>
    readStoredJson<BeneficiaryAttendanceLog[]>('esppg_beneficiary_attendance', initialBeneficiaryAttendanceData)
  );

  const [beneficiaryQuotaHistory, setBeneficiaryQuotaHistory] = useState<BeneficiaryQuotaHistory[]>(() =>
    readStoredJson<BeneficiaryQuotaHistory[]>('esppg_quota_history', initialQuotaHistoryData)
  );

  const [beneficiaryRecords, setBeneficiaryRecords] = useState<BeneficiaryNutritionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_beneficiary_records_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialBeneficiaryNutritionRecords;
    } catch {
      return initialBeneficiaryNutritionRecords;
    }
  });
  const [maternalHealthRecords, setMaternalHealthRecords] = useState<MaternalHealthRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_maternal_health_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialMaternalHealthRecords;
    } catch {
      return initialMaternalHealthRecords;
    }
  });
  const [lactatingHealthRecords, setLactatingHealthRecords] = useState<LactatingHealthRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_lactating_health_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialLactatingHealthRecords;
    } catch {
      return initialLactatingHealthRecords;
    }
  });
  const [isDataHydrating, setIsDataHydrating] = useState<boolean>(true);

  // Existing Operational States (Single Source of Truth)
  const [menuIngredientsMap, setMenuIngredientsMap] = useState<Record<string, RecipeIngredient[]>>(() => {
    const defaultMap = buildDefaultMenuIngredientsMap();
    try {
      const saved = localStorage.getItem('esppg_menu_ingredients_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const merged: Record<string, RecipeIngredient[]> = { ...parsed };
          // Pastikan menu bawaan yang belum punya rincian resep (misal menu-3) otomatis terisi
          Object.entries(defaultMap).forEach(([menuId, defIngs]) => {
            if (!Array.isArray(merged[menuId]) || merged[menuId].length === 0) {
              merged[menuId] = defIngs;
            }
          });
          return merged;
        }
      }
    } catch {
      // Fallback
    }
    return defaultMap;
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    let baseMenus: MenuItem[] = initialMenuItems;
    try {
      const saved = localStorage.getItem('esppg_menu_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) baseMenus = parsed;
      }
    } catch {
      // Fallback
    }
    const qSmall = institutions.reduce((s, i) => s + (i.smallPortions || 0), 0);
    const qLarge = institutions.reduce((s, i) => s + (i.largePortions || 0), 0);
    return recomputeMenuItemsFromRecipes(baseMenus, menuIngredientsMap, masterUnits, qSmall, qLarge);
  });

  const [recipeCustomColumns, setRecipeCustomColumns] = useState<RecipeCustomColumn[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_recipe_custom_columns_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const [divisionJobdesks, setDivisionJobdesks] = useState<DivisionJobdesk[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_division_jobdesks_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: DivisionJobdesk) => {
            const photos =
              Array.isArray(item.photoUrls) && item.photoUrls.length > 0
                ? item.photoUrls.filter(Boolean)
                : item.photoUrl
                ? [item.photoUrl]
                : [];
            return {
              ...item,
              photoUrl: photos[0] || item.photoUrl || '',
              photoUrls: photos,
            };
          });
        }
      }
    } catch {
      // Fallback
    }
    return defaultDivisionJobdesks;
  });

  // Reconciled 4-stage Supply Chain Initialization:
  // Menu (PLOG) -> RAB -> Purchase Order (PO) -> Quality Control (QC) -> Stok Gudang
  const initialSupplyChainState = React.useMemo(() => {
    let rawInv: InventoryItem[] = defaultInventoryItemsWithBatches;
    try {
      const saved = localStorage.getItem('esppg_inventory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          rawInv = parsed.map((item: InventoryItem) => {
            if (item.batches && item.batches.length > 0) return item;
            const richDefault = defaultInventoryItemsWithBatches.find(d => d.id === item.id);
            return richDefault?.batches ? { ...item, batches: richDefault.batches } : item;
          });
        }
      }
    } catch {
      rawInv = defaultInventoryItemsWithBatches;
    }

    let rawMuts: StockMutation[] = defaultStockMutations;
    try {
      const saved = localStorage.getItem('esppg_stock_mutations_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) rawMuts = parsed;
      }
    } catch {
      rawMuts = defaultStockMutations;
    }

    let rawPOs: PurchaseOrder[] = initialPurchaseOrders;
    try {
      const saved = localStorage.getItem('esppg_purchase_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) rawPOs = parsed;
      }
    } catch {
      rawPOs = initialPurchaseOrders;
    }

    let rawRABs: RABItem[] = defaultRABItems;
    try {
      const saved = localStorage.getItem('esppg_rab_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) rawRABs = parsed;
      }
    } catch {
      rawRABs = defaultRABItems;
    }

    let rawQCs: QualityControlRecord[] = defaultQualityControlRecords;
    try {
      const saved = localStorage.getItem('esppg_qc_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) rawQCs = parsed;
      }
    } catch {
      rawQCs = defaultQualityControlRecords;
    }

    let initialRABs = rawRABs;
    try {
      const dailySeeded = localStorage.getItem('esppg_rab_daily_seeded_v1');
      if (!dailySeeded && menuItems.length > 0) {
        let skippedKeys = new Set<string>();
        try {
          const rawDeleted = localStorage.getItem('esppg_deleted_menu_rab_keys_v1');
          if (rawDeleted) {
            const parsedDeleted = JSON.parse(rawDeleted);
            if (Array.isArray(parsedDeleted)) skippedKeys = new Set(parsedDeleted);
          }
        } catch {
          // ignore
        }
        const dailySeedRes = syncRABWithMenuPlans({
          menuItems,
          menuIngredientsMap,
          masterUnits,
          institutions,
          rabItems: rawRABs,
          inventory: rawInv,
          masterBahan,
          options: {
            preserveManualEdits: true,
            skipDeletedKeys: skippedKeys,
          },
        });
        initialRABs = dailySeedRes.rabItems;
        localStorage.setItem('esppg_rab_daily_seeded_v1', '1');
      }
    } catch {
      // Non-blocking fallback
    }

    let preparedPOs = rawPOs;
    try {
      const poDailySeeded = localStorage.getItem('esppg_po_daily_ops_seeded_v1');
      if (!poDailySeeded && menuItems.length > 0) {
        const seededPORes = seedAndSyncDailyPurchaseOrders({
          purchaseOrders: rawPOs,
          rabItems: initialRABs,
          menuItems,
          includeApprovedPangan: false,
        });
        preparedPOs = seededPORes.purchaseOrders;
        localStorage.setItem('esppg_po_daily_ops_seeded_v1', '1');
      }
    } catch {
      // Non-blocking fallback
    }

    const syncedPOs = reconcilePurchaseOrdersWithQC(preparedPOs, rawQCs);
    const syncedRABs = reconcileRABWithPurchaseOrders(syncedPOs, initialRABs);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: rawQCs,
      purchaseOrders: syncedPOs,
      rabItems: syncedRABs,
      masterBahan,
      existingInventory: rawInv,
      existingMutations: rawMuts,
    });

    return {
      qualityControlRecords: rawQCs,
      purchaseOrders: syncedPOs,
      rabItems: syncedRABs,
      inventory: invSync.inventory,
      stockMutations: invSync.stockMutations,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [inventory, setInventory] = useState<InventoryItem[]>(() => initialSupplyChainState.inventory);

  const [stockMutations, setStockMutations] = useState<StockMutation[]>(() => initialSupplyChainState.stockMutations);

  const [stockOpnames, setStockOpnames] = useState<StockOpnameRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_stock_opnames_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultStockOpnameRecords;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => initialSupplyChainState.purchaseOrders);

  const [rabItems, setRabItems] = useState<RABItem[]>(() => initialSupplyChainState.rabItems);

  const [qualityControlRecords, setQualityControlRecords] = useState<QualityControlRecord[]>(() => initialSupplyChainState.qualityControlRecords);

  // Ref mirrors to prevent stale-closure drift across rapid sequential / batch updates
  const institutionsRef = React.useRef<Institution[]>(institutions);
  const menuItemsRef = React.useRef<MenuItem[]>(menuItems);
  const menuIngredientsMapRef = React.useRef<Record<string, RecipeIngredient[]>>(menuIngredientsMap);
  const inventoryRef = React.useRef<InventoryItem[]>(inventory);
  const stockMutationsRef = React.useRef<StockMutation[]>(stockMutations);
  const purchaseOrdersRef = React.useRef<PurchaseOrder[]>(purchaseOrders);
  const rabItemsRef = React.useRef<RABItem[]>(rabItems);
  const qualityControlRecordsRef = React.useRef<QualityControlRecord[]>(qualityControlRecords);
  const deletedMenuRabKeysRef = React.useRef<Set<string>>(
    (() => {
      try {
        const raw = localStorage.getItem('esppg_deleted_menu_rab_keys_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set<string>(parsed);
        }
      } catch {
        // ignore
      }
      return new Set<string>();
    })()
  );

  useEffect(() => {
    institutionsRef.current = institutions;
  }, [institutions]);

  useEffect(() => {
    menuItemsRef.current = menuItems;
  }, [menuItems]);

  useEffect(() => {
    menuIngredientsMapRef.current = menuIngredientsMap;
  }, [menuIngredientsMap]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    stockMutationsRef.current = stockMutations;
  }, [stockMutations]);

  useEffect(() => {
    purchaseOrdersRef.current = purchaseOrders;
  }, [purchaseOrders]);

  useEffect(() => {
    rabItemsRef.current = rabItems;
  }, [rabItems]);

  useEffect(() => {
    qualityControlRecordsRef.current = qualityControlRecords;
  }, [qualityControlRecords]);

  const [distributionLogs, setDistributionLogs] = useState<DistributionLog[]>(() =>
    readStoredJson<DistributionLog[]>('esppg_distribution_logs', initialDistributions)
  );

  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() =>
    readStoredJson<FinancialTransaction[]>('esppg_transactions', initialTransactions)
  );

  const [volunteerAttendance, setVolunteerAttendance] = useState<VolunteerAttendance[]>(() =>
    readStoredJson<VolunteerAttendance[]>('esppg_volunteers', initialVolunteers)
  );

  const [officialLetters, setOfficialLetters] = useState<OfficialLetter[]>(() =>
    readStoredJson<OfficialLetter[]>('esppg_letters', initialLetters)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_audit_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return initialAuditLogs;
  });

  // 5 Divisi Dapur & Operasional
  const [prepRecords, setPrepRecords] = useState<PreparationInspectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_prep_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultPrepRecords;
  });

  const prepRecordsRef = React.useRef<PreparationInspectionRecord[]>(prepRecords);
  useEffect(() => {
    prepRecordsRef.current = prepRecords;
  }, [prepRecords]);

  const [cookingRecords, setCookingRecords] = useState<CookingInspectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_cooking_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultCookingRecords;
  });

  const cookingRecordsRef = React.useRef<CookingInspectionRecord[]>(cookingRecords);
  useEffect(() => {
    cookingRecordsRef.current = cookingRecords;
  }, [cookingRecords]);

  const [portioningRecords, setPortioningRecords] = useState<PortioningInspectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_portioning_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultPortioningRecords;
  });

  const [distributionDeliveries, setDistributionDeliveries] = useState<DistributionDeliveryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_distribution_deliveries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultDistributionDeliveries;
  });

  const [omprengReturns, setOmprengReturns] = useState<OmprengReturnRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_ompreng_returns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultOmprengReturns;
  });

  const [fuelLogs, setFuelLogs] = useState<FuelLogRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_fuel_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultFuelLogs;
  });

  const [washingWasteRecords, setWashingWasteRecords] = useState<WashingWasteRecord[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_washing_waste_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultWashingWasteRecords;
  });

  // 14. Modul Administrasi Surat & 15. Modul Surat Masuk
  const [outgoingDocuments, setOutgoingDocuments] = useState<OutgoingDocument[]>(() =>
    readStoredJson<OutgoingDocument[]>('esppg_outgoing_docs', defaultOutgoingDocuments)
  );

  const [incomingLetters, setIncomingLetters] = useState<IncomingLetter[]>(() =>
    readStoredJson<IncomingLetter[]>('esppg_incoming_letters', defaultIncomingLetters)
  );

  const [volunteerAbsences, setVolunteerAbsences] = useState<VolunteerAbsenceRecord[]>(() =>
    readStoredJson<VolunteerAbsenceRecord[]>('esppg_volunteer_absences', defaultVolunteerAbsences)
  );

  const [picIncentiveConfig, setPicIncentiveConfig] = useState<PICIncentiveConfig>(() => {
    try {
      const saved = localStorage.getItem('esppg_pic_incentive_config_v1');
      return saved ? { ...defaultPICIncentiveConfig, ...JSON.parse(saved) } : defaultPICIncentiveConfig;
    } catch {
      return defaultPICIncentiveConfig;
    }
  });

  const [picIncentivePayouts, setPicIncentivePayouts] = useState<PICIncentivePayout[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_pic_incentive_payouts_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [volunteerIncentiveConfig, setVolunteerIncentiveConfig] = useState<VolunteerIncentiveConfig>(() => {
    try {
      const saved = localStorage.getItem('esppg_volunteer_incentive_config_v1');
      if (!saved) return defaultVolunteerIncentiveConfig;
      const parsed = JSON.parse(saved);
      return {
        ...defaultVolunteerIncentiveConfig,
        ...parsed,
        divisionRates: {
          ...defaultVolunteerIncentiveConfig.divisionRates,
          ...(parsed?.divisionRates || {}),
        },
      };
    } catch {
      return defaultVolunteerIncentiveConfig;
    }
  });

  const [volunteerIncentivePayouts, setVolunteerIncentivePayouts] = useState<VolunteerIncentivePayout[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_volunteer_incentive_payouts_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pettyCashOpeningBalance, setPettyCashOpeningBalanceState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('esppg_petty_cash_opening_v1');
      if (saved !== null) {
        const parsed = Number(saved);
        return Number.isFinite(parsed) ? parsed : DEFAULT_PETTY_CASH_OPENING_BALANCE;
      }
      return DEFAULT_PETTY_CASH_OPENING_BALANCE;
    } catch {
      return DEFAULT_PETTY_CASH_OPENING_BALANCE;
    }
  });

  const [pettyCashTransactions, setPettyCashTransactions] = useState<PettyCashTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('esppg_petty_cash_transactions_v1');
      return saved ? JSON.parse(saved) : initialPettyCashTransactions;
    } catch {
      return initialPettyCashTransactions;
    }
  });

  const [dynamicFormSchemas, setDynamicFormSchemas] = useState<Record<DynamicFormId, DynamicFormSchema>>(() => {
    try {
      const saved = localStorage.getItem('esppg_dynamic_form_schemas_v1');
      return saved ? mergeDynamicFormSchemas(JSON.parse(saved)) : defaultDynamicFormSchemas;
    } catch {
      return defaultDynamicFormSchemas;
    }
  });

  const [kitchenProgressOverride, setKitchenProgressOverride] = useState<Partial<KitchenProgress> | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('esppg_dark_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  const safeWriteLocalStorage = React.useCallback((key: string, serialized: string): boolean => {
    try {
      localStorage.setItem(key, serialized);
      return true;
    } catch {
      try {
        // Attempt to reclaim space from non-critical audit logs on QuotaExceededError
        const rawLogs = localStorage.getItem('esppg_audit_logs');
        if (rawLogs) {
          const parsed = JSON.parse(rawLogs);
          if (Array.isArray(parsed) && parsed.length > 25) {
            localStorage.setItem('esppg_audit_logs', JSON.stringify(parsed.slice(0, 25)));
          }
        }
        localStorage.setItem(key, serialized);
        return true;
      } catch {
        const criticalKeys = new Set<string>([
          'esppg_web_access_users_v1',
          'esppg_web_access_policy_v1',
          AUTH_SESSION_STORAGE_KEY,
          CURRENT_USER_STORAGE_KEY,
          ROLE_MODULE_ACCESS_STORAGE_KEY,
          'esppg_role_permissions',
        ]);
        if (criticalKeys.has(key)) {
          try {
            // Reclaim space aggressively so auth & login access records never drop silently
            const rawLogs = localStorage.getItem('esppg_audit_logs');
            if (rawLogs) {
              const parsed = JSON.parse(rawLogs);
              if (Array.isArray(parsed)) {
                localStorage.setItem('esppg_audit_logs', JSON.stringify(parsed.slice(0, 5)));
              }
            }
            const heavyArrayKeys = [
              'esppg_distribution_deliveries',
              'esppg_ompreng_returns',
              'esppg_prep_records',
              'esppg_cooking_records',
              'esppg_portioning_records',
              'esppg_qc_records',
              'esppg_fuel_logs',
              'esppg_washing_waste_records',
              'esppg_letters',
              'esppg_outgoing_docs',
              'esppg_incoming_letters',
            ];
            for (const heavyKey of heavyArrayKeys) {
              const rawVal = localStorage.getItem(heavyKey);
              if (rawVal && rawVal.length > 80000 && rawVal.includes('data:')) {
                const stripped = rawVal.replace(/"data:[^"]+"/g, '""');
                localStorage.setItem(heavyKey, stripped);
              }
            }
            localStorage.setItem(key, serialized);
            return true;
          } catch (errCritical) {
            console.warn(`Critical LocalStorage write failed for ${key}:`, errCritical);
            return false;
          }
        }
        return false;
      }
    }
  }, []);

  // Sync currentUser only when authenticated; wipe if unauthenticated
  useEffect(() => {
    if (isAuthenticated && currentUser.isActive) {
      safeWriteLocalStorage(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
    } else if (!isAuthenticated) {
      try {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      } catch {
        // ignore storage access errors
      }
    }
  }, [currentUser, isAuthenticated, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage(ROLE_MODULE_ACCESS_STORAGE_KEY, JSON.stringify(roleModuleAccess));
  }, [roleModuleAccess, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(dashboardLayoutConfig));
  }, [dashboardLayoutConfig, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_config', JSON.stringify(sppgConfig));
  }, [sppgConfig, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_institutions_v2', JSON.stringify(institutions));
  }, [institutions, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_master_bahan', JSON.stringify(masterBahan));
  }, [masterBahan, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_master_suppliers', JSON.stringify(masterSuppliers));
  }, [masterSuppliers, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_master_volunteers', JSON.stringify(masterVolunteers));
  }, [masterVolunteers, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_master_units', JSON.stringify(masterUnits));
  }, [masterUnits, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_material_conversions', JSON.stringify(materialConversions));
  }, [materialConversions, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_beneficiary_attendance', JSON.stringify(beneficiaryAttendance));
  }, [beneficiaryAttendance, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_quota_history', JSON.stringify(beneficiaryQuotaHistory));
  }, [beneficiaryQuotaHistory, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_beneficiary_records_v1', JSON.stringify(beneficiaryRecords));
  }, [beneficiaryRecords, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_maternal_health_v1', JSON.stringify(maternalHealthRecords));
  }, [maternalHealthRecords, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_lactating_health_v1', JSON.stringify(lactatingHealthRecords));
  }, [lactatingHealthRecords, safeWriteLocalStorage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsDataHydrating(false), 320);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    safeWriteLocalStorage('esppg_menu_items', JSON.stringify(menuItems));
  }, [menuItems, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_menu_ingredients_v1', JSON.stringify(menuIngredientsMap));
  }, [menuIngredientsMap, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_recipe_custom_columns_v1', JSON.stringify(recipeCustomColumns));
  }, [recipeCustomColumns, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_division_jobdesks_v1', JSON.stringify(divisionJobdesks));
  }, [divisionJobdesks, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_inventory', JSON.stringify(inventory));
  }, [inventory, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_stock_mutations_v1', JSON.stringify(stockMutations));
  }, [stockMutations, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_stock_opnames_v1', JSON.stringify(stockOpnames));
  }, [stockOpnames, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_distribution_logs', JSON.stringify(distributionLogs));
  }, [distributionLogs, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_transactions', JSON.stringify(financialTransactions));
  }, [financialTransactions, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_volunteers', JSON.stringify(volunteerAttendance));
  }, [volunteerAttendance, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_letters', JSON.stringify(officialLetters));
  }, [officialLetters, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_audit_logs', JSON.stringify(auditLogs.slice(0, 120)));
  }, [auditLogs, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_rab_items', JSON.stringify(rabItems));
  }, [rabItems, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_qc_records', JSON.stringify(qualityControlRecords));
  }, [qualityControlRecords, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_prep_records', JSON.stringify(prepRecords));
  }, [prepRecords, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_cooking_records', JSON.stringify(cookingRecords));
  }, [cookingRecords, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_portioning_records', JSON.stringify(portioningRecords));
  }, [portioningRecords, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_distribution_deliveries', JSON.stringify(distributionDeliveries));
  }, [distributionDeliveries, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_ompreng_returns', JSON.stringify(omprengReturns));
  }, [omprengReturns, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_fuel_logs', JSON.stringify(fuelLogs));
  }, [fuelLogs, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_washing_waste_records', JSON.stringify(washingWasteRecords));
  }, [washingWasteRecords, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_outgoing_docs', JSON.stringify(outgoingDocuments));
  }, [outgoingDocuments, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_incoming_letters', JSON.stringify(incomingLetters));
  }, [incomingLetters, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_volunteer_absences', JSON.stringify(volunteerAbsences));
  }, [volunteerAbsences, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_web_access_users_v1', JSON.stringify(webAccessUsers));
  }, [webAccessUsers, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_web_access_policy_v1', JSON.stringify(webAccessPolicy));
  }, [webAccessPolicy, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_dynamic_form_schemas_v1', JSON.stringify(dynamicFormSchemas));
  }, [dynamicFormSchemas, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_pic_incentive_config_v1', JSON.stringify(picIncentiveConfig));
  }, [picIncentiveConfig, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_pic_incentive_payouts_v1', JSON.stringify(picIncentivePayouts));
  }, [picIncentivePayouts, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_volunteer_incentive_config_v1', JSON.stringify(volunteerIncentiveConfig));
  }, [volunteerIncentiveConfig, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_volunteer_incentive_payouts_v1', JSON.stringify(volunteerIncentivePayouts));
  }, [volunteerIncentivePayouts, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_petty_cash_opening_v1', String(pettyCashOpeningBalance));
  }, [pettyCashOpeningBalance, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_petty_cash_transactions_v1', JSON.stringify(pettyCashTransactions));
  }, [pettyCashTransactions, safeWriteLocalStorage]);

  useEffect(() => {
    safeWriteLocalStorage('esppg_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, safeWriteLocalStorage]);

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

  const addToastRef = React.useRef(addToast);
  addToastRef.current = addToast;

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type?: ToastMessage['type'];
        title?: string;
        message?: string;
      }>;
      const detail = customEvent.detail;
      if (detail?.title && detail?.message) {
        addToastRef.current(detail.type || 'info', detail.title, detail.message);
      }
    };
    window.addEventListener('sppg-toast', handleToastEvent);
    return () => window.removeEventListener('sppg-toast', handleToastEvent);
  }, []);

  // Re-validate session & Firebase Auth on load and across tabs
  useEffect(() => {
    let settled = false;
    const safetyTimer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setAuthReady(true);
      }
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async fbUser => {
      setFirebaseAuthEmail(fbUser?.email || null);
      let latestUsers = [...webAccessUsersRef.current];
      let latestPolicy = { ...webAccessPolicyRef.current };

      if (fbUser && !explicitLogoutRef.current) {
        const emailLower = (fbUser.email || '').trim().toLowerCase();
        const isSuperAdmin = isProtectedSuperAdminEmail(emailLower);

        // 1. Hydrate web_access_policy & user profile (both UID doc and deterministic email-hash doc) from Firestore
        try {
          const emailDocId = emailLower ? getWebAccessEmailDocId(emailLower) : '';
          const [policySnap, selfUserSnap, emailUserSnap] = await Promise.all([
            getDoc(doc(db, 'app_settings', 'web_access_policy')).catch(() => null),
            getDoc(doc(db, 'users', fbUser.uid)).catch(() => null),
            emailDocId ? getDoc(doc(db, 'users', emailDocId)).catch(() => null) : Promise.resolve(null),
          ]);

          if (policySnap && policySnap.exists()) {
            const pData = policySnap.data();
            latestPolicy = {
              strictWhitelistOnly:
                typeof pData.strictWhitelistOnly === 'boolean'
                  ? pData.strictWhitelistOnly
                  : latestPolicy.strictWhitelistOnly,
              allowSelfRegistration:
                typeof pData.allowSelfRegistration === 'boolean'
                  ? pData.allowSelfRegistration
                  : latestPolicy.allowSelfRegistration,
              allowDemoPreview:
                typeof pData.allowDemoPreview === 'boolean'
                  ? pData.allowDemoPreview
                  : latestPolicy.allowDemoPreview,
            };
            webAccessPolicyRef.current = latestPolicy;
            setWebAccessPolicy(latestPolicy);
            safeWriteLocalStorage('esppg_web_access_policy_v1', JSON.stringify(latestPolicy));
          }

          let isCloudAdmin = isSuperAdmin;
          const profileSnaps = [selfUserSnap, emailUserSnap];
          for (const snap of profileSnaps) {
            if (snap && snap.exists()) {
              const uData = snap.data();
              const docEmail = (uData.email || fbUser.email || '').trim().toLowerCase();
              if (docEmail && uData.roleName) {
                if (uData.roleName === 'Admin Utama' || uData.roleName === 'Kepala SPPG') {
                  isCloudAdmin = true;
                }
                const existingLocal = latestUsers.find(u => u.email.trim().toLowerCase() === docEmail);
                const hydratedEntry: WebAccessUser = {
                  id: uData.webAccessId || existingLocal?.id || `wau-${fbUser.uid}`,
                  firebaseUid: fbUser.uid,
                  name: uData.name || existingLocal?.name || fbUser.displayName || docEmail.split('@')[0],
                  email: docEmail,
                  role: (isProtectedSuperAdminEmail(docEmail) ? 'Admin Utama' : uData.roleName) as RoleType,
                  division: uData.division || existingLocal?.division || undefined,
                  supplierId: uData.supplierId || existingLocal?.supplierId || undefined,
                  supplierName: uData.supplierName || existingLocal?.supplierName || undefined,
                  passwordHash:
                    typeof uData.passwordHash === 'string' && uData.passwordHash
                      ? uData.passwordHash
                      : existingLocal?.passwordHash || '',
                  isActive:
                    typeof uData.isActive === 'boolean'
                      ? uData.isActive
                      : existingLocal?.isActive ?? true,
                  allowGoogleLogin:
                    typeof uData.allowGoogleLogin === 'boolean'
                      ? uData.allowGoogleLogin
                      : existingLocal?.allowGoogleLogin ?? true,
                  isProtectedAdmin: isProtectedSuperAdminEmail(docEmail),
                  createdAt:
                    uData.createdAt || existingLocal?.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
                  createdBy: uData.createdBy || existingLocal?.createdBy || 'Firestore Sync',
                  updatedAt:
                    uData.updatedAt || existingLocal?.updatedAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
                  updatedBy: uData.updatedBy || existingLocal?.updatedBy || 'Firestore Sync',
                  lastLoginAt: uData.lastLoginAt || existingLocal?.lastLoginAt || undefined,
                  notes: uData.notes || existingLocal?.notes || undefined,
                };
                const idx = latestUsers.findIndex(u => u.email.trim().toLowerCase() === docEmail);
                if (idx >= 0) {
                  latestUsers[idx] = hydratedEntry;
                } else {
                  latestUsers = mergeProtectedAdmins([...latestUsers, hydratedEntry]);
                }
              }
            }
          }

          if (isCloudAdmin) {
            const usersSnap = await getDocs(
              query(collection(db, 'users'), where('sppgId', '==', 'GFBQSYXD'))
            ).catch(() => null);
            if (usersSnap && !usersSnap.empty) {
              const nextMap = new Map<string, WebAccessUser>();
              latestUsers.forEach(u => nextMap.set(u.email.trim().toLowerCase(), u));
              const orderedDocs = [...usersSnap.docs].sort((a, b) => {
                const rank = (id: string) => (id.startsWith('wau_e_') ? 2 : id.startsWith('wau_') ? 1 : 0);
                return rank(a.id) - rank(b.id);
              });
              orderedDocs.forEach(docSnap => {
                const uData = docSnap.data();
                const docEmail = typeof uData.email === 'string' ? uData.email.trim().toLowerCase() : '';
                if (!docEmail || !uData.roleName) return;
                const existing = nextMap.get(docEmail);
                const isAdminIndexDoc = docSnap.id.startsWith('wau_');
                const mergedUser: WebAccessUser = {
                  id: isAdminIndexDoc
                    ? (uData.webAccessId || docSnap.id.replace(/^wau_/, ''))
                    : (uData.webAccessId || existing?.id || docSnap.id),
                  firebaseUid:
                    uData.firebaseUid ||
                    (!isAdminIndexDoc ? docSnap.id : existing?.firebaseUid),
                  name: uData.name || existing?.name || docEmail.split('@')[0],
                  email: docEmail,
                  role: (isProtectedSuperAdminEmail(docEmail) ? 'Admin Utama' : uData.roleName) as RoleType,
                  division: uData.division || existing?.division,
                  supplierId: uData.supplierId || existing?.supplierId,
                  supplierName: uData.supplierName || existing?.supplierName,
                  passwordHash:
                    typeof uData.passwordHash === 'string' && uData.passwordHash
                      ? uData.passwordHash
                      : existing?.passwordHash || '',
                  isActive:
                    typeof uData.isActive === 'boolean'
                      ? uData.isActive
                      : existing?.isActive ?? true,
                  allowGoogleLogin:
                    typeof uData.allowGoogleLogin === 'boolean'
                      ? uData.allowGoogleLogin
                      : existing?.allowGoogleLogin ?? true,
                  isProtectedAdmin: isProtectedSuperAdminEmail(docEmail),
                  createdAt: uData.createdAt || existing?.createdAt || '',
                  createdBy: uData.createdBy || existing?.createdBy || 'Firestore Sync',
                  updatedAt: uData.updatedAt || existing?.updatedAt || '',
                  updatedBy: uData.updatedBy || existing?.updatedBy || 'Firestore Sync',
                  lastLoginAt: uData.lastLoginAt || existing?.lastLoginAt,
                  notes: uData.notes || existing?.notes,
                };
                nextMap.set(docEmail, mergedUser);
              });
              latestUsers = mergeProtectedAdmins(Array.from(nextMap.values()));
            }
          }

          webAccessUsersRef.current = latestUsers;
          setWebAccessUsers(latestUsers);
          safeWriteLocalStorage('esppg_web_access_users_v1', JSON.stringify(latestUsers));
        } catch {
          // Non-blocking fallback to local state
        }

        const webEntry = latestUsers.find(u => u.email.trim().toLowerCase() === emailLower);
        const matched = fbUser.email ? resolveUserByIdentifier(fbUser.email) : undefined;
        const isGoogleProvider = fbUser.providerData?.some(p => p.providerId === 'google.com');

        const isBlocked =
          (webEntry && !webEntry.isActive && !isSuperAdmin) ||
          (webEntry && isGoogleProvider && !webEntry.allowGoogleLogin && !isSuperAdmin) ||
          (!webEntry && latestPolicy.strictWhitelistOnly && !isSuperAdmin);

        if (isBlocked) {
          clearStoredSessionStorage();
          setCurrentUser(GUEST_UNAUTHENTICATED_USER);
          setIsOriginAdminSession(false);
          setIsAuthenticated(false);
          try {
            await signOut(auth);
          } catch {
            // Non-blocking
          }
          settled = true;
          setAuthReady(true);
          return;
        }

        let resolvedProfile: UserProfile;
        if (webEntry) {
          resolvedProfile = {
            uid: fbUser.uid,
            name: webEntry.name || fbUser.displayName || webEntry.email,
            email: webEntry.email,
            role: isSuperAdmin ? 'Admin Utama' : webEntry.role,
            division: resolveDivisionForRole(
              isSuperAdmin ? 'Admin Utama' : webEntry.role,
              webEntry.division
            ),
            supplierId: webEntry.supplierId,
            supplierName: webEntry.supplierName,
            isActive: webEntry.isActive,
          };
        } else if (matched) {
          resolvedProfile = {
            ...matched,
            uid: fbUser.uid,
            name: fbUser.displayName || matched.name,
          };
        } else {
          resolvedProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Petugas SPPG'),
            email: fbUser.email || '',
            role: isSuperAdmin ? 'Admin Utama' : 'Kepala SPPG',
            isActive: true,
          };
        }

        const existingSession = validateStoredSessionAgainstPolicy(latestUsers, latestPolicy);
        if (!existingSession || existingSession.session.email !== emailLower) {
          const signed = createSignedAuthSession({
            uid: resolvedProfile.uid,
            email: resolvedProfile.email,
            role: resolvedProfile.role,
            rememberMe: true,
          });
          safeWriteLocalStorage(AUTH_SESSION_STORAGE_KEY, JSON.stringify(signed));
        }

        const originAdmin = resolvedProfile.role === 'Admin Utama' || isSuperAdmin;
        setIsOriginAdminSession(originAdmin);
        setCurrentUser(prev =>
          originAdmin && prev.isActive && prev.uid !== GUEST_UNAUTHENTICATED_USER.uid
            ? prev
            : resolvedProfile
        );
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

        // Load persisted module access matrix from Firestore if available
        getDoc(doc(db, 'app_settings', 'role_module_access'))
          .then(snap => {
            if (snap.exists()) {
              const cloudAccess = snap.data()?.accessMap;
              if (cloudAccess && typeof cloudAccess === 'object') {
                setRoleModuleAccess(sanitizeRoleModuleAccess(cloudAccess));
              }
            }
          })
          .catch(() => {
            // Keep localStorage module access fallback if offline
          });

        // Load persisted dashboard layout & visibility config from Firestore if available
        getDoc(doc(db, 'app_settings', 'dashboard_layout_config'))
          .then(snap => {
            if (snap.exists()) {
              const cloudLayout = snap.data()?.config;
              if (cloudLayout && typeof cloudLayout === 'object') {
                setDashboardLayoutConfig(sanitizeDashboardLayoutConfig(cloudLayout));
              }
            }
          })
          .catch(() => {
            // Keep localStorage dashboard config fallback if offline
          });

        // Load persisted custom recipe columns from Firestore if available
        getDoc(doc(db, 'recipes', 'custom_recipe_columns'))
          .then(snap => {
            if (snap.exists()) {
              const cloudCols = snap.data()?.columns;
              if (Array.isArray(cloudCols)) {
                setRecipeCustomColumns(cloudCols);
              }
            }
          })
          .catch(() => {
            // Keep localStorage fallback if offline
          });
      } else {
        // Not signed into Firebase Auth: verify signed local/session storage token
        const verifiedManual = validateStoredSessionAgainstPolicy(latestUsers, latestPolicy);
        if (verifiedManual) {
          setCurrentUser(verifiedManual.user);
          setIsOriginAdminSession(verifiedManual.isOriginAdmin);
          setIsAuthenticated(true);
        } else {
          clearStoredSessionStorage();
          setCurrentUser(GUEST_UNAUTHENTICATED_USER);
          setIsOriginAdminSession(false);
          setIsAuthenticated(false);
        }
      }

      settled = true;
      window.clearTimeout(safetyTimer);
      setAuthReady(true);
    });

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'esppg_beneficiary_attendance' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setBeneficiaryAttendance(parsed);
        } catch {
          // Ignore malformed storage payload
        }
      } else if (e.key === 'esppg_institutions_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setInstitutions(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_beneficiary_records_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setBeneficiaryRecords(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_distribution_deliveries' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setDistributionDeliveries(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_distribution_logs' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setDistributionLogs(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_ompreng_returns' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setOmprengReturns(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_volunteers' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setVolunteerAttendance(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_volunteer_absences' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setVolunteerAbsences(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_pic_incentive_config_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') setPicIncentiveConfig(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_pic_incentive_payouts_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setPicIncentivePayouts(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_volunteer_incentive_config_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setVolunteerIncentiveConfig({
              ...defaultVolunteerIncentiveConfig,
              ...parsed,
              divisionRates: {
                ...defaultVolunteerIncentiveConfig.divisionRates,
                ...(parsed?.divisionRates || {}),
              },
            });
          }
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_volunteer_incentive_payouts_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setVolunteerIncentivePayouts(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_petty_cash_opening_v1' && e.newValue !== null) {
        const parsed = Number(e.newValue);
        if (Number.isFinite(parsed)) setPettyCashOpeningBalanceState(parsed);
      } else if (e.key === 'esppg_petty_cash_transactions_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setPettyCashTransactions(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === DASHBOARD_LAYOUT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setDashboardLayoutConfig(sanitizeDashboardLayoutConfig(parsed));
          }
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_inventory' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setInventory(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_stock_mutations_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setStockMutations(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_stock_opnames_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setStockOpnames(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_rab_items' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setRabItems(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_purchase_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setPurchaseOrders(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_qc_records' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setQualityControlRecords(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_master_bahan' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMasterBahan(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_master_suppliers' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMasterSuppliers(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_menu_items' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            menuItemsRef.current = parsed;
            setMenuItems(parsed);
          }
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_menu_ingredients_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            menuIngredientsMapRef.current = parsed;
            setMenuIngredientsMap(parsed);
          }
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_recipe_custom_columns_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setRecipeCustomColumns(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_division_jobdesks_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setDivisionJobdesks(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_fuel_logs' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setFuelLogs(parsed);
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_web_access_users_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const merged = mergeProtectedAdmins(parsed);
            webAccessUsersRef.current = merged;
            setWebAccessUsers(merged);
          }
        } catch {
          // Ignore
        }
      } else if (e.key === 'esppg_web_access_policy_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            const nextPol = { ...DEFAULT_WEB_ACCESS_POLICY, ...parsed };
            webAccessPolicyRef.current = nextPol;
            setWebAccessPolicy(nextPol);
          }
        } catch {
          // Ignore
        }
      }

      if (
        e.key === AUTH_SESSION_STORAGE_KEY ||
        e.key === 'esppg_web_access_users_v1' ||
        e.key === 'esppg_web_access_policy_v1' ||
        e.key === null
      ) {
        if (!auth.currentUser) {
          const verified = validateStoredSessionAgainstPolicy(
            webAccessUsersRef.current,
            webAccessPolicyRef.current
          );
          if (!verified) {
            clearStoredSessionStorage();
            setCurrentUser(GUEST_UNAUTHENTICATED_USER);
            setIsOriginAdminSession(false);
            setIsAuthenticated(false);
          } else {
            setCurrentUser(verified.user);
            setIsOriginAdminSession(verified.isOriginAdmin);
            setIsAuthenticated(true);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);

    return () => {
      window.clearTimeout(safetyTimer);
      window.removeEventListener('storage', handleStorageSync);
      unsubscribe();
    };
  }, []);

  // Real-time Firestore listener for Student Attendance (beneficiary_daily_records) when Firebase Auth is active
  useEffect(() => {
    if (!authReady || !isAuthenticated || !auth.currentUser) return;
    const attendanceQuery = query(
      collection(db, 'beneficiary_daily_records'),
      where('sppgId', '==', 'GFBQSYXD')
    );
    const unsubSnapshot = onSnapshot(
      attendanceQuery,
      snapshot => {
        if (snapshot.empty) return;
        const cloudLogs: BeneficiaryAttendanceLog[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as BeneficiaryAttendanceLog & { isDeleted?: boolean };
          if (!data || data.isDeleted) return;
          if (data.date && data.institutionId) {
            cloudLogs.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
        if (cloudLogs.length === 0) return;
        setBeneficiaryAttendance(prev => {
          const merged = [...prev];
          for (const cloud of cloudLogs) {
            const idx = merged.findIndex(
              item =>
                item.id === cloud.id ||
                (item.date === cloud.date && item.institutionId === cloud.institutionId)
            );
            if (idx >= 0) {
              merged[idx] = cloud;
            } else {
              merged.unshift(cloud);
            }
          }
          return merged;
        });
      },
      err => {
        console.warn('Firestore attendance listener running in local fallback:', err?.message || err);
      }
    );
    return () => unsubSnapshot();
  }, [authReady, isAuthenticated]);

  // Real-time Firestore listener for Beneficiary Nutrition & Anthropometry (beneficiary_nutrition_records)
  useEffect(() => {
    if (!authReady || !isAuthenticated || !auth.currentUser) return;
    const nutritionQuery = query(
      collection(db, 'beneficiary_nutrition_records'),
      where('sppgId', '==', 'GFBQSYXD')
    );
    const unsubNutrition = onSnapshot(
      nutritionQuery,
      snapshot => {
        if (snapshot.empty) return;
        const cloudRecords: BeneficiaryNutritionRecord[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as BeneficiaryNutritionRecord & { sppgId?: string };
          if (data && data.nik && data.fullName) {
            cloudRecords.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
        if (cloudRecords.length === 0) return;
        setBeneficiaryRecords(prev => {
          const byId = new Map<string, BeneficiaryNutritionRecord>();
          prev.forEach(item => byId.set(item.id, item));
          cloudRecords.forEach(cloud => byId.set(cloud.id, cloud));
          return Array.from(byId.values());
        });
      },
      err => {
        console.warn('Firestore nutrition listener running in local fallback:', err?.message || err);
      }
    );
    return () => unsubNutrition();
  }, [authReady, isAuthenticated]);

  // Real-time Firestore listener for Maternal Health Records (maternal_health_records)
  useEffect(() => {
    if (!authReady || !isAuthenticated || !auth.currentUser) return;
    const maternalQuery = query(
      collection(db, 'maternal_health_records'),
      where('sppgId', '==', 'GFBQSYXD')
    );
    const unsubMaternal = onSnapshot(
      maternalQuery,
      snapshot => {
        if (snapshot.empty) return;
        const cloudRecords: MaternalHealthRecord[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as MaternalHealthRecord & { sppgId?: string };
          if (data && data.nik && data.fullName) {
            cloudRecords.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
        if (cloudRecords.length === 0) return;
        setMaternalHealthRecords(prev => {
          const byId = new Map<string, MaternalHealthRecord>();
          prev.forEach(item => byId.set(item.id, item));
          cloudRecords.forEach(cloud => byId.set(cloud.id, cloud));
          return Array.from(byId.values());
        });
      },
      err => {
        console.warn('Firestore maternal health listener running in local fallback:', err?.message || err);
      }
    );
    return () => unsubMaternal();
  }, [authReady, isAuthenticated]);

  // Real-time Firestore listener for Lactating Health Records (lactating_health_records)
  useEffect(() => {
    if (!authReady || !isAuthenticated || !auth.currentUser) return;
    const lactatingQuery = query(
      collection(db, 'lactating_health_records'),
      where('sppgId', '==', 'GFBQSYXD')
    );
    const unsubLactating = onSnapshot(
      lactatingQuery,
      snapshot => {
        if (snapshot.empty) return;
        const cloudRecords: LactatingHealthRecord[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as LactatingHealthRecord & { sppgId?: string };
          if (data && data.nik && data.fullName) {
            cloudRecords.push({
              ...data,
              id: data.id || docSnap.id,
            });
          }
        });
        if (cloudRecords.length === 0) return;
        setLactatingHealthRecords(prev => {
          const byId = new Map<string, LactatingHealthRecord>();
          prev.forEach(item => byId.set(item.id, item));
          cloudRecords.forEach(cloud => byId.set(cloud.id, cloud));
          return Array.from(byId.values());
        });
      },
      err => {
        console.warn('Firestore lactating health listener running in local fallback:', err?.message || err);
      }
    );
    return () => unsubLactating();
  }, [authReady, isAuthenticated]);

  // Re-validate session periodically or when whitelist/policy updates
  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    if (auth.currentUser) {
      const emailLower = (auth.currentUser.email || '').trim().toLowerCase();
      const isSuperAdmin = isProtectedSuperAdminEmail(emailLower);
      const webEntry = webAccessUsers.find(u => u.email.trim().toLowerCase() === emailLower);
      const isBlocked =
        (webEntry && !webEntry.isActive && !isSuperAdmin) ||
        (!webEntry && webAccessPolicy.strictWhitelistOnly && !isSuperAdmin);
      if (isBlocked) {
        clearStoredSessionStorage();
        setCurrentUser(GUEST_UNAUTHENTICATED_USER);
        setIsOriginAdminSession(false);
        setIsAuthenticated(false);
        signOut(auth).catch(() => {});
      }
      return;
    }

    const verified = validateStoredSessionAgainstPolicy(webAccessUsers, webAccessPolicy);
    if (!verified) {
      clearStoredSessionStorage();
      setCurrentUser(GUEST_UNAUTHENTICATED_USER);
      setIsOriginAdminSession(false);
      setIsAuthenticated(false);
    }
  }, [authReady, isAuthenticated, webAccessUsers, webAccessPolicy]);

  const loginWithProfile = (
    user: UserProfile,
    rememberMe: boolean = false,
    options?: { isDemoSession?: boolean }
  ) => {
    explicitLogoutRef.current = false;
    const isDemoSession = Boolean(options?.isDemoSession);
    const isSuperAdmin = user.role === 'Admin Utama' || isProtectedSuperAdminEmail(user.email);
    const signedSession = createSignedAuthSession({
      uid: user.uid,
      email: user.email,
      role: user.role,
      rememberMe,
      isDemoSession,
    });
    const payload = JSON.stringify(signedSession);

    if (rememberMe) {
      safeWriteLocalStorage(AUTH_SESSION_STORAGE_KEY, payload);
      try {
        sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      } catch {
        // Ignore
      }
    } else {
      let wroteSession = false;
      try {
        sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, payload);
        wroteSession = true;
      } catch {
        wroteSession = false;
      }
      if (!wroteSession) {
        safeWriteLocalStorage(AUTH_SESSION_STORAGE_KEY, payload);
      } else {
        try {
          localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        } catch {
          // Ignore
        }
      }
    }

    safeWriteLocalStorage(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));

    setCurrentUser(user);
    setIsOriginAdminSession(isSuperAdmin);
    setIsAuthenticated(true);

    const loginAudit: AuditLog = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: user.uid,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      module: 'auth',
      details: `${isDemoSession ? '[Pratinjau] ' : ''}Berhasil masuk ke sistem E-SPPG TMG2 sebagai ${user.name} (${user.role})`,
    };
    setAuditLogs(prev => [loginAudit, ...prev]);
  };

  const logout = async () => {
    explicitLogoutRef.current = true;
    const closingName = currentUser.name;
    if (isAuthenticated && currentUser.uid !== GUEST_UNAUTHENTICATED_USER.uid) {
      await logAudit('LOGOUT', 'auth', `Keluar dari sesi E-SPPG TMG2 (${closingName})`);
    }
    clearStoredSessionStorage();
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Non-blocking fallback
    }
    setCurrentUser(GUEST_UNAUTHENTICATED_USER);
    setIsOriginAdminSession(false);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
      window.history.replaceState(null, '', LOGIN_PATH);
    }
    addToast('info', 'Keluar Sistem', 'Anda telah keluar dari sistem E-SPPG TMG2.');
  };

  // Role Switcher helper (Hanya Admin Utama terautentikasi yang diizinkan simulasi peran)
  const switchRole = (role: RoleType) => {
    if (!isAuthenticated || (!isOriginAdminSession && currentUser.role !== 'Admin Utama')) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang berwenang melakukan simulasi ganti peran.');
      return;
    }
    const matchedUser = initialUsers.find(u => u.role === role) || {
      uid: 'user-' + Date.now(),
      name: `Pengguna (${role})`,
      email: `${role.toLowerCase().replace(/[^a-z0-9]/g, '')}@sppg-tmg2.id`,
      role,
      division: resolveDivisionForRole(role),
      isActive: true,
    };
    setCurrentUser(matchedUser);
    safeWriteLocalStorage(CURRENT_USER_STORAGE_KEY, JSON.stringify(matchedUser));
    logAudit('LOGIN', 'auth', `Simulasi ganti peran aktif ke ${role}`);
    addToast('info', 'Peran Diperbarui', `Sekarang Anda bertindak sebagai: ${role}`);
  };

  // Manual Web Login Access Management (Admin Utama Only)
  const canManageWebAccess = () =>
    currentUser.role === 'Admin Utama' ||
    isOriginAdminSession ||
    isProtectedSuperAdminEmail(currentUser.email);

  const provisionSecondaryFirebaseAccount = async (
    email: string,
    password: string
  ): Promise<{
    uid?: string;
    status: 'created' | 'linked' | 'provider-disabled' | 'weak-password' | 'skipped-short' | 'error';
    errorCode?: string;
  }> => {
    if (!password || password.length < 6) {
      return { status: 'skipped-short' };
    }
    try {
      const secAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secAuth, email, password);
      const uid = cred.user.uid;
      await signOut(secAuth).catch(() => {});
      return { uid, status: 'created' };
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        try {
          const secAuth = getSecondaryAuth();
          const cred = await signInWithEmailAndPassword(secAuth, email, password);
          const uid = cred.user.uid;
          await signOut(secAuth).catch(() => {});
          return { uid, status: 'linked' };
        } catch {
          return { status: 'error', errorCode: code };
        }
      }
      if (code === 'auth/operation-not-allowed') {
        return { status: 'provider-disabled', errorCode: code };
      }
      if (code === 'auth/weak-password') {
        return { status: 'weak-password', errorCode: code };
      }
      return { status: 'error', errorCode: code };
    }
  };

  const syncWebAccessToFirestoreSafely = async (userRecord: WebAccessUser): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      const normalizedEmail = userRecord.email.trim().toLowerCase();
      const safeDocId = `wau_${userRecord.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const emailDocId = getWebAccessEmailDocId(normalizedEmail);
      const basePayload = {
        sppgId: 'GFBQSYXD',
        webAccessId: userRecord.id,
        firebaseUid: userRecord.firebaseUid || '',
        name: userRecord.name,
        email: normalizedEmail,
        roleId: userRecord.role === 'Admin Utama' ? 'role-admin' : 'role-staff',
        roleName: userRecord.role,
        division: userRecord.division || '',
        supplierId: userRecord.supplierId || '',
        supplierName: userRecord.supplierName || '',
        passwordHash: userRecord.passwordHash || '',
        isActive: userRecord.isActive,
        allowGoogleLogin: userRecord.allowGoogleLogin,
        isProtectedAdmin: Boolean(userRecord.isProtectedAdmin),
        notes: userRecord.notes || '',
        status: userRecord.isActive ? 'Aktif' : 'Nonaktif',
        createdAt: userRecord.createdAt,
        createdBy: userRecord.createdBy,
        updatedAt: userRecord.updatedAt || new Date().toISOString(),
        updatedBy: userRecord.updatedBy || currentUser.name,
        lastLoginAt: userRecord.lastLoginAt || '',
      };

      const writes: Promise<void>[] = [
        setDoc(
          doc(db, 'users', safeDocId),
          sanitizeFirestoreData({
            id: safeDocId,
            uid: safeDocId,
            ...basePayload,
          }),
          { merge: true }
        ),
        setDoc(
          doc(db, 'users', emailDocId),
          sanitizeFirestoreData({
            id: emailDocId,
            uid: emailDocId,
            ...basePayload,
          }),
          { merge: true }
        ),
      ];

      if (userRecord.firebaseUid) {
        const cleanFbUid = userRecord.firebaseUid.replace(/[^a-zA-Z0-9_-]/g, '_');
        writes.push(
          setDoc(
            doc(db, 'users', cleanFbUid),
            sanitizeFirestoreData({
              id: cleanFbUid,
              uid: cleanFbUid,
              ...basePayload,
            }),
            { merge: true }
          )
        );
      }

      await Promise.all(writes);
      return true;
    } catch {
      return false;
    }
  };

  const syncAllWebAccessToCloud = async (): Promise<{ synced: number; failed: number }> => {
    if (!auth.currentUser) {
      return { synced: 0, failed: webAccessUsersRef.current.length };
    }
    let synced = 0;
    let failed = 0;
    for (const u of webAccessUsersRef.current) {
      const ok = await syncWebAccessToFirestoreSafely(u);
      if (ok) synced++;
      else failed++;
    }
    try {
      await Promise.all([
        setDoc(
          doc(db, 'app_settings', 'web_access_policy'),
          sanitizeFirestoreData({
            id: 'web_access_policy',
            sppgId: 'GFBQSYXD',
            ...webAccessPolicyRef.current,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
          { merge: true }
        ),
        setDoc(
          doc(db, 'app_settings', 'role_module_access'),
          sanitizeFirestoreData({
            id: 'role_module_access',
            sppgId: 'GFBQSYXD',
            accessMap: roleModuleAccess,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
          { merge: true }
        ),
        setDoc(
          doc(db, 'app_settings', 'dashboard_layout_config'),
          sanitizeFirestoreData({
            id: 'dashboard_layout_config',
            sppgId: 'GFBQSYXD',
            config: dashboardLayoutConfig,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
          { merge: true }
        ),
      ]);
    } catch {
      // Policy sync best-effort
    }
    return { synced, failed };
  };

  const connectFirebaseAdminSync = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;
      const emailLower = (fbUser.email || '').trim().toLowerCase();
      setFirebaseAuthEmail(fbUser.email || null);

      const matchedLocal = webAccessUsersRef.current.find(
        u => u.email.trim().toLowerCase() === emailLower
      );
      const isAdminEmail =
        isProtectedSuperAdminEmail(emailLower) ||
        matchedLocal?.role === 'Admin Utama' ||
        matchedLocal?.role === 'Kepala SPPG';

      if (!isAdminEmail) {
        await signOut(auth).catch(() => {});
        setFirebaseAuthEmail(null);
        const deniedMsg = `Akun Google ${fbUser.email} bukan Admin Utama SPPG. Gunakan akun Google Admin Utama (sppgkrejengantemenggungan2@gmail.com atau gustiagung1100@gmail.com).`;
        addToast('error', 'Bukan Akun Admin', deniedMsg);
        return { ok: false, message: deniedMsg };
      }

      const { synced, failed } = await syncAllWebAccessToCloud();
      const msg =
        failed === 0
          ? `Sinkronisasi Cloud aktif via ${fbUser.email}. ${synced} akun login & kebijakan berhasil diunggah ke Firestore.`
          : `Terhubung sebagai ${fbUser.email}, ${synced} akun tersinkron (${failed} gagal).`;
      addToast(failed === 0 ? 'success' : 'warning', 'Sinkronisasi Cloud Aktif', msg);
      return { ok: true, message: msg };
    } catch (err: any) {
      const msg =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Jendela Google ditutup sebelum koneksi selesai.'
          : err?.message || 'Gagal menghubungkan akun Google Admin.';
      addToast('error', 'Koneksi Cloud Gagal', msg);
      return { ok: false, message: msg };
    }
  };

  const persistWebAccessUsers = (nextUsers: WebAccessUser[]): boolean => {
    const normalized = mergeProtectedAdmins(nextUsers);
    webAccessUsersRef.current = normalized;
    setWebAccessUsers(normalized);
    return safeWriteLocalStorage('esppg_web_access_users_v1', JSON.stringify(normalized));
  };

  const findWebAccessUser = (identifier: string): WebAccessUser | undefined => {
    const normalized = identifier.trim().toLowerCase();
    if (!normalized) return undefined;
    const list = webAccessUsersRef.current;
    const exactEmail = list.find(u => u.email.trim().toLowerCase() === normalized);
    if (exactEmail) return exactEmail;
    return list.find(u => u.email.trim().split('@')[0].toLowerCase() === normalized);
  };

  const recordWebLoginTimestamp = (email: string) => {
    const normalized = email.trim().toLowerCase();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nextUsers = webAccessUsersRef.current.map(u =>
      u.email.trim().toLowerCase() === normalized ? { ...u, lastLoginAt: now } : u
    );
    persistWebAccessUsers(nextUsers);
    const updatedTarget = nextUsers.find(u => u.email.trim().toLowerCase() === normalized);
    if (updatedTarget) {
      syncWebAccessToFirestoreSafely(updatedTarget).catch(() => {});
    }
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
    if (!canManageWebAccess()) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mendaftarkan akses login.');
      return false;
    }
    const cleanEmail = payload.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailPattern.test(cleanEmail)) {
      addToast('error', 'Email Tidak Valid', 'Masukkan alamat email yang valid (contoh: nama@domain.id).');
      return false;
    }
    if (!payload.password || payload.password.trim().length < 4) {
      addToast('error', 'Kata Sandi Terlalu Pendek', 'Kata sandi minimal 4 karakter.');
      return false;
    }
    const exists = webAccessUsersRef.current.some(u => u.email.trim().toLowerCase() === cleanEmail);
    if (exists) {
      addToast('error', 'Email Sudah Terdaftar', `Akun ${cleanEmail} sudah ada di daftar akses login.`);
      return false;
    }

    const cleanPassword = payload.password.trim();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const prov = await provisionSecondaryFirebaseAccount(cleanEmail, cleanPassword);

    const newUser: WebAccessUser = {
      id: `wau-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      firebaseUid: prov.uid,
      name: payload.name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: payload.role,
      division: resolveDivisionForRole(payload.role, payload.division),
      supplierId: payload.role === 'Supplier / Mitra Pangan' ? payload.supplierId : undefined,
      supplierName: payload.role === 'Supplier / Mitra Pangan' ? payload.supplierName : undefined,
      passwordHash: hashLoginPassword(cleanEmail, cleanPassword),
      isActive: payload.isActive,
      allowGoogleLogin: payload.allowGoogleLogin,
      isProtectedAdmin: isProtectedSuperAdminEmail(cleanEmail),
      createdAt: now,
      createdBy: currentUser.name,
      updatedAt: now,
      updatedBy: currentUser.name,
      notes: payload.notes?.trim() || undefined,
    };

    const nextUsers = [newUser, ...webAccessUsersRef.current];
    const savedLocally = persistWebAccessUsers(nextUsers);
    const syncedCloud = await syncWebAccessToFirestoreSafely(newUser);

    if (!savedLocally && !syncedCloud) {
      addToast(
        'error',
        'Penyimpanan Penuh',
        'Kapasitas penyimpanan browser penuh dan koneksi cloud belum aktif. Hapus data cache lama lalu coba lagi.'
      );
      return false;
    }

    await logAudit(
      'CREATE',
      'settings',
      `Mendaftarkan akses login web untuk ${newUser.email} (${newUser.role}) — Status: ${newUser.isActive ? 'Diizinkan' : 'Dinonaktifkan'}${syncedCloud ? ' [Tersinkron Cloud]' : ' [Lokal Browser]'}`
    );

    if (!syncedCloud) {
      addToast(
        'warning',
        'Tersimpan Lokal (Belum Sinkron Cloud)',
        `Akun ${newUser.email} siap dipakai login Sandi di browser ini. Untuk login dari HP/perangkat/URL lain, klik "Hubungkan Google Admin" agar tersinkron ke Cloud.`
      );
    } else if (prov.status === 'provider-disabled' || prov.status === 'skipped-short') {
      addToast(
        'success',
        'Akun Disimpan & Tersinkron Cloud',
        `Akun ${newUser.email} dapat login dengan Sandi di perangkat ini atau tombol "Masuk dengan Akun Google" di semua perangkat.`
      );
    } else {
      addToast('success', 'Akses Login Disimpan', `Akun ${newUser.email} berhasil didaftarkan dan siap digunakan.`);
    }
    return true;
  };

  const registerSelfWebAccessUser = async (payload: {
    name: string;
    email: string;
    password: string;
    firebaseUid?: string;
  }): Promise<WebAccessUser | null> => {
    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return null;

    const policy = webAccessPolicyRef.current;
    if (!policy.allowSelfRegistration && !isProtectedSuperAdminEmail(cleanEmail)) {
      return null;
    }

    const existing = webAccessUsersRef.current.find(
      u => u.email.trim().toLowerCase() === cleanEmail
    );
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (existing) {
      if (!existing.firebaseUid && payload.firebaseUid) {
        const updatedExisting: WebAccessUser = {
          ...existing,
          firebaseUid: payload.firebaseUid,
          updatedAt: now,
        };
        const nextList = webAccessUsersRef.current.map(u =>
          u.id === existing.id ? updatedExisting : u
        );
        persistWebAccessUsers(nextList);
        await syncWebAccessToFirestoreSafely(updatedExisting);
        return updatedExisting;
      }
      return existing;
    }

    const isSuperAdmin = isProtectedSuperAdminEmail(cleanEmail);
    const newUser: WebAccessUser = {
      id: `wau-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      firebaseUid: payload.firebaseUid,
      name: payload.name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: isSuperAdmin ? 'Admin Utama' : 'Kepala SPPG',
      passwordHash: hashLoginPassword(cleanEmail, payload.password.trim()),
      isActive: true,
      allowGoogleLogin: true,
      isProtectedAdmin: isSuperAdmin,
      createdAt: now,
      createdBy: 'Pendaftaran Mandiri',
      updatedAt: now,
      updatedBy: 'Pendaftaran Mandiri',
      lastLoginAt: now,
      notes: 'Akun terdaftar melalui form Pendaftaran Mandiri',
    };

    persistWebAccessUsers([newUser, ...webAccessUsersRef.current]);
    await syncWebAccessToFirestoreSafely(newUser);
    return newUser;
  };

  const updateWebAccessUser = async (
    id: string,
    updates: Partial<Omit<WebAccessUser, 'id' | 'passwordHash'>> & { newPassword?: string }
  ): Promise<boolean> => {
    if (!canManageWebAccess()) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengubah akses login.');
      return false;
    }
    const target = webAccessUsersRef.current.find(u => u.id === id);
    if (!target) return false;

    const isProtected = Boolean(target.isProtectedAdmin || isProtectedSuperAdminEmail(target.email));
    const nextEmail = isProtected
      ? target.email.trim().toLowerCase()
      : (updates.email ?? target.email).trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!nextEmail || !emailPattern.test(nextEmail)) {
      addToast('error', 'Email Tidak Valid', 'Masukkan alamat email login yang valid.');
      return false;
    }

    const isEmailChanged = nextEmail !== target.email.trim().toLowerCase();
    if (isEmailChanged) {
      const dup = webAccessUsersRef.current.some(
        u => u.id !== id && u.email.trim().toLowerCase() === nextEmail
      );
      if (dup) {
        addToast('error', 'Email Duplikat', `Email ${nextEmail} sudah dipakai oleh akun lain.`);
        return false;
      }
    }

    const trimmedNewPass = updates.newPassword?.trim() || '';
    if (trimmedNewPass.length > 0 && trimmedNewPass.length < 4) {
      addToast('error', 'Kata Sandi Terlalu Pendek', 'Kata sandi baru minimal 4 karakter.');
      return false;
    }
    if (isEmailChanged && trimmedNewPass.length === 0) {
      addToast(
        'error',
        'Kata Sandi Baru Wajib Diisi',
        'Karena email login diubah, masukkan Kata Sandi Baru minimal 4 karakter agar akun tetap bisa login.'
      );
      return false;
    }

    if (isProtected && updates.isActive === false) {
      addToast('warning', 'Akun Terlindungi', 'Akun Admin Utama inti tidak dapat dinonaktifkan.');
      return false;
    }
    if (isProtected && updates.role && updates.role !== 'Admin Utama') {
      addToast('warning', 'Akun Terlindungi', 'Peran Admin Utama inti tidak dapat diturunkan.');
      return false;
    }

    let nextFirebaseUid = target.firebaseUid;
    if ((!nextFirebaseUid || isEmailChanged) && trimmedNewPass.length >= 6) {
      const prov = await provisionSecondaryFirebaseAccount(nextEmail, trimmedNewPass);
      if (prov.uid) {
        nextFirebaseUid = prov.uid;
      }
    }

    const nextRole = isProtected ? 'Admin Utama' : (updates.role ?? target.role);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const { newPassword: _discardPassword, ...cleanUpdates } = updates;
    void _discardPassword;

    const updatedUser: WebAccessUser = {
      ...target,
      ...cleanUpdates,
      firebaseUid: nextFirebaseUid,
      email: nextEmail,
      name: (updates.name ?? target.name).trim() || nextEmail.split('@')[0],
      role: nextRole,
      division: resolveDivisionForRole(nextRole, updates.division ?? target.division),
      supplierId:
        nextRole === 'Supplier / Mitra Pangan'
          ? updates.supplierId ?? target.supplierId
          : undefined,
      supplierName:
        nextRole === 'Supplier / Mitra Pangan'
          ? updates.supplierName ?? target.supplierName
          : undefined,
      isActive: isProtected ? true : (updates.isActive ?? target.isActive),
      passwordHash:
        trimmedNewPass.length > 0
          ? hashLoginPassword(nextEmail, trimmedNewPass)
          : target.passwordHash,
      updatedAt: now,
      updatedBy: currentUser.name,
    };

    const nextUsers = webAccessUsersRef.current.map(u => (u.id === id ? updatedUser : u));
    const savedLocally = persistWebAccessUsers(nextUsers);

    if (isEmailChanged && auth.currentUser) {
      await deleteDoc(doc(db, 'users', getWebAccessEmailDocId(target.email))).catch(() => {});
    }
    const syncedCloud = await syncWebAccessToFirestoreSafely(updatedUser);

    if (!savedLocally && !syncedCloud) {
      addToast('error', 'Gagal Menyimpan Lokal', 'Penyimpanan browser penuh. Perubahan gagal disimpan.');
      return false;
    }

    await logAudit(
      'UPDATE',
      'settings',
      `Memperbarui akses login web ${updatedUser.email} (${updatedUser.role}${trimmedNewPass ? ', reset sandi' : ''})`
    );
    addToast(
      syncedCloud ? 'success' : 'warning',
      syncedCloud ? 'Akses Login Diperbarui' : 'Diperbarui Lokal (Belum Sinkron Cloud)',
      syncedCloud
        ? `Pengaturan akun ${updatedUser.email} disimpan dan tersinkron ke Cloud.`
        : `Perubahan ${updatedUser.email} tersimpan di browser ini. Hubungkan Google Admin untuk menyinkronkan ke perangkat lain.`
    );
    return true;
  };

  const toggleWebAccessStatus = async (id: string) => {
    if (!canManageWebAccess()) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengaktifkan/menonaktifkan akses login.');
      return;
    }
    const target = webAccessUsersRef.current.find(u => u.id === id);
    if (!target) return;
    if (target.isProtectedAdmin || isProtectedSuperAdminEmail(target.email)) {
      addToast('warning', 'Akun Terlindungi', 'Akun Admin Utama inti harus tetap aktif agar sistem tetap dapat dikelola.');
      return;
    }
    const nextActive = !target.isActive;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedUser: WebAccessUser = {
      ...target,
      isActive: nextActive,
      updatedAt: now,
      updatedBy: currentUser.name,
    };
    const nextUsers = webAccessUsersRef.current.map(u => (u.id === id ? updatedUser : u));
    persistWebAccessUsers(nextUsers);
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
    if (!canManageWebAccess()) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat menghapus akun akses login.');
      return false;
    }
    const target = webAccessUsersRef.current.find(u => u.id === id);
    if (!target) return false;
    if (target.isProtectedAdmin || isProtectedSuperAdminEmail(target.email)) {
      addToast('warning', 'Tidak Dapat Dihapus', 'Akun Admin Utama inti dilindungi oleh sistem.');
      return false;
    }
    const nextUsers = webAccessUsersRef.current.filter(u => u.id !== id);
    persistWebAccessUsers(nextUsers);

    if (auth.currentUser) {
      try {
        const safeDocId = `wau_${target.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const emailDocId = getWebAccessEmailDocId(target.email);
        const deletions: Promise<void>[] = [
          deleteDoc(doc(db, 'users', safeDocId)),
          deleteDoc(doc(db, 'users', emailDocId)),
        ];
        if (target.firebaseUid) {
          deletions.push(
            deleteDoc(doc(db, 'users', target.firebaseUid.replace(/[^a-zA-Z0-9_-]/g, '_')))
          );
        }
        await Promise.all(deletions);
      } catch {
        // Non-blocking
      }
    }

    await logAudit('DELETE', 'settings', `Menghapus akun akses login web: ${target.email}`);
    addToast('info', 'Akun Dihapus', `Akses login untuk ${target.email} telah dihapus.`);
    return true;
  };

  const updateWebAccessPolicy = async (policy: Partial<WebAccessPolicy>) => {
    if (!canManageWebAccess()) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengubah kebijakan login.');
      return;
    }
    const nextPolicy: WebAccessPolicy = { ...webAccessPolicyRef.current, ...policy };
    webAccessPolicyRef.current = nextPolicy;
    setWebAccessPolicy(nextPolicy);
    safeWriteLocalStorage('esppg_web_access_policy_v1', JSON.stringify(nextPolicy));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'web_access_policy'),
          sanitizeFirestoreData({
            id: 'web_access_policy',
            sppgId: 'GFBQSYXD',
            ...nextPolicy,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
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
    safeWriteLocalStorage('esppg_dynamic_form_schemas_v1', JSON.stringify(nextMap));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'dynamic_form_schemas'),
          sanitizeFirestoreData({
            id: 'dynamic_form_schemas',
            sppgId: 'GFBQSYXD',
            schemas: nextMap,
            updatedAt: updatedSchema.updatedAt,
            updatedBy: currentUser.name,
          }),
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
    safeWriteLocalStorage('esppg_dynamic_form_schemas_v1', JSON.stringify(nextMap));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'dynamic_form_schemas'),
          sanitizeFirestoreData({
            id: 'dynamic_form_schemas',
            sppgId: 'GFBQSYXD',
            schemas: nextMap,
            updatedAt: defaultSchema.updatedAt,
            updatedBy: currentUser.name,
          }),
          { merge: true }
        );
      } catch {
        // Non-blocking fallback
      }
    }
    await logAudit('UPDATE', defaultSchema.moduleKey || 'system', `Mereset struktur form "${defaultSchema.title}" ke pengaturan default`);
    addToast('info', 'Struktur Form Direset', `"${defaultSchema.title}" dikembalikan ke pengaturan default.`);
  };

  // Permission Check (Aligned strictly with Route-Level & Custom Module-Level RBAC)
  const hasPermission = (module: ModuleKey, action: ActionPermission): boolean => {
    if (!isAuthenticated || !currentUser.isActive) return false;
    if (!canRoleAccessModule(currentUser.role, module, roleModuleAccess)) return false;
    if (currentUser.role === 'Admin Utama') return true;
    // Supplier role strict isolation on internal modules unless explicitly granted by Admin Utama
    if (currentUser.role === 'Supplier / Mitra Pangan') {
      if (module === 'supplier_portal') return true;
      if (module === 'settings' && action === 'view') return true;
      return action === 'view';
    }
    const roleMap = rolePermissions[currentUser.role];
    if (!roleMap) return false;
    return roleMap[action] ?? false;
  };

  // Audit Logger (includes sppgId + collision-free ID to comply with Firestore rules)
  const logAudit = async (action: AuditLog['action'], module: AuditLog['module'], details: string) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        const nowIso = new Date().toISOString();
        await setDoc(
          doc(db, 'audit_logs', newLog.id),
          sanitizeFirestoreData({
            ...newLog,
            sppgId: 'GFBQSYXD',
            status: 'Recorded',
            isDeleted: false,
            createdAt: nowIso,
            createdBy: currentUser.uid || 'system',
            updatedAt: nowIso,
            updatedBy: currentUser.uid || 'system',
          })
        );
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

  const updateRoleModuleAccess = async (nextMap: RoleModuleAccessMap) => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengubah pengaturan akses modul/menu.');
      return;
    }
    const sanitized = sanitizeRoleModuleAccess(nextMap);
    setRoleModuleAccess(sanitized);
    safeWriteLocalStorage(ROLE_MODULE_ACCESS_STORAGE_KEY, JSON.stringify(sanitized));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'role_module_access'),
          sanitizeFirestoreData({
            id: 'role_module_access',
            sppgId: 'GFBQSYXD',
            settingKey: 'role_module_access',
            settingCategory: 'rbac',
            status: 'Aktif',
            accessMap: sanitized,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
          { merge: true }
        );
      } catch {
        // Non-blocking fallback to LocalStorage
      }
    }

    await logAudit(
      'UPDATE',
      'settings',
      'Memperbarui matriks hak akses modul/menu per peran secara manual oleh Admin Utama'
    );
    addToast(
      'success',
      'Akses Modul Disimpan',
      'Matriks hak akses modul/menu per peran berhasil diperbarui dan diterapkan langsung.'
    );
  };

  const resetRoleModuleAccess = async () => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mereset pengaturan akses modul.');
      return;
    }
    const defaults = buildDefaultRoleModuleAccess();
    setRoleModuleAccess(defaults);
    safeWriteLocalStorage(ROLE_MODULE_ACCESS_STORAGE_KEY, JSON.stringify(defaults));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'role_module_access'),
          sanitizeFirestoreData({
            id: 'role_module_access',
            sppgId: 'GFBQSYXD',
            settingKey: 'role_module_access',
            settingCategory: 'rbac',
            status: 'Aktif',
            accessMap: defaults,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
          { merge: true }
        );
      } catch {
        // Non-blocking fallback to LocalStorage
      }
    }

    await logAudit('UPDATE', 'settings', 'Mereset matriks hak akses modul/menu ke pengaturan default sistem');
    addToast('info', 'Akses Modul Direset', 'Hak akses modul/menu seluruh peran dikembalikan ke konfigurasi default.');
  };

  const updateDashboardLayoutConfig = async (nextConfig: DashboardLayoutConfig) => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mengubah tata letak & hak akses Dashboard Terpadu.');
      return;
    }
    const nowIso = new Date().toISOString();
    const sanitized = sanitizeDashboardLayoutConfig({
      ...nextConfig,
      updatedAt: nowIso,
      updatedBy: currentUser.name,
    });
    setDashboardLayoutConfig(sanitized);
    safeWriteLocalStorage(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(sanitized));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'dashboard_layout_config'),
          sanitizeFirestoreData({
            id: 'dashboard_layout_config',
            sppgId: 'GFBQSYXD',
            settingKey: 'dashboard_layout_config',
            settingCategory: 'dashboard',
            status: 'Aktif',
            config: sanitized,
            updatedAt: nowIso,
            updatedBy: currentUser.name,
          }),
          { merge: true }
        );
      } catch {
        // Non-blocking fallback to LocalStorage
      }
    }

    await logAudit(
      'UPDATE',
      'settings',
      'Memperbarui tata letak & hak akses visibilitas data Dashboard Terpadu'
    );
    addToast(
      'success',
      'Pengaturan Dashboard Disimpan',
      'Tata letak dan aturan siapa yang boleh/dilarang melihat data Dashboard Terpadu telah diterapkan.'
    );
  };

  const resetDashboardLayoutConfig = async () => {
    if (currentUser.role !== 'Admin Utama') {
      addToast('error', 'Akses Ditolak', 'Hanya Admin Utama yang dapat mereset tata letak Dashboard Terpadu.');
      return;
    }
    const nowIso = new Date().toISOString();
    const defaults = sanitizeDashboardLayoutConfig({
      ...buildDefaultDashboardLayoutConfig(),
      updatedAt: nowIso,
      updatedBy: currentUser.name,
    });
    setDashboardLayoutConfig(defaults);
    safeWriteLocalStorage(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(defaults));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'app_settings', 'dashboard_layout_config'),
          sanitizeFirestoreData({
            id: 'dashboard_layout_config',
            sppgId: 'GFBQSYXD',
            settingKey: 'dashboard_layout_config',
            settingCategory: 'dashboard',
            status: 'Aktif',
            config: defaults,
            updatedAt: nowIso,
            updatedBy: currentUser.name,
          }),
          { merge: true }
        );
      } catch {
        // Non-blocking fallback to LocalStorage
      }
    }

    await logAudit('UPDATE', 'settings', 'Mereset tata letak & hak lihat Dashboard Terpadu ke default');
    addToast('info', 'Dashboard Direset', 'Tata letak dan visibilitas seluruh bagian Dashboard Terpadu dikembalikan ke bawaan.');
  };

  // Real-time cascade helper: recompute menus & RAB when beneficiary portions change
  const syncMenusAndRABForInstitutions = (nextInstitutions: Institution[]) => {
    institutionsRef.current = nextInstitutions;
    const nextQuotaSmall = nextInstitutions.reduce((s, i) => s + (i.smallPortions || 0), 0);
    const nextQuotaLarge = nextInstitutions.reduce((s, i) => s + (i.largePortions || 0), 0);
    const recomputedMenus = recomputeMenuItemsFromRecipes(
      menuItemsRef.current,
      menuIngredientsMapRef.current,
      masterUnits,
      nextQuotaSmall,
      nextQuotaLarge
    );
    menuItemsRef.current = recomputedMenus;
    setMenuItems(recomputedMenus);
    syncLinkedMenuPlansToRABSilently(recomputedMenus, menuIngredientsMapRef.current, nextInstitutions);
  };

  // Institutions CRUD & Quota History (Real-time cascading to Distribusi, Antropometri, Menu & RAB)
  const addInstitution = async (inst: Omit<Institution, 'id'>) => {
    const total = Number(inst.smallPortions) + Number(inst.largePortions);
    const newInst: Institution = { ...inst, id: 'inst-' + Date.now(), totalPortions: total };
    const nextInstitutions = [...institutionsRef.current, newInst];
    setInstitutions(nextInstitutions);
    syncMenusAndRABForInstitutions(nextInstitutions);
    await logAudit('CREATE', 'institutions', `Menambah data lembaga penerima manfaat: ${inst.name} (${total} porsi, sinkron ke Menu & RAB)`);
    addToast('success', 'Lembaga Ditambahkan & Tersinkron', `${inst.name} ditambahkan (${total} porsi). Porsi menu, gramasi bahan & RAB diperbarui otomatis.`);
  };

  const updateInstitution = async (id: string, inst: Partial<Institution>) => {
    const prevTarget = institutionsRef.current.find(i => i.id === id);
    let updatedInst: Institution | null = null;

    const nextInstitutions = institutionsRef.current.map(item => {
      if (item.id === id) {
        const small = inst.smallPortions !== undefined ? Number(inst.smallPortions) : item.smallPortions;
        const large = inst.largePortions !== undefined ? Number(inst.largePortions) : item.largePortions;
        updatedInst = {
          ...item,
          ...inst,
          smallPortions: small,
          largePortions: large,
          totalPortions: small + large,
        };
        return updatedInst;
      }
      return item;
    });

    setInstitutions(nextInstitutions);
    if (inst.smallPortions !== undefined || inst.largePortions !== undefined) {
      syncMenusAndRABForInstitutions(nextInstitutions);
    }

    const nextName = inst.name !== undefined ? inst.name : prevTarget?.name;
    const nextPicName = inst.picName !== undefined ? inst.picName : prevTarget?.picName;
    const nextPicPhone = inst.picPhone !== undefined ? inst.picPhone : prevTarget?.picPhone;
    const nextBankName = inst.bankName !== undefined ? inst.bankName : prevTarget?.bankName;
    const nextAccountNumber = inst.accountNumber !== undefined ? inst.accountNumber : prevTarget?.accountNumber;
    const nextBankAccountName = inst.bankAccountName !== undefined ? inst.bankAccountName : prevTarget?.bankAccountName;

    // Cascade identity & PIC/bank info to unpaid PIC incentives, active deliveries, and beneficiary records
    setPicIncentivePayouts(prev =>
      prev.map(p =>
        p.institutionId === id && p.status !== 'Sudah Dibayarkan'
          ? {
              ...p,
              institutionName: nextName || p.institutionName,
              picName: nextPicName || p.picName,
              picPhone: nextPicPhone ?? p.picPhone,
              bankName: nextBankName ?? p.bankName,
              accountNumber: nextAccountNumber ?? p.accountNumber,
              bankAccountName: nextBankAccountName ?? p.bankAccountName,
            }
          : p
      )
    );

    if (nextName || nextPicName) {
      setDistributionLogs(prev =>
        prev.map(l =>
          l.institutionId === id
            ? {
                ...l,
                institutionName: nextName || l.institutionName,
                receivedBy: l.status !== 'Selesai Serah Terima' && nextPicName ? nextPicName : l.receivedBy,
              }
            : l
        )
      );
      setDistributionDeliveries(prev =>
        prev.map(d =>
          d.institutionId === id
            ? {
                ...d,
                institutionName: nextName || d.institutionName,
                picName: d.status !== 'Selesai Serah Terima' && nextPicName ? nextPicName : d.picName,
              }
            : d
        )
      );
      if (nextName) {
        setBeneficiaryRecords(prev =>
          prev.map(r => (r.institutionId === id ? { ...r, institutionName: nextName } : r))
        );
      }
    }

    await logAudit('UPDATE', 'institutions', `Memperbarui data lembaga ID: ${id} (sinkron ke Menu, RAB, Distribusi & Insentif PIC)`);
    addToast('success', 'Data Diperbarui & Tersinkron', 'Data lembaga, porsi menu, food cost, RAB, Distribusi & Insentif diperbarui real-time.');
  };

  const updateInstitutionQuotaWithHistory = async (
    id: string,
    newSmall: number,
    newLarge: number,
    reason: string
  ) => {
    const target = institutionsRef.current.find(i => i.id === id);
    if (!target) return;

    const previousSmall = target.smallPortions;
    const previousLarge = target.largePortions;
    const previousTotal = target.totalPortions;
    const newTotal = Number(newSmall) + Number(newLarge);
    const deltaTotal = newTotal - previousTotal;

    const nextInstitutions = institutionsRef.current.map(item =>
      item.id === id
        ? {
            ...item,
            smallPortions: newSmall,
            largePortions: newLarge,
            totalPortions: newTotal,
          }
        : item
    );

    // 1. Update institution
    setInstitutions(nextInstitutions);

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

    // 3. Real-time recalculate MenuItem targetPortions, estimatedCostPerPortion & linked RAB
    syncMenusAndRABForInstitutions(nextInstitutions);

    await logAudit(
      'UPDATE',
      'institutions',
      `Perubahan kuota ${target.name}: ${previousTotal} -> ${newTotal} (${deltaTotal > 0 ? '+' : ''}${deltaTotal}). Alasan: ${reason}`
    );
    addToast(
      'success',
      'Kuota Diperbarui & Tersinkron',
      `Kuota ${target.name} diubah menjadi ${newTotal} porsi. Kalkulasi porsi, kebutuhan bahan, food cost & RAB ikut diperbarui.`
    );
  };

  const deleteInstitution = async (id: string) => {
    const target = institutionsRef.current.find(i => i.id === id);
    const nextInstitutions = institutionsRef.current.filter(i => i.id !== id);
    setInstitutions(nextInstitutions);
    syncMenusAndRABForInstitutions(nextInstitutions);
    await logAudit('DELETE', 'institutions', `Menghapus data lembaga: ${target?.name || id} (sinkron ke Menu & RAB)`);
    addToast('warning', 'Lembaga Dihapus', 'Data lembaga dihapus dan kalkulasi porsi menu & RAB diperbarui.');
  };

  // Shared helper: Cascade price / unit / minimumStock / name changes from Inventory or Master Bahan
  const cascadeMaterialSync = (params: {
    sourceName: string;
    nextName?: string;
    nextUnit?: string;
    nextPrice?: number;
    nextMinStock?: number;
    source: 'inventory' | 'master_bahan';
  }) => {
    const { sourceName, nextName, nextUnit, nextPrice, nextMinStock, source } = params;
    let syncedInventory = 0;
    let syncedMasterBahan = 0;
    let syncedRAB = 0;
    let syncedRecipeRows = 0;

    if (source === 'master_bahan') {
      setInventory(prev =>
        prev.map(inv => {
          if (isMatchingMaterialName(inv.name, sourceName)) {
            syncedInventory++;
            const updatedMin = nextMinStock !== undefined ? nextMinStock : inv.minimumStock;
            return {
              ...inv,
              unit: nextUnit || inv.unit,
              pricePerUnit: nextPrice !== undefined ? nextPrice : inv.pricePerUnit,
              minimumStock: updatedMin,
              qualityStatus: inv.currentStock <= updatedMin ? 'Perlu Pemantauan' : 'Baik',
            };
          }
          return inv;
        })
      );
    }

    if (source === 'inventory') {
      setMasterBahan(prev =>
        prev.map(mb => {
          if (isMatchingMaterialName(mb.name, sourceName)) {
            syncedMasterBahan++;
            return {
              ...mb,
              unit: nextUnit || mb.unit,
              actualPrice: nextPrice !== undefined ? nextPrice : mb.actualPrice,
              minimumStock: nextMinStock !== undefined ? nextMinStock : mb.minimumStock,
            };
          }
          return mb;
        })
      );
    }

    // Cascade to RAB Pengadaan (recalculate unitPrice, unit & totalBudget = volume * unitPrice)
    if (nextPrice !== undefined || nextUnit !== undefined) {
      setRabItems(prev =>
        prev.map(rab => {
          if (rab.category === 'RAB Bahan Pangan' && isMatchingMaterialName(rab.itemName, sourceName)) {
            syncedRAB++;
            const updatedPrice = nextPrice !== undefined ? nextPrice : rab.unitPrice;
            const updatedUnit = nextUnit || rab.unit;
            return {
              ...rab,
              unit: updatedUnit,
              unitPrice: updatedPrice,
              totalBudget: Number(rab.volume || 0) * Number(updatedPrice || 0),
            };
          }
          return rab;
        })
      );

      // Cascade to Menu Recipes & Food Cost (PLOG)
      const updatedMap: Record<string, RecipeIngredient[]> = {};
      let mapChanged = false;
      Object.entries(menuIngredientsMapRef.current).forEach(([menuId, ingredients]) => {
        updatedMap[menuId] = ingredients.map(ing => {
          if (isMatchingMaterialName(ing.name, sourceName)) {
            syncedRecipeRows++;
            mapChanged = true;
            return {
              ...ing,
              unitPrice: nextPrice !== undefined ? nextPrice : ing.unitPrice,
              purchaseUnit: nextUnit || ing.purchaseUnit,
            };
          }
          return ing;
        });
      });

      if (mapChanged) {
        menuIngredientsMapRef.current = updatedMap;
        setMenuIngredientsMap(updatedMap);
        const qSmall = institutions.reduce((s, i) => s + (i.smallPortions || 0), 0);
        const qLarge = institutions.reduce((s, i) => s + (i.largePortions || 0), 0);
        const recomputedMenus = recomputeMenuItemsFromRecipes(
          menuItemsRef.current,
          updatedMap,
          masterUnits,
          qSmall,
          qLarge
        );
        menuItemsRef.current = recomputedMenus;
        setMenuItems(recomputedMenus);
      }
    }

    return { syncedInventory, syncedMasterBahan, syncedRAB, syncedRecipeRows, nextName };
  };

  // Master Bahan Pangan CRUD
  const addMasterBahan = async (item: Omit<MasterBahan, 'id'>) => {
    const newItem: MasterBahan = { ...item, id: 'mb-' + Date.now() };
    setMasterBahan(prev => [...prev, newItem]);
    await logAudit('CREATE', 'master_data', `Menambah master bahan pangan: ${item.name} (${item.code})`);
    addToast('success', 'Bahan Tersimpan', `${item.name} berhasil ditambahkan ke master bahan.`);
  };

  const updateMasterBahan = async (id: string, item: Partial<MasterBahan>) => {
    const existing = masterBahan.find(m => m.id === id);
    setMasterBahan(prev => prev.map(m => (m.id === id ? { ...m, ...item } : m)));

    let syncSummary = '';
    if (existing) {
      const res = cascadeMaterialSync({
        sourceName: existing.name,
        nextName: item.name,
        nextUnit: item.unit,
        nextPrice: item.actualPrice,
        nextMinStock: item.minimumStock,
        source: 'master_bahan',
      });
      const parts: string[] = [];
      if (res.syncedInventory > 0) parts.push(`${res.syncedInventory} Gudang`);
      if (res.syncedRAB > 0) parts.push(`${res.syncedRAB} RAB`);
      if (res.syncedRecipeRows > 0) parts.push(`${res.syncedRecipeRows} Resep Menu`);
      if (parts.length > 0) syncSummary = ` Tersinkron otomatis ke ${parts.join(', ')}.`;
    }

    await logAudit('UPDATE', 'master_data', `Memperbarui master bahan pangan ID: ${id}.${syncSummary}`);
    addToast('success', 'Bahan Dimutakhirkan & Tersinkron', `Data master bahan diperbarui.${syncSummary}`);
  };

  const deleteMasterBahan = async (id: string) => {
    const target = masterBahan.find(m => m.id === id);
    setMasterBahan(prev => prev.filter(m => m.id !== id));
    await logAudit('DELETE', 'master_data', `Menghapus master bahan: ${target?.name || id}`);
    addToast('warning', 'Bahan Dihapus', 'Bahan telah dihapus dari master data.');
  };

  // Master Supplier CRUD (Real-time cascading to Inventory & Active PO)
  const addMasterSupplier = async (sup: Omit<MasterSupplier, 'id'>) => {
    const newSup: MasterSupplier = { ...sup, id: 'sup-' + Date.now() };
    setMasterSuppliers(prev => [...prev, newSup]);
    await logAudit('CREATE', 'master_data', `Menambah master supplier: ${sup.name}`);
    addToast('success', 'Supplier Terdaftar', `${sup.name} berhasil disimpan di master supplier.`);
  };

  const updateMasterSupplier = async (id: string, sup: Partial<MasterSupplier>) => {
    const existing = masterSuppliers.find(s => s.id === id);
    setMasterSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...sup } : s)));

    if (existing) {
      const nextSupName = sup.name || existing.name;
      const nextPhone = sup.phone || existing.phone;
      const nextPic = sup.contactPerson || existing.contactPerson;

      if (sup.name && sup.name !== existing.name) {
        setInventory(prev =>
          prev.map(inv =>
            inv.supplierName.toLowerCase() === existing.name.toLowerCase()
              ? { ...inv, supplierName: nextSupName }
              : inv
          )
        );
      }

      setPurchaseOrders(prev =>
        prev.map(po =>
          po.supplierName.toLowerCase() === existing.name.toLowerCase()
            ? {
                ...po,
                supplierName: nextSupName,
                supplierContact: `${nextPic} - ${nextPhone}`,
              }
            : po
        )
      );
    }

    await logAudit('UPDATE', 'master_data', `Memperbarui master supplier ID: ${id} (sinkron ke Gudang & PO)`);
    addToast('success', 'Supplier Diperbarui & Tersinkron', 'Data supplier pada Gudang dan Purchase Order ikut diperbarui.');
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
    const existing = masterVolunteers.find(v => v.id === id);
    const nextName = vol.name !== undefined ? vol.name : existing?.name || '';
    const nextDivision = vol.division !== undefined ? vol.division : existing?.division || '';

    setMasterVolunteers(prev => prev.map(v => (v.id === id ? { ...v, ...vol } : v)));

    if (existing && (vol.name !== undefined || vol.division !== undefined)) {
      const oldNameLower = existing.name.trim().toLowerCase();

      setVolunteerAttendance(prev =>
        prev.map(att => {
          const isPrimaryMatch =
            att.volunteerId === id || att.volunteerName.trim().toLowerCase() === oldNameLower;
          const isRepMatch =
            att.replacementVolunteer &&
            att.replacementVolunteer.trim().toLowerCase() === oldNameLower;
          if (!isPrimaryMatch && !isRepMatch) return att;
          return {
            ...att,
            ...(isPrimaryMatch
              ? {
                  volunteerId: id,
                  volunteerName: nextName,
                  division: (nextDivision as VolunteerAttendance['division']) || att.division,
                }
              : {}),
            ...(isRepMatch ? { replacementVolunteer: nextName } : {}),
          };
        })
      );

      setVolunteerAbsences(prev =>
        prev.map(abs => {
          const isPrimaryMatch =
            abs.volunteerId === id || abs.volunteerName.trim().toLowerCase() === oldNameLower;
          const isRepMatch =
            abs.replacementVolunteerId === id ||
            abs.replacementVolunteerName.trim().toLowerCase() === oldNameLower;
          if (!isPrimaryMatch && !isRepMatch) return abs;
          return {
            ...abs,
            ...(isPrimaryMatch
              ? {
                  volunteerId: id,
                  volunteerName: nextName,
                  division: nextDivision || abs.division,
                }
              : {}),
            ...(isRepMatch
              ? {
                  replacementVolunteerId: id,
                  replacementVolunteerName: nextName,
                  replacementDivision: nextDivision || abs.replacementDivision,
                }
              : {}),
          };
        })
      );

      setVolunteerIncentivePayouts(prev =>
        prev.map(p => {
          if (p.status !== 'Menunggu Pencairan') return p;
          const isPrimaryMatch =
            p.volunteerId === id || p.volunteerName.trim().toLowerCase() === oldNameLower;
          const isReplacedMatch =
            p.replacedVolunteerName &&
            p.replacedVolunteerName.trim().toLowerCase() === oldNameLower;
          if (!isPrimaryMatch && !isReplacedMatch) return p;
          return {
            ...p,
            ...(isPrimaryMatch
              ? {
                  volunteerId: id,
                  volunteerName: nextName,
                  division: nextDivision || p.division,
                }
              : {}),
            ...(isReplacedMatch ? { replacedVolunteerName: nextName } : {}),
          };
        })
      );
    }

    await logAudit('UPDATE', 'master_data', `Memperbarui data relawan ID: ${id} (tersinkron ke Presensi, Ketidakhadiran & Insentif)`);
    addToast('success', 'Relawan Diperbarui & Tersinkron', 'Data relawan di Master, Presensi, Ketidakhadiran, dan Insentif telah dimutakhirkan.');
  };

  const deleteMasterVolunteer = async (id: string) => {
    const target = masterVolunteers.find(v => v.id === id);
    setMasterVolunteers(prev => prev.filter(v => v.id !== id));
    await logAudit('DELETE', 'master_data', `Menghapus relawan: ${target?.name || id}`);
    addToast('warning', 'Relawan Dihapus', 'Data relawan telah dihapus.');
  };

  // Master Satuan & Konversi
  const addMasterUnit = async (unit: Omit<MasterUnit, 'id'>) => {
    const normalizedCode = unit.code.trim();
    if (!normalizedCode) {
      addToast('error', 'Validasi Satuan', 'Kode satuan tidak boleh kosong.');
      return;
    }
    const isDuplicate = masterUnits.some(
      u => u.code.trim().toLowerCase() === normalizedCode.toLowerCase()
    );
    if (isDuplicate) {
      addToast('error', 'Kode Satuan Duplikat', `Kode satuan "${normalizedCode}" sudah terdaftar di Master Satuan.`);
      return;
    }
    const newUnit: MasterUnit = {
      ...unit,
      code: normalizedCode,
      name: unit.name.trim(),
      conversionToBase: Number(unit.conversionToBase) > 0 ? Number(unit.conversionToBase) : 1,
      id: 'u-' + Date.now(),
    };
    setMasterUnits(prev => [...prev, newUnit]);
    await logAudit('CREATE', 'master_data', `Menambah master satuan: ${newUnit.name} (${newUnit.code})`);
    addToast('success', 'Satuan Ditambahkan', `Satuan ${newUnit.name} (${newUnit.code}) berhasil didaftarkan.`);
  };

  const updateMasterUnit = async (id: string, unit: Partial<MasterUnit>) => {
    if (unit.code !== undefined) {
      const normalizedCode = unit.code.trim();
      if (!normalizedCode) {
        addToast('error', 'Validasi Satuan', 'Kode satuan tidak boleh kosong.');
        return;
      }
      const isDuplicate = masterUnits.some(
        u => u.id !== id && u.code.trim().toLowerCase() === normalizedCode.toLowerCase()
      );
      if (isDuplicate) {
        addToast('error', 'Kode Satuan Duplikat', `Kode satuan "${normalizedCode}" sudah digunakan satuan lain.`);
        return;
      }
    }
    setMasterUnits(prev =>
      prev.map(u =>
        u.id === id
          ? {
              ...u,
              ...unit,
              code: unit.code !== undefined ? unit.code.trim() : u.code,
              name: unit.name !== undefined ? unit.name.trim() : u.name,
              conversionToBase:
                unit.conversionToBase !== undefined
                  ? Number(unit.conversionToBase) > 0
                    ? Number(unit.conversionToBase)
                    : 1
                  : u.conversionToBase,
            }
          : u
      )
    );
    await logAudit('UPDATE', 'master_data', `Memperbarui master satuan ID: ${id}`);
    addToast('success', 'Satuan Diperbarui', 'Konfigurasi satuan berhasil diubah.');
  };

  const deleteMasterUnit = async (id: string) => {
    const target = masterUnits.find(u => u.id === id);
    setMasterUnits(prev => prev.filter(u => u.id !== id));
    await logAudit('DELETE', 'master_data', `Menghapus satuan: ${target?.name || id} (${target?.code || ''})`);
    addToast('warning', 'Satuan Dihapus', `Satuan ${target?.code || ''} telah dihapus dari Master Satuan.`);
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
    const registeredSmall = toNonNegativeNumber(log.registeredSmall, 0);
    const registeredLarge = toNonNegativeNumber(log.registeredLarge, 0);
    const absentSmall = toNonNegativeNumber(log.absentSmall, 0);
    const absentLarge = toNonNegativeNumber(log.absentLarge, 0);

    // Validasi 1: jumlah tidak hadir tidak boleh melebihi jumlah terdaftar
    if (absentSmall > registeredSmall) {
      const err = `Jumlah tidak hadir porsi kecil (${absentSmall}) melebihi jumlah siswa terdaftar (${registeredSmall})!`;
      addToast('error', 'Validasi Gagal', err);
      return { success: false, error: err };
    }
    if (absentLarge > registeredLarge) {
      const err = `Jumlah tidak hadir porsi besar (${absentLarge}) melebihi jumlah siswa terdaftar (${registeredLarge})!`;
      addToast('error', 'Validasi Gagal', err);
      return { success: false, error: err };
    }

    // Rumus:
    // Jumlah hadir kecil = Jumlah terdaftar kecil - Jumlah tidak hadir kecil
    // Jumlah hadir besar = Jumlah terdaftar besar - Jumlah tidak hadir besar
    // Jumlah porsi aktual = Total jumlah hadir seluruh kategori
    const presentSmall = Math.max(0, registeredSmall - absentSmall);
    const presentLarge = Math.max(0, registeredLarge - absentLarge);
    const actualPortions = presentSmall + presentLarge;
    const totalRegistered = registeredSmall + registeredLarge;
    const totalAbsent = absentSmall + absentLarge;

    const newLog: BeneficiaryAttendanceLog = {
      ...log,
      registeredSmall,
      registeredLarge,
      absentSmall,
      absentLarge,
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

    // Realtime auto-sync porsi pengiriman & log armada untuk tanggal & lembaga yang sama
    setDistributionDeliveries(prev =>
      prev.map(d =>
        d.date === log.date && d.institutionId === log.institutionId
          ? {
              ...d,
              smallPortions: presentSmall,
              largePortions: presentLarge,
              totalPortions: actualPortions,
              registeredSmall: log.registeredSmall,
              registeredLarge: log.registeredLarge,
              absentSmall: log.absentSmall,
              absentLarge: log.absentLarge,
              attendanceLogId: newLog.id,
              portionSource: 'presensi_realtime',
            }
          : d
      )
    );

    setDistributionLogs(prev =>
      prev.map(d =>
        d.date === log.date && d.institutionId === log.institutionId
          ? {
              ...d,
              smallPortions: presentSmall,
              largePortions: presentLarge,
              totalPortions: actualPortions,
              registeredSmall: log.registeredSmall,
              registeredLarge: log.registeredLarge,
              absentSmall: log.absentSmall,
              absentLarge: log.absentLarge,
              attendanceLogId: newLog.id,
              portionSource: 'presensi_realtime',
            }
          : d
      )
    );

    if (auth.currentUser) {
      const cloudDocId = `att-${log.date}-${log.institutionId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      setDoc(
        doc(db, 'beneficiary_daily_records', cloudDocId),
        sanitizeFirestoreData({
          ...newLog,
          sppgId: 'GFBQSYXD',
          isDeleted: false,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      ).catch(() => {
        // Non-blocking fallback to LocalStorage
      });
    }

    logAudit(
      'CREATE',
      'institutions',
      `Presensi harian ${log.institutionName} (${log.date}): Hadir ${actualPortions}/${totalRegistered} porsi aktual (tersinkron ke Distribusi).`
    );
    addToast(
      'success',
      'Presensi Siswa Disimpan',
      `${log.institutionName}: Porsi aktual ${actualPortions} (Tidak hadir: ${totalAbsent} siswa) tersinkron ke Modul Distribusi.`
    );
    return { success: true };
  };

  const updateBeneficiaryAttendance = async (
    id: string,
    logUpdate: Partial<BeneficiaryAttendanceLog>
  ) => {
    let syncedTarget: BeneficiaryAttendanceLog | null = null;
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

          const updatedItem: BeneficiaryAttendanceLog = {
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
          syncedTarget = updatedItem;
          return updatedItem;
        }
        return item;
      })
    );

    if (syncedTarget) {
      const target = syncedTarget as BeneficiaryAttendanceLog;
      setDistributionDeliveries(prev =>
        prev.map(d =>
          d.date === target.date && d.institutionId === target.institutionId
            ? {
                ...d,
                smallPortions: target.presentSmall,
                largePortions: target.presentLarge,
                totalPortions: target.actualPortions,
                registeredSmall: target.registeredSmall,
                registeredLarge: target.registeredLarge,
                absentSmall: target.absentSmall,
                absentLarge: target.absentLarge,
                attendanceLogId: target.id,
                portionSource: 'presensi_realtime',
              }
            : d
        )
      );
      setDistributionLogs(prev =>
        prev.map(d =>
          d.date === target.date && d.institutionId === target.institutionId
            ? {
                ...d,
                smallPortions: target.presentSmall,
                largePortions: target.presentLarge,
                totalPortions: target.actualPortions,
                registeredSmall: target.registeredSmall,
                registeredLarge: target.registeredLarge,
                absentSmall: target.absentSmall,
                absentLarge: target.absentLarge,
                attendanceLogId: target.id,
                portionSource: 'presensi_realtime',
              }
            : d
        )
      );
      if (auth.currentUser) {
        const cloudDocId = `att-${target.date}-${target.institutionId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        try {
          await setDoc(
            doc(db, 'beneficiary_daily_records', cloudDocId),
            sanitizeFirestoreData({
              ...target,
              sppgId: 'GFBQSYXD',
              isDeleted: false,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        } catch {
          // Non-blocking fallback
        }
      }
    }

    await logAudit('UPDATE', 'institutions', `Memperbarui log presensi penerima manfaat ID: ${id}`);
    addToast('success', 'Presensi Dimutakhirkan', 'Data kehadiran dan porsi pengiriman aktual diperbarui.');
  };

  // 7b. Beneficiary Nutrition & WHO Z-Score Records (Strict NIK Anti-Duplicate)
  const checkDuplicateNik = (nik: string, excludeId?: string): BeneficiaryNutritionRecord | undefined => {
    const clean = normalizeNik(nik);
    if (!clean) return undefined;
    return beneficiaryRecords.find(r => r.nik === clean && r.id !== excludeId);
  };

  const addBeneficiaryRecord = async (input: {
    nik: string;
    fullName: string;
    gender: 'L' | 'P';
    birthDate?: string;
    ageMonths: number;
    institutionId: string;
    classOrGroup: string;
    measurementDate: string;
    weightKg: number;
    heightCm: number;
    notes?: string;
  }): Promise<{ ok: boolean; error?: string; record?: BeneficiaryNutritionRecord }> => {
    const nikCheck = validateNikFormat(input.nik);
    if (!nikCheck.valid) {
      addToast('error', 'NIK Tidak Valid', nikCheck.error || 'Format NIK harus 16 digit.');
      return { ok: false, error: nikCheck.error };
    }

    const duplicate = checkDuplicateNik(nikCheck.cleanNik);
    if (duplicate) {
      const msg = `NIK ${nikCheck.cleanNik} sudah terdaftar atas nama ${duplicate.fullName} (${duplicate.institutionName}). Duplikasi NIK diblokir oleh sistem.`;
      addToast('error', 'Duplikasi NIK Ditolak', msg);
      return { ok: false, error: msg };
    }

    const cleanName = input.fullName.trim();
    if (!cleanName) {
      const msg = 'Nama lengkap penerima gizi wajib diisi.';
      addToast('error', 'Validasi Gagal', msg);
      return { ok: false, error: msg };
    }

    const inst = institutions.find(i => i.id === input.institutionId);
    const z = calculateWHOZScore({
      ageMonths: input.ageMonths,
      gender: input.gender,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
    });

    const newRecord: BeneficiaryNutritionRecord = {
      id: `bn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nik: nikCheck.cleanNik,
      fullName: cleanName,
      gender: input.gender,
      birthDate: input.birthDate || undefined,
      ageMonths: z.ageMonths,
      institutionId: input.institutionId,
      institutionName: inst?.name || 'Lembaga SPPG',
      classOrGroup: input.classOrGroup.trim() || '-',
      measurementDate: input.measurementDate,
      weightKg: z.weightKg,
      heightCm: z.heightCm,
      bmi: z.bmi,
      waz: z.waz,
      haz: z.haz,
      whz: z.whz,
      whzIndexLabel: z.whzIndexLabel,
      wazCategory: z.wazCategory,
      hazCategory: z.hazCategory,
      whzCategory: z.whzCategory,
      isStunted: z.isStunted,
      isUnderweight: z.isUnderweight,
      isWasted: z.isWasted,
      isOverweight: z.isOverweight,
      primaryStatus: z.primaryStatus,
      severityLevel: z.severityLevel,
      recommendation: z.recommendation,
      notes: input.notes?.trim() || '',
      recordedBy: currentUser.name,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setBeneficiaryRecords(prev => [newRecord, ...prev]);

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'beneficiary_nutrition_records', newRecord.id),
          sanitizeFirestoreData({
            ...newRecord,
            sppgId: 'GFBQSYXD',
          })
        );
      } catch (err) {
        console.warn('Firestore write fallback for beneficiary_nutrition_records:', err);
      }
    }

    await logAudit(
      'CREATE',
      'institutions',
      `Menambah data anak/gizi ${newRecord.fullName} (NIK: ${newRecord.nik}) • Status WHO: ${newRecord.primaryStatus} (HAZ ${newRecord.haz}, WHZ ${newRecord.whz})`
    );
    addToast(
      'success',
      'Data Gizi Anak Tersimpan',
      `${newRecord.fullName} tercatat dengan status WHO: ${newRecord.primaryStatus}. Statistik Dashboard diperbarui.`
    );
    return { ok: true, record: newRecord };
  };

  const updateBeneficiaryRecord = async (
    id: string,
    updates: Partial<{
      nik: string;
      fullName: string;
      gender: 'L' | 'P';
      birthDate: string;
      ageMonths: number;
      institutionId: string;
      classOrGroup: string;
      measurementDate: string;
      weightKg: number;
      heightCm: number;
      notes: string;
    }>
  ): Promise<{ ok: boolean; error?: string; record?: BeneficiaryNutritionRecord }> => {
    const existing = beneficiaryRecords.find(r => r.id === id);
    if (!existing) {
      return { ok: false, error: 'Data penerima manfaat tidak ditemukan.' };
    }

    const candidateNik = updates.nik !== undefined ? updates.nik : existing.nik;
    const nikCheck = validateNikFormat(candidateNik);
    if (!nikCheck.valid) {
      addToast('error', 'NIK Tidak Valid', nikCheck.error || 'Format NIK harus 16 digit.');
      return { ok: false, error: nikCheck.error };
    }

    const duplicate = checkDuplicateNik(nikCheck.cleanNik, id);
    if (duplicate) {
      const msg = `NIK ${nikCheck.cleanNik} sudah digunakan oleh ${duplicate.fullName} (${duplicate.institutionName}).`;
      addToast('error', 'Duplikasi NIK Ditolak', msg);
      return { ok: false, error: msg };
    }

    const nextGender = updates.gender ?? existing.gender;
    const nextAgeMonths = updates.ageMonths !== undefined ? Number(updates.ageMonths) : existing.ageMonths;
    const nextWeightKg = updates.weightKg !== undefined ? Number(updates.weightKg) : existing.weightKg;
    const nextHeightCm = updates.heightCm !== undefined ? Number(updates.heightCm) : existing.heightCm;
    const nextInstId = updates.institutionId ?? existing.institutionId;
    const inst = institutions.find(i => i.id === nextInstId);

    const z = calculateWHOZScore({
      ageMonths: nextAgeMonths,
      gender: nextGender,
      weightKg: nextWeightKg,
      heightCm: nextHeightCm,
    });

    const updatedRecord: BeneficiaryNutritionRecord = {
      ...existing,
      ...updates,
      nik: nikCheck.cleanNik,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : existing.fullName,
      gender: nextGender,
      ageMonths: z.ageMonths,
      institutionId: nextInstId,
      institutionName: inst?.name || existing.institutionName,
      classOrGroup: updates.classOrGroup !== undefined ? updates.classOrGroup.trim() : existing.classOrGroup,
      weightKg: z.weightKg,
      heightCm: z.heightCm,
      bmi: z.bmi,
      waz: z.waz,
      haz: z.haz,
      whz: z.whz,
      whzIndexLabel: z.whzIndexLabel,
      wazCategory: z.wazCategory,
      hazCategory: z.hazCategory,
      whzCategory: z.whzCategory,
      isStunted: z.isStunted,
      isUnderweight: z.isUnderweight,
      isWasted: z.isWasted,
      isOverweight: z.isOverweight,
      primaryStatus: z.primaryStatus,
      severityLevel: z.severityLevel,
      recommendation: z.recommendation,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setBeneficiaryRecords(prev => prev.map(r => (r.id === id ? updatedRecord : r)));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'beneficiary_nutrition_records', id),
          sanitizeFirestoreData({ ...updatedRecord, sppgId: 'GFBQSYXD' }),
          { merge: true }
        );
      } catch (err) {
        console.warn('Firestore update fallback for beneficiary_nutrition_records:', err);
      }
    }

    await logAudit(
      'UPDATE',
      'institutions',
      `Memperbarui data gizi ${updatedRecord.fullName} (NIK: ${updatedRecord.nik}) -> Status WHO: ${updatedRecord.primaryStatus}`
    );
    addToast(
      'success',
      'Data Gizi Diperbarui',
      `Z-Score & status gizi ${updatedRecord.fullName} (${updatedRecord.primaryStatus}) berhasil dihitung ulang.`
    );
    return { ok: true, record: updatedRecord };
  };

  const deleteBeneficiaryRecord = async (id: string) => {
    const target = beneficiaryRecords.find(r => r.id === id);
    setBeneficiaryRecords(prev => prev.filter(r => r.id !== id));

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'beneficiary_nutrition_records', id));
      } catch (err) {
        console.warn('Firestore delete fallback for beneficiary_nutrition_records:', err);
      }
    }

    await logAudit('DELETE', 'institutions', `Menghapus data antropometri anak: ${target?.fullName || id}`);
    addToast('info', 'Data Dihapus', `Data penerima gizi ${target?.fullName || ''} telah dihapus.`);
  };

  // 8. Kesehatan & Gizi Ibu Hamil (3B) — Anti-Duplikasi NIK
  const checkDuplicateMaternalNik = (nik: string, excludeId?: string): MaternalHealthRecord | undefined => {
    const clean = normalizeNik(nik);
    if (!clean) return undefined;
    return maternalHealthRecords.find(r => r.nik === clean && r.id !== excludeId);
  };

  const resolveMaternalInstitutionName = (institutionId: string, override?: string): string => {
    if (override && override.trim()) return override.trim();
    const matched = institutions.find(i => i.id === institutionId);
    if (matched) return matched.name;
    if (institutionId === 'posyandu-temenggungan') return 'Posyandu Melati — Desa Temenggungan';
    if (institutionId === 'posyandu-krejengan') return 'Posyandu Anggrek — Desa Krejengan';
    if (institutionId === 'posyandu-gebangan') return 'Posyandu Kenanga — Desa Gebangan';
    return 'Posyandu / Sasaran 3B Wilayah Krejengan';
  };

  const addMaternalHealthRecord = async (input: {
    nik: string;
    fullName: string;
    ageYears: number;
    phone?: string;
    institutionId: string;
    institutionNameOverride?: string;
    villageOrPosyandu: string;
    gravida: number;
    para: number;
    abortus: number;
    hphtDate?: string;
    gestationalWeeks: number;
    gestationalDaysRemainder?: number;
    dueDateHpl?: string;
    prePregnancyWeightKg: number;
    currentWeightKg: number;
    heightCm: number;
    lilaCm: number;
    hemoglobinGdL: number;
    systolicBp: number;
    diastolicBp: number;
    ttdCompliant: boolean;
    measurementDate: string;
    notes?: string;
  }): Promise<{ ok: boolean; error?: string; record?: MaternalHealthRecord }> => {
    const nikCheck = validateNikFormat(input.nik);
    if (!nikCheck.valid) {
      addToast('error', 'NIK Tidak Valid', nikCheck.error || 'Format NIK harus 16 digit.');
      return { ok: false, error: nikCheck.error };
    }

    const duplicate = checkDuplicateMaternalNik(nikCheck.cleanNik);
    if (duplicate) {
      const msg = `NIK ${nikCheck.cleanNik} sudah terdaftar atas nama Ibu ${duplicate.fullName} (${duplicate.institutionName}). Duplikasi NIK diblokir.`;
      addToast('error', 'Duplikasi NIK Ditolak', msg);
      return { ok: false, error: msg };
    }

    const cleanName = input.fullName.trim();
    if (!cleanName) {
      const msg = 'Nama lengkap ibu hamil wajib diisi.';
      addToast('error', 'Validasi Gagal', msg);
      return { ok: false, error: msg };
    }

    const gest = input.hphtDate
      ? calculateGestationFromHPHT(input.hphtDate, input.measurementDate)
      : null;
    const finalWeeks = gest ? gest.gestationalWeeks : Math.max(1, Math.min(42, Number(input.gestationalWeeks) || 12));
    const finalDays = gest ? gest.gestationalDaysRemainder : Number(input.gestationalDaysRemainder || 0);
    const finalHpl = gest?.dueDateHpl || input.dueDateHpl || '';

    const assessment = calculateMaternalHealthAssessment({
      ageYears: input.ageYears,
      gestationalWeeks: finalWeeks,
      prePregnancyWeightKg: input.prePregnancyWeightKg,
      currentWeightKg: input.currentWeightKg,
      heightCm: input.heightCm,
      lilaCm: input.lilaCm,
      hemoglobinGdL: input.hemoglobinGdL,
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      ttdCompliant: input.ttdCompliant,
    });

    const g = Math.max(1, Number(input.gravida) || 1);
    const p = Math.max(0, Number(input.para) || 0);
    const a = Math.max(0, Number(input.abortus) || 0);

    const newRecord: MaternalHealthRecord = {
      id: `mh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nik: nikCheck.cleanNik,
      fullName: cleanName,
      ageYears: Number(input.ageYears) || 25,
      phone: input.phone?.trim() || '',
      institutionId: input.institutionId || 'posyandu-temenggungan',
      institutionName: resolveMaternalInstitutionName(input.institutionId, input.institutionNameOverride),
      villageOrPosyandu: input.villageOrPosyandu.trim() || 'Wilayah Binaan Krejengan',
      gravida: g,
      para: p,
      abortus: a,
      obstetricCode: `G${g}P${p}A${a}`,
      hphtDate: input.hphtDate || '',
      gestationalWeeks: assessment.gestationalWeeks,
      gestationalDaysRemainder: finalDays,
      dueDateHpl: finalHpl,
      trimester: assessment.trimester,
      prePregnancyWeightKg: Number(input.prePregnancyWeightKg),
      currentWeightKg: Number(input.currentWeightKg),
      heightCm: Number(input.heightCm),
      prePregnancyBmi: assessment.prePregnancyBmi,
      bmiCategory: assessment.bmiCategory,
      weightGainKg: assessment.weightGainKg,
      targetWeightGainRange: assessment.targetWeightGainRange,
      weightGainStatus: assessment.weightGainStatus,
      lilaCm: assessment.lilaCm,
      isKek: assessment.isKek,
      lilaCategory: assessment.lilaCategory,
      hemoglobinGdL: assessment.hemoglobinGdL,
      anemiaStatus: assessment.anemiaStatus,
      systolicBp: assessment.systolicBp,
      diastolicBp: assessment.diastolicBp,
      bpStatus: assessment.bpStatus,
      recommendedKcal: assessment.recommendedKcal,
      recommendedProteinG: assessment.recommendedProteinG,
      ttdCompliant: Boolean(input.ttdCompliant),
      measurementDate: input.measurementDate,
      riskFlags: assessment.riskFlags,
      riskLevel: assessment.riskLevel,
      recommendation: assessment.recommendation,
      notes: input.notes?.trim() || '',
      recordedBy: currentUser.name,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setMaternalHealthRecords(prev => [newRecord, ...prev]);

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'maternal_health_records', newRecord.id),
          sanitizeFirestoreData({
            ...newRecord,
            sppgId: 'GFBQSYXD',
          })
        );
      } catch (err) {
        console.warn('Firestore write fallback for maternal_health_records:', err);
      }
    }

    await logAudit(
      'CREATE',
      'institutions',
      `Pemeriksaan kesehatan Ibu Hamil ${newRecord.fullName} (NIK: ${newRecord.nik}) • ${newRecord.trimester} • Status: ${newRecord.riskLevel}`
    );
    addToast(
      'success',
      'Data Cek Kesehatan Ibu Hamil Disimpan',
      `${newRecord.fullName} (${newRecord.trimester}) tercatat dengan status ${newRecord.riskLevel}.`
    );
    return { ok: true, record: newRecord };
  };

  const updateMaternalHealthRecord = async (
    id: string,
    updates: Partial<{
      nik: string;
      fullName: string;
      ageYears: number;
      phone: string;
      institutionId: string;
      institutionNameOverride: string;
      villageOrPosyandu: string;
      gravida: number;
      para: number;
      abortus: number;
      hphtDate: string;
      gestationalWeeks: number;
      gestationalDaysRemainder: number;
      dueDateHpl: string;
      prePregnancyWeightKg: number;
      currentWeightKg: number;
      heightCm: number;
      lilaCm: number;
      hemoglobinGdL: number;
      systolicBp: number;
      diastolicBp: number;
      ttdCompliant: boolean;
      measurementDate: string;
      notes: string;
    }>
  ): Promise<{ ok: boolean; error?: string; record?: MaternalHealthRecord }> => {
    const existing = maternalHealthRecords.find(r => r.id === id);
    if (!existing) {
      return { ok: false, error: 'Data kesehatan ibu hamil tidak ditemukan.' };
    }

    const candidateNik = updates.nik !== undefined ? updates.nik : existing.nik;
    const nikCheck = validateNikFormat(candidateNik);
    if (!nikCheck.valid) {
      addToast('error', 'NIK Tidak Valid', nikCheck.error || 'Format NIK harus 16 digit.');
      return { ok: false, error: nikCheck.error };
    }

    const duplicate = checkDuplicateMaternalNik(nikCheck.cleanNik, id);
    if (duplicate) {
      const msg = `NIK ${nikCheck.cleanNik} sudah terdaftar atas nama ${duplicate.fullName}.`;
      addToast('error', 'Duplikasi NIK Ditolak', msg);
      return { ok: false, error: msg };
    }

    const nextMeasurementDate = updates.measurementDate ?? existing.measurementDate;
    const nextHpht = updates.hphtDate !== undefined ? updates.hphtDate : existing.hphtDate;
    const gest = nextHpht ? calculateGestationFromHPHT(nextHpht, nextMeasurementDate) : null;
    const nextWeeks =
      updates.gestationalWeeks !== undefined
        ? Number(updates.gestationalWeeks)
        : gest
        ? gest.gestationalWeeks
        : existing.gestationalWeeks;
    const nextDays =
      updates.gestationalDaysRemainder !== undefined
        ? Number(updates.gestationalDaysRemainder)
        : gest
        ? gest.gestationalDaysRemainder
        : existing.gestationalDaysRemainder;
    const nextHpl = updates.dueDateHpl !== undefined ? updates.dueDateHpl : gest?.dueDateHpl || existing.dueDateHpl;

    const nextAge = updates.ageYears !== undefined ? Number(updates.ageYears) : existing.ageYears;
    const nextPreWeight =
      updates.prePregnancyWeightKg !== undefined ? Number(updates.prePregnancyWeightKg) : existing.prePregnancyWeightKg;
    const nextCurrWeight =
      updates.currentWeightKg !== undefined ? Number(updates.currentWeightKg) : existing.currentWeightKg;
    const nextHeight = updates.heightCm !== undefined ? Number(updates.heightCm) : existing.heightCm;
    const nextLila = updates.lilaCm !== undefined ? Number(updates.lilaCm) : existing.lilaCm;
    const nextHb = updates.hemoglobinGdL !== undefined ? Number(updates.hemoglobinGdL) : existing.hemoglobinGdL;
    const nextSys = updates.systolicBp !== undefined ? Number(updates.systolicBp) : existing.systolicBp;
    const nextDia = updates.diastolicBp !== undefined ? Number(updates.diastolicBp) : existing.diastolicBp;
    const nextTtd = updates.ttdCompliant !== undefined ? updates.ttdCompliant : existing.ttdCompliant;

    const assessment = calculateMaternalHealthAssessment({
      ageYears: nextAge,
      gestationalWeeks: nextWeeks,
      prePregnancyWeightKg: nextPreWeight,
      currentWeightKg: nextCurrWeight,
      heightCm: nextHeight,
      lilaCm: nextLila,
      hemoglobinGdL: nextHb,
      systolicBp: nextSys,
      diastolicBp: nextDia,
      ttdCompliant: nextTtd,
    });

    const g = updates.gravida !== undefined ? Math.max(1, Number(updates.gravida)) : existing.gravida;
    const p = updates.para !== undefined ? Math.max(0, Number(updates.para)) : existing.para;
    const a = updates.abortus !== undefined ? Math.max(0, Number(updates.abortus)) : existing.abortus;
    const nextInstId = updates.institutionId ?? existing.institutionId;

    const updatedRecord: MaternalHealthRecord = {
      ...existing,
      nik: nikCheck.cleanNik,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : existing.fullName,
      ageYears: nextAge,
      phone: updates.phone !== undefined ? updates.phone.trim() : existing.phone,
      institutionId: nextInstId,
      institutionName: resolveMaternalInstitutionName(nextInstId, updates.institutionNameOverride),
      villageOrPosyandu:
        updates.villageOrPosyandu !== undefined ? updates.villageOrPosyandu.trim() : existing.villageOrPosyandu,
      gravida: g,
      para: p,
      abortus: a,
      obstetricCode: `G${g}P${p}A${a}`,
      hphtDate: nextHpht,
      gestationalWeeks: assessment.gestationalWeeks,
      gestationalDaysRemainder: nextDays,
      dueDateHpl: nextHpl,
      trimester: assessment.trimester,
      prePregnancyWeightKg: nextPreWeight,
      currentWeightKg: nextCurrWeight,
      heightCm: nextHeight,
      prePregnancyBmi: assessment.prePregnancyBmi,
      bmiCategory: assessment.bmiCategory,
      weightGainKg: assessment.weightGainKg,
      targetWeightGainRange: assessment.targetWeightGainRange,
      weightGainStatus: assessment.weightGainStatus,
      lilaCm: assessment.lilaCm,
      isKek: assessment.isKek,
      lilaCategory: assessment.lilaCategory,
      hemoglobinGdL: assessment.hemoglobinGdL,
      anemiaStatus: assessment.anemiaStatus,
      systolicBp: assessment.systolicBp,
      diastolicBp: assessment.diastolicBp,
      bpStatus: assessment.bpStatus,
      recommendedKcal: assessment.recommendedKcal,
      recommendedProteinG: assessment.recommendedProteinG,
      ttdCompliant: nextTtd,
      measurementDate: nextMeasurementDate,
      riskFlags: assessment.riskFlags,
      riskLevel: assessment.riskLevel,
      recommendation: assessment.recommendation,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setMaternalHealthRecords(prev => prev.map(r => (r.id === id ? updatedRecord : r)));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'maternal_health_records', id),
          sanitizeFirestoreData({ ...updatedRecord, sppgId: 'GFBQSYXD' }),
          { merge: true }
        );
      } catch (err) {
        console.warn('Firestore update fallback for maternal_health_records:', err);
      }
    }

    await logAudit(
      'UPDATE',
      'institutions',
      `Memperbarui data kesehatan Ibu Hamil ${updatedRecord.fullName} (NIK: ${updatedRecord.nik}) -> ${updatedRecord.riskLevel}`
    );
    addToast(
      'success',
      'Data Ibu Hamil Diperbarui',
      `Status klinis ${updatedRecord.fullName} (${updatedRecord.riskLevel}) berhasil dihitung ulang.`
    );
    return { ok: true, record: updatedRecord };
  };

  const deleteMaternalHealthRecord = async (id: string) => {
    const target = maternalHealthRecords.find(r => r.id === id);
    setMaternalHealthRecords(prev => prev.filter(r => r.id !== id));

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'maternal_health_records', id));
      } catch (err) {
        console.warn('Firestore delete fallback for maternal_health_records:', err);
      }
    }

    await logAudit('DELETE', 'institutions', `Menghapus data kesehatan ibu hamil: ${target?.fullName || id}`);
    addToast('info', 'Data Dihapus', `Data pemeriksaan ibu hamil ${target?.fullName || ''} telah dihapus.`);
  };

  // 9. Kesehatan & Gizi Ibu Menyusui (3B) — Anti-Duplikasi NIK
  const checkDuplicateLactatingNik = (nik: string, excludeId?: string): LactatingHealthRecord | undefined => {
    const clean = normalizeNik(nik);
    if (!clean) return undefined;
    return lactatingHealthRecords.find(r => r.nik === clean && r.id !== excludeId);
  };

  const addLactatingHealthRecord = async (input: {
    nik: string;
    fullName: string;
    ageYears: number;
    phone?: string;
    institutionId: string;
    institutionNameOverride?: string;
    villageOrPosyandu: string;
    babyName: string;
    deliveryDate: string;
    feedingPattern: LactationFeedingPattern;
    breastStatus: BreastHealthStatus;
    weightKg: number;
    heightCm: number;
    lilaCm: number;
    hemoglobinGdL: number;
    systolicBp: number;
    diastolicBp: number;
    fluidIntakeMl: number;
    vitaminAPostpartum: boolean;
    ttdOrMultivitaminCompliant: boolean;
    measurementDate: string;
    notes?: string;
  }): Promise<{ ok: boolean; error?: string; record?: LactatingHealthRecord }> => {
    const nikCheck = validateNikFormat(input.nik);
    if (!nikCheck.valid) {
      addToast('error', 'NIK Tidak Valid', nikCheck.error || 'Format NIK harus 16 digit.');
      return { ok: false, error: nikCheck.error };
    }

    const duplicate = checkDuplicateLactatingNik(nikCheck.cleanNik);
    if (duplicate) {
      const msg = `NIK ${nikCheck.cleanNik} sudah terdaftar atas nama Ibu ${duplicate.fullName} (${duplicate.institutionName}). Duplikasi NIK diblokir.`;
      addToast('error', 'Duplikasi NIK Ditolak', msg);
      return { ok: false, error: msg };
    }

    const cleanName = input.fullName.trim();
    if (!cleanName) {
      const msg = 'Nama lengkap ibu menyusui wajib diisi.';
      addToast('error', 'Validasi Gagal', msg);
      return { ok: false, error: msg };
    }

    const duration = calculateLactationDuration(input.deliveryDate, input.measurementDate);
    const assessment = calculateLactatingHealthAssessment({
      ageYears: input.ageYears,
      deliveryDate: input.deliveryDate,
      measurementDate: input.measurementDate,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      lilaCm: input.lilaCm,
      hemoglobinGdL: input.hemoglobinGdL,
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      feedingPattern: input.feedingPattern,
      breastStatus: input.breastStatus,
      fluidIntakeMl: input.fluidIntakeMl,
      vitaminAPostpartum: input.vitaminAPostpartum,
      ttdOrMultivitaminCompliant: input.ttdOrMultivitaminCompliant,
    });

    const newRecord: LactatingHealthRecord = {
      id: `lh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nik: nikCheck.cleanNik,
      fullName: cleanName,
      ageYears: Number(input.ageYears) || 26,
      phone: input.phone?.trim() || '',
      institutionId: input.institutionId || 'posyandu-temenggungan',
      institutionName: resolveMaternalInstitutionName(input.institutionId, input.institutionNameOverride),
      villageOrPosyandu: input.villageOrPosyandu.trim() || 'Wilayah Binaan Krejengan',
      babyName: input.babyName.trim() || 'By. Balita',
      deliveryDate: input.deliveryDate,
      babyAgeDays: duration.babyAgeDays,
      lactationWeeks: duration.lactationWeeks,
      babyAgeMonths: duration.babyAgeMonths,
      lactationPhase: assessment.lactationPhase,
      feedingPattern: input.feedingPattern,
      breastStatus: input.breastStatus,
      weightKg: Number(input.weightKg),
      heightCm: Number(input.heightCm),
      bmi: assessment.bmi,
      bmiCategory: assessment.bmiCategory,
      lilaCm: assessment.lilaCm,
      isKek: assessment.isKek,
      lilaCategory: assessment.lilaCategory,
      hemoglobinGdL: assessment.hemoglobinGdL,
      anemiaStatus: assessment.anemiaStatus,
      systolicBp: assessment.systolicBp,
      diastolicBp: assessment.diastolicBp,
      bpStatus: assessment.bpStatus,
      fluidIntakeMl: assessment.fluidIntakeMl,
      targetFluidMl: assessment.targetFluidMl,
      isHydrationLow: assessment.isHydrationLow,
      vitaminAPostpartum: Boolean(input.vitaminAPostpartum),
      ttdOrMultivitaminCompliant: Boolean(input.ttdOrMultivitaminCompliant),
      recommendedKcal: assessment.recommendedKcal,
      recommendedProteinG: assessment.recommendedProteinG,
      measurementDate: input.measurementDate,
      riskFlags: assessment.riskFlags,
      riskLevel: assessment.riskLevel,
      recommendation: assessment.recommendation,
      notes: input.notes?.trim() || '',
      recordedBy: currentUser.name,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setLactatingHealthRecords(prev => [newRecord, ...prev]);

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'lactating_health_records', newRecord.id),
          sanitizeFirestoreData({
            ...newRecord,
            sppgId: 'GFBQSYXD',
          })
        );
      } catch (err) {
        console.warn('Firestore write fallback for lactating_health_records:', err);
      }
    }

    await logAudit(
      'CREATE',
      'institutions',
      `Pemeriksaan kesehatan Ibu Menyusui ${newRecord.fullName} (NIK: ${newRecord.nik}) • ${newRecord.lactationPhase} • Status: ${newRecord.riskLevel}`
    );
    addToast(
      'success',
      'Data Cek Kesehatan Ibu Menyusui Disimpan',
      `${newRecord.fullName} (${newRecord.lactationPhase}) tercatat dengan status ${newRecord.riskLevel}.`
    );
    return { ok: true, record: newRecord };
  };

  const updateLactatingHealthRecord = async (
    id: string,
    updates: Partial<{
      nik: string;
      fullName: string;
      ageYears: number;
      phone: string;
      institutionId: string;
      institutionNameOverride: string;
      villageOrPosyandu: string;
      babyName: string;
      deliveryDate: string;
      feedingPattern: LactationFeedingPattern;
      breastStatus: BreastHealthStatus;
      weightKg: number;
      heightCm: number;
      lilaCm: number;
      hemoglobinGdL: number;
      systolicBp: number;
      diastolicBp: number;
      fluidIntakeMl: number;
      vitaminAPostpartum: boolean;
      ttdOrMultivitaminCompliant: boolean;
      measurementDate: string;
      notes: string;
    }>
  ): Promise<{ ok: boolean; error?: string; record?: LactatingHealthRecord }> => {
    const existing = lactatingHealthRecords.find(r => r.id === id);
    if (!existing) {
      return { ok: false, error: 'Data kesehatan ibu menyusui tidak ditemukan.' };
    }

    const candidateNik = updates.nik !== undefined ? updates.nik : existing.nik;
    const nikCheck = validateNikFormat(candidateNik);
    if (!nikCheck.valid) {
      addToast('error', 'NIK Tidak Valid', nikCheck.error || 'Format NIK harus 16 digit.');
      return { ok: false, error: nikCheck.error };
    }

    const duplicate = checkDuplicateLactatingNik(nikCheck.cleanNik, id);
    if (duplicate) {
      const msg = `NIK ${nikCheck.cleanNik} sudah terdaftar atas nama ${duplicate.fullName}.`;
      addToast('error', 'Duplikasi NIK Ditolak', msg);
      return { ok: false, error: msg };
    }

    const nextMeasurementDate = updates.measurementDate ?? existing.measurementDate;
    const nextDeliveryDate = updates.deliveryDate ?? existing.deliveryDate;
    const duration = calculateLactationDuration(nextDeliveryDate, nextMeasurementDate);
    const nextAge = updates.ageYears !== undefined ? Number(updates.ageYears) : existing.ageYears;
    const nextFeeding = updates.feedingPattern ?? existing.feedingPattern;
    const nextBreast = updates.breastStatus ?? existing.breastStatus;
    const nextWeight = updates.weightKg !== undefined ? Number(updates.weightKg) : existing.weightKg;
    const nextHeight = updates.heightCm !== undefined ? Number(updates.heightCm) : existing.heightCm;
    const nextLila = updates.lilaCm !== undefined ? Number(updates.lilaCm) : existing.lilaCm;
    const nextHb = updates.hemoglobinGdL !== undefined ? Number(updates.hemoglobinGdL) : existing.hemoglobinGdL;
    const nextSys = updates.systolicBp !== undefined ? Number(updates.systolicBp) : existing.systolicBp;
    const nextDia = updates.diastolicBp !== undefined ? Number(updates.diastolicBp) : existing.diastolicBp;
    const nextFluid = updates.fluidIntakeMl !== undefined ? Number(updates.fluidIntakeMl) : existing.fluidIntakeMl;
    const nextVitA = updates.vitaminAPostpartum !== undefined ? updates.vitaminAPostpartum : existing.vitaminAPostpartum;
    const nextTtd =
      updates.ttdOrMultivitaminCompliant !== undefined
        ? updates.ttdOrMultivitaminCompliant
        : existing.ttdOrMultivitaminCompliant;

    const assessment = calculateLactatingHealthAssessment({
      ageYears: nextAge,
      deliveryDate: nextDeliveryDate,
      measurementDate: nextMeasurementDate,
      weightKg: nextWeight,
      heightCm: nextHeight,
      lilaCm: nextLila,
      hemoglobinGdL: nextHb,
      systolicBp: nextSys,
      diastolicBp: nextDia,
      feedingPattern: nextFeeding,
      breastStatus: nextBreast,
      fluidIntakeMl: nextFluid,
      vitaminAPostpartum: nextVitA,
      ttdOrMultivitaminCompliant: nextTtd,
    });

    const nextInstId = updates.institutionId ?? existing.institutionId;

    const updatedRecord: LactatingHealthRecord = {
      ...existing,
      nik: nikCheck.cleanNik,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : existing.fullName,
      ageYears: nextAge,
      phone: updates.phone !== undefined ? updates.phone.trim() : existing.phone,
      institutionId: nextInstId,
      institutionName: resolveMaternalInstitutionName(nextInstId, updates.institutionNameOverride),
      villageOrPosyandu:
        updates.villageOrPosyandu !== undefined ? updates.villageOrPosyandu.trim() : existing.villageOrPosyandu,
      babyName: updates.babyName !== undefined ? updates.babyName.trim() : existing.babyName,
      deliveryDate: nextDeliveryDate,
      babyAgeDays: duration.babyAgeDays,
      lactationWeeks: duration.lactationWeeks,
      babyAgeMonths: duration.babyAgeMonths,
      lactationPhase: assessment.lactationPhase,
      feedingPattern: nextFeeding,
      breastStatus: nextBreast,
      weightKg: nextWeight,
      heightCm: nextHeight,
      bmi: assessment.bmi,
      bmiCategory: assessment.bmiCategory,
      lilaCm: assessment.lilaCm,
      isKek: assessment.isKek,
      lilaCategory: assessment.lilaCategory,
      hemoglobinGdL: assessment.hemoglobinGdL,
      anemiaStatus: assessment.anemiaStatus,
      systolicBp: assessment.systolicBp,
      diastolicBp: assessment.diastolicBp,
      bpStatus: assessment.bpStatus,
      fluidIntakeMl: assessment.fluidIntakeMl,
      targetFluidMl: assessment.targetFluidMl,
      isHydrationLow: assessment.isHydrationLow,
      vitaminAPostpartum: nextVitA,
      ttdOrMultivitaminCompliant: nextTtd,
      recommendedKcal: assessment.recommendedKcal,
      recommendedProteinG: assessment.recommendedProteinG,
      measurementDate: nextMeasurementDate,
      riskFlags: assessment.riskFlags,
      riskLevel: assessment.riskLevel,
      recommendation: assessment.recommendation,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setLactatingHealthRecords(prev => prev.map(r => (r.id === id ? updatedRecord : r)));

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'lactating_health_records', id),
          sanitizeFirestoreData({ ...updatedRecord, sppgId: 'GFBQSYXD' }),
          { merge: true }
        );
      } catch (err) {
        console.warn('Firestore update fallback for lactating_health_records:', err);
      }
    }

    await logAudit(
      'UPDATE',
      'institutions',
      `Memperbarui data kesehatan Ibu Menyusui ${updatedRecord.fullName} (NIK: ${updatedRecord.nik}) -> ${updatedRecord.riskLevel}`
    );
    addToast(
      'success',
      'Data Ibu Menyusui Diperbarui',
      `Status klinis ${updatedRecord.fullName} (${updatedRecord.riskLevel}) berhasil dihitung ulang.`
    );
    return { ok: true, record: updatedRecord };
  };

  const deleteLactatingHealthRecord = async (id: string) => {
    const target = lactatingHealthRecords.find(r => r.id === id);
    setLactatingHealthRecords(prev => prev.filter(r => r.id !== id));

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'lactating_health_records', id));
      } catch (err) {
        console.warn('Firestore delete fallback for lactating_health_records:', err);
      }
    }

    await logAudit('DELETE', 'institutions', `Menghapus data kesehatan ibu menyusui: ${target?.fullName || id}`);
    addToast('info', 'Data Dihapus', `Data pemeriksaan ibu menyusui ${target?.fullName || ''} telah dihapus.`);
  };

  // Menu Items CRUD & Approval (auto-syncs linked non-manually-overridden daily RAB items)
  const syncLinkedMenuPlansToRABSilently = (
    nextMenus: MenuItem[],
    nextMap: Record<string, RecipeIngredient[]>,
    nextInstitutions?: Institution[]
  ) => {
    const rabSync = syncRABWithMenuPlans({
      menuItems: nextMenus,
      menuIngredientsMap: nextMap,
      masterUnits,
      institutions: nextInstitutions ?? institutionsRef.current,
      rabItems: rabItemsRef.current,
      inventory: inventoryRef.current,
      masterBahan,
      options: {
        preserveManualEdits: true,
        skipDeletedKeys: deletedMenuRabKeysRef.current,
      },
    });
    const reconciledRABs = reconcileRABWithPurchaseOrders(purchaseOrdersRef.current, rabSync.rabItems);
    rabItemsRef.current = reconciledRABs;
    setRabItems(reconciledRABs);
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
    const newId = `menu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const normalizedGrammages = Array.isArray(item.itemGrammages)
      ? item.itemGrammages.map(g => ({
          ...g,
          id:
            g.id && !g.id.startsWith('menu-tmp-')
              ? g.id
              : `${newId}-gram-${g.categoryKey}`,
        }))
      : undefined;

    const baseItem: MenuItem = {
      ...item,
      id: newId,
      ...(normalizedGrammages ? { itemGrammages: normalizedGrammages } : {}),
    };

    let nextMenus = [...menuItemsRef.current, baseItem];
    let createdItem: MenuItem = baseItem;

    if (item.ingredients && item.ingredients.length > 0) {
      const nextMap = { ...menuIngredientsMapRef.current, [baseItem.id]: item.ingredients };
      menuIngredientsMapRef.current = nextMap;
      setMenuIngredientsMap(nextMap);

      const qSmall = institutions.reduce((s, i) => s + (i.smallPortions || 0), 0);
      const qLarge = institutions.reduce((s, i) => s + (i.largePortions || 0), 0);
      nextMenus = recomputeMenuItemsFromRecipes(nextMenus, nextMap, masterUnits, qSmall, qLarge);
      createdItem = nextMenus.find(m => m.id === baseItem.id) || baseItem;
      menuItemsRef.current = nextMenus;
      setMenuItems(nextMenus);
      syncLinkedMenuPlansToRABSilently(nextMenus, nextMap);
    } else {
      menuItemsRef.current = nextMenus;
      setMenuItems(nextMenus);
    }

    await logAudit('CREATE', 'menu', `Menyusun menu gizi baru tanggal: ${item.date} (${item.stapleFood})`);
    addToast('success', 'Menu Disimpan', `Menu siklus untuk tanggal ${item.date} berhasil ditambahkan.`);
    return createdItem;
  };

  const updateMenuItem = async (id: string, item: Partial<MenuItem>) => {
    let nextMenus = menuItemsRef.current.map(m => (m.id === id ? { ...m, ...item } : m));
    if (item.ingredients) {
      const nextMap = { ...menuIngredientsMapRef.current, [id]: item.ingredients };
      menuIngredientsMapRef.current = nextMap;
      setMenuIngredientsMap(nextMap);

      const qSmall = institutions.reduce((s, i) => s + (i.smallPortions || 0), 0);
      const qLarge = institutions.reduce((s, i) => s + (i.largePortions || 0), 0);
      nextMenus = recomputeMenuItemsFromRecipes(nextMenus, nextMap, masterUnits, qSmall, qLarge);
      menuItemsRef.current = nextMenus;
      setMenuItems(nextMenus);
      syncLinkedMenuPlansToRABSilently(nextMenus, nextMap);
    } else {
      menuItemsRef.current = nextMenus;
      setMenuItems(nextMenus);
    }
    await logAudit('UPDATE', 'menu', `Memperbarui rincian menu gizi ID: ${id}`);
    addToast('success', 'Menu Diperbarui', 'Komposisi gizi menu berhasil diperbarui.');
  };

  const deleteMenuItem = async (id: string) => {
    const nextMenus = menuItemsRef.current.filter(m => m.id !== id);
    menuItemsRef.current = nextMenus;
    setMenuItems(nextMenus);
    if (menuIngredientsMapRef.current[id]) {
      const nextMap = { ...menuIngredientsMapRef.current };
      delete nextMap[id];
      menuIngredientsMapRef.current = nextMap;
      setMenuIngredientsMap(nextMap);
      syncLinkedMenuPlansToRABSilently(nextMenus, nextMap);
    }
    await logAudit('DELETE', 'menu', `Menghapus menu ID: ${id}`);
    addToast('warning', 'Menu Dihapus', 'Rencana menu telah dihapus.');
  };

  const approveMenuItem = async (id: string, approvedBy: string) => {
    const nextStatus: MenuItem['status'] =
      currentUser.role === 'Kepala SPPG' ? 'Disetujui Kepala' : 'Diverifikasi Gizi';
    const nextMenus = menuItemsRef.current.map(m =>
      m.id === id
        ? {
            ...m,
            status: nextStatus,
            approvedBy,
          }
        : m
    );
    menuItemsRef.current = nextMenus;
    setMenuItems(nextMenus);
    await logAudit('APPROVE', 'menu', `Menyetujui menu ID: ${id} oleh ${approvedBy}`);
    addToast('success', 'Menu Disetujui', 'Status persetujuan menu gizi berhasil diproses.');
  };

  // Menu Ingredients & Jobdesk Central Sync Handlers
  const updateMenuIngredients = (menuId: string, ingredients: RecipeIngredient[]) => {
    const nextMap = {
      ...menuIngredientsMapRef.current,
      [menuId]: ingredients,
    };
    menuIngredientsMapRef.current = nextMap;
    setMenuIngredientsMap(nextMap);
    const qSmall = institutions.reduce((s, i) => s + (i.smallPortions || 0), 0);
    const qLarge = institutions.reduce((s, i) => s + (i.largePortions || 0), 0);
    const nextMenus = recomputeMenuItemsFromRecipes(
      menuItemsRef.current,
      nextMap,
      masterUnits,
      qSmall,
      qLarge
    );
    menuItemsRef.current = nextMenus;
    setMenuItems(nextMenus);
    syncLinkedMenuPlansToRABSilently(nextMenus, nextMap);

    if (auth.currentUser && /^[a-zA-Z0-9_-]+$/.test(menuId)) {
      try {
        const sanitizedIngredients = sanitizeFirestoreData(ingredients);
        setDoc(
          doc(db, 'recipes', `menu_${menuId}`),
          sanitizeFirestoreData({
            id: `menu_${menuId}`,
            sppgId: 'GFBQSYXD',
            menuId,
            ingredients: sanitizedIngredients,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
          { merge: true }
        ).catch(() => {
          // Non-blocking fallback to LocalStorage
        });
      } catch {
        // Non-blocking fallback to LocalStorage
      }
    }
  };

  const syncRecipeCustomColumnsToFirestore = (nextCols: RecipeCustomColumn[]) => {
    safeWriteLocalStorage('esppg_recipe_custom_columns_v1', JSON.stringify(nextCols));
    if (auth.currentUser) {
      try {
        setDoc(
          doc(db, 'recipes', 'custom_recipe_columns'),
          sanitizeFirestoreData({
            id: 'custom_recipe_columns',
            sppgId: 'GFBQSYXD',
            columns: nextCols,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          }),
          { merge: true }
        ).catch(() => {
          // Non-blocking fallback to LocalStorage
        });
      } catch {
        // Non-blocking fallback to LocalStorage
      }
    }
  };

  const addRecipeCustomColumn = (
    col: Omit<RecipeCustomColumn, 'id' | 'createdAt' | 'createdBy'>
  ): RecipeCustomColumn => {
    const trimmedPlaceholder = col.placeholder?.trim();
    const newCol: RecipeCustomColumn = {
      id: `resep_col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: col.title.trim(),
      inputType: col.inputType || 'text',
      ...(trimmedPlaceholder ? { placeholder: trimmedPlaceholder } : {}),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };
    setRecipeCustomColumns(prev => {
      const next = [...prev, newCol];
      syncRecipeCustomColumnsToFirestore(next);
      return next;
    });
    return newCol;
  };

  const updateRecipeCustomColumn = (
    colId: string,
    patch: Partial<Pick<RecipeCustomColumn, 'title' | 'inputType' | 'placeholder'>>
  ) => {
    setRecipeCustomColumns(prev => {
      const next = prev.map(c => {
        if (c.id !== colId) return c;
        const updated: RecipeCustomColumn = {
          ...c,
          ...(patch.title !== undefined ? { title: patch.title.trim() || c.title } : {}),
          ...(patch.inputType !== undefined ? { inputType: patch.inputType } : {}),
        };
        if (patch.placeholder !== undefined) {
          const cleaned = patch.placeholder.trim();
          if (cleaned) {
            updated.placeholder = cleaned;
          } else {
            delete updated.placeholder;
          }
        }
        return updated;
      });
      syncRecipeCustomColumnsToFirestore(next);
      return next;
    });
  };

  const deleteRecipeCustomColumn = (colId: string) => {
    setRecipeCustomColumns(prev => {
      const next = prev.filter(c => c.id !== colId);
      syncRecipeCustomColumnsToFirestore(next);
      return next;
    });
  };

  const updateDivisionJobdesks = (
    updater: DivisionJobdesk[] | ((prev: DivisionJobdesk[]) => DivisionJobdesk[])
  ) => {
    setDivisionJobdesks(prev => (typeof updater === 'function' ? updater(prev) : updater));
  };

  // Inventory CRUD, Real-Time Mutations, Opname & Cross-Module Cascading
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const newId = 'inv-' + Date.now();
    const initialQty = Number(item.currentStock ?? item.initialStock ?? 0);
    const defaultBatch = {
      id: 'b-' + Date.now(),
      batchNumber: `BATCH-${item.code}-${Date.now().toString().slice(-4)}`,
      receivedDate: item.lastRestocked || new Date().toISOString().slice(0, 10),
      expiryDate: item.expiryDate,
      initialQty,
      remainingQty: initialQty,
      unitPrice: Number(item.pricePerUnit || 0),
      supplierName: item.supplierName,
    };
    const newItem: InventoryItem = {
      ...item,
      id: newId,
      batches: item.batches && item.batches.length > 0 ? item.batches : [defaultBatch],
    };
    setInventory(prev => [newItem, ...prev]);

    if (initialQty > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const initMutation: StockMutation = {
        id: 'mut-' + Date.now(),
        itemId: newId,
        itemCode: newItem.code,
        itemName: newItem.name,
        date: todayStr,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        type: 'Stok Awal',
        referenceNumber: `INIT-${newItem.code}`,
        batchNumber: defaultBatch.batchNumber,
        expiryDate: newItem.expiryDate,
        supplierName: newItem.supplierName,
        unit: newItem.unit,
        quantityIn: initialQty,
        quantityOut: 0,
        balance: initialQty,
        unitPrice: newItem.pricePerUnit,
        totalPrice: initialQty * newItem.pricePerUnit,
        notes: 'Registrasi item gudang & pencatatan stok awal otomatis.',
        operatorName: currentUser.name,
      };
      setStockMutations(prev => [...prev, initMutation]);
    }

    await logAudit('CREATE', 'inventory', `Menambah stok bahan pangan baru: ${item.name}`);
    addToast('success', 'Bahan Terdaftar', `${item.name} berhasil ditambahkan ke inventaris gudang & kartu stok.`);
  };

  const updateInventoryItem = async (id: string, item: Partial<InventoryItem>) => {
    const existing = inventory.find(i => i.id === id);
    setInventory(prev =>
      prev.map(i => {
        if (i.id !== id) return i;
        const merged = { ...i, ...item };
        const minSt = merged.minimumStock ?? i.minimumStock;
        return {
          ...merged,
          qualityStatus:
            item.qualityStatus !== undefined
              ? item.qualityStatus
              : merged.currentStock <= minSt
              ? 'Perlu Pemantauan'
              : 'Baik',
        };
      })
    );

    let syncSummary = '';
    if (existing) {
      const syncSourceName = existing.name;
      const shouldSyncSpecs =
        item.pricePerUnit !== undefined ||
        item.unit !== undefined ||
        item.minimumStock !== undefined ||
        item.name !== undefined;

      if (shouldSyncSpecs) {
        const res = cascadeMaterialSync({
          sourceName: syncSourceName,
          nextName: item.name,
          nextUnit: item.unit,
          nextPrice: item.pricePerUnit,
          nextMinStock: item.minimumStock,
          source: 'inventory',
        });

        // Update matching open StockMutation labels if item name/unit changed
        if (item.name && item.name !== existing.name) {
          setStockMutations(prev =>
            prev.map(m => (m.itemId === id ? { ...m, itemName: item.name! } : m))
          );
        }

        const syncedParts: string[] = [];
        if (res.syncedMasterBahan > 0) syncedParts.push(`${res.syncedMasterBahan} Master Bahan`);
        if (res.syncedRAB > 0) syncedParts.push(`${res.syncedRAB} RAB Pengadaan`);
        if (res.syncedRecipeRows > 0) syncedParts.push(`${res.syncedRecipeRows} Resep & Food Cost Menu`);
        if (syncedParts.length > 0) {
          syncSummary = ` Sinkron otomatis ke ${syncedParts.join(', ')}.`;
        }
      }
    }

    await logAudit('UPDATE', 'inventory', `Memperbarui data stok bahan ID: ${id}.${syncSummary}`);
    addToast(
      'success',
      'Inventaris Diperbarui & Tersinkron',
      `Data gudang diperbarui.${syncSummary || ' Perubahan tersimpan ke pusat data.'}`
    );
  };

  const deleteInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    await logAudit('DELETE', 'inventory', `Menghapus bahan gudang ID: ${id}`);
    addToast('warning', 'Bahan Dihapus', 'Item telah dihapus dari inventaris.');
  };

  const addStockMutation = async (
    mutation: Omit<StockMutation, 'id' | 'timestamp' | 'balance'> & {
      expiryDate?: string;
      supplierName?: string;
    }
  ): Promise<StockMutation | null> => {
    if (mutation.type === 'Barang Masuk' || mutation.type === 'Stok Awal') {
      addToast(
        'warning',
        'Pemasukan Stok Wajib Melalui Quality Control',
        'Stok masuk gudang hanya diambil otomatis dari hasil Input Quality Control (Menu -> RAB -> PO -> QC).'
      );
      return null;
    }

    const targetItem = inventoryRef.current.find(i => i.id === mutation.itemId);
    if (!targetItem) return null;

    const isOutgoing = mutation.type === 'Barang Keluar' || mutation.type === 'Retur Keluar';
    const qtyIn = isOutgoing ? 0 : Number(mutation.quantityIn || 0);
    const qtyOut = isOutgoing ? Number(mutation.quantityOut || 0) : 0;

    if (isOutgoing && qtyOut > targetItem.currentStock) {
      addToast(
        'error',
        'Stok Tidak Mencukupi',
        `Stok ${targetItem.name} saat ini hanya ${targetItem.currentStock} ${targetItem.unit}.`
      );
      return null;
    }

    const newBalance = Math.max(0, targetItem.currentStock + qtyIn - qtyOut);
    const nowTime = new Date().toTimeString().slice(0, 8);
    const effectiveDate = mutation.date || new Date().toISOString().slice(0, 10);
    const unitPrice = mutation.unitPrice > 0 ? mutation.unitPrice : targetItem.pricePerUnit;

    const newMutation: StockMutation = {
      ...mutation,
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      itemCode: mutation.itemCode || targetItem.code,
      itemName: mutation.itemName || targetItem.name,
      unit: mutation.unit || targetItem.unit,
      date: effectiveDate,
      timestamp: `${effectiveDate} ${nowTime}`,
      quantityIn: qtyIn,
      quantityOut: qtyOut,
      balance: newBalance,
      unitPrice,
      totalPrice: (isOutgoing ? qtyOut : qtyIn) * unitPrice,
    };

    const nextRawMuts = [...stockMutationsRef.current, newMutation];
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: qualityControlRecordsRef.current,
      purchaseOrders: purchaseOrdersRef.current,
      rabItems: rabItemsRef.current,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: nextRawMuts,
    });
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;
    setStockMutations(invSync.stockMutations);
    setInventory(invSync.inventory);

    await logAudit(
      'UPDATE',
      'inventory',
      `Mutasi ${newMutation.type} ${targetItem.name}: ${qtyIn > 0 ? '+' + qtyIn : '-' + qtyOut} ${targetItem.unit} -> Saldo ${newBalance}`
    );
    addToast(
      'success',
      'Mutasi Stok Tersinkron',
      `${newMutation.type} ${targetItem.name} (${qtyIn > 0 ? `+${qtyIn}` : `-${qtyOut}`} ${targetItem.unit}) -> Saldo akhir: ${newBalance} ${targetItem.unit}.`
    );
    return newMutation;
  };

  const updateStockMutation = async (id: string, updates: Partial<StockMutation>) => {
    const nextRawMuts = stockMutationsRef.current.map(m => {
      if (m.id !== id) return m;
      const nextQtyIn = updates.quantityIn !== undefined ? updates.quantityIn : m.quantityIn;
      const nextQtyOut = updates.quantityOut !== undefined ? updates.quantityOut : m.quantityOut;
      const nextUnitPrice = updates.unitPrice !== undefined ? updates.unitPrice : m.unitPrice;
      const qtyBase = nextQtyIn > 0 ? nextQtyIn : nextQtyOut;
      return {
        ...m,
        ...updates,
        quantityIn: nextQtyIn,
        quantityOut: nextQtyOut,
        unitPrice: nextUnitPrice,
        totalPrice: qtyBase * nextUnitPrice,
      };
    });
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: qualityControlRecordsRef.current,
      purchaseOrders: purchaseOrdersRef.current,
      rabItems: rabItemsRef.current,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: nextRawMuts,
    });
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;
    setStockMutations(invSync.stockMutations);
    setInventory(invSync.inventory);
    await logAudit('UPDATE', 'inventory', `Memperbarui catatan mutasi stok ID: ${id}`);
    addToast('success', 'Mutasi Diperbarui', 'Catatan mutasi stok berhasil diperbarui.');
  };

  const recordStockOpname = async (input: {
    itemId: string;
    physicalStock: number;
    reason: string;
    inspectorName: string;
  }): Promise<StockOpnameRecord | null> => {
    const targetItem = inventoryRef.current.find(i => i.id === input.itemId);
    if (!targetItem) return null;

    const safePhysicalStock = toNonNegativeNumber(input.physicalStock, 0);
    const safeCurrentStock = toNonNegativeNumber(targetItem.currentStock, 0);
    const safeUnitPrice = toNonNegativeNumber(targetItem.pricePerUnit, 0);
    const diff = safePhysicalStock - safeCurrentStock;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);
    const opNum = `SO-${todayStr.replace(/-/g, '').slice(2)}-0${stockOpnames.length + 1}`;

    const newOpname: StockOpnameRecord = {
      id: 'so-' + Date.now(),
      opnameNumber: opNum,
      date: todayStr,
      itemId: targetItem.id,
      itemName: targetItem.name,
      unit: targetItem.unit,
      systemStock: safeCurrentStock,
      physicalStock: safePhysicalStock,
      difference: diff,
      unitPrice: safeUnitPrice,
      differenceValuation: diff * safeUnitPrice,
      reason: input.reason,
      inspectorName: input.inspectorName,
      status: 'Disetujui',
      verifiedBy: currentUser.name,
    };

    setStockOpnames(prev => [newOpname, ...prev]);

    if (diff !== 0) {
      const opMut: StockMutation = {
        id: 'mut-so-' + Date.now(),
        itemId: targetItem.id,
        itemCode: targetItem.code,
        itemName: targetItem.name,
        date: todayStr,
        timestamp: `${todayStr} ${nowTime}`,
        type: 'Stok Opname',
        referenceNumber: opNum,
        unit: targetItem.unit,
        quantityIn: diff > 0 ? diff : 0,
        quantityOut: diff < 0 ? Math.abs(diff) : 0,
        balance: input.physicalStock,
        unitPrice: targetItem.pricePerUnit,
        totalPrice: Math.abs(diff) * targetItem.pricePerUnit,
        notes: `Penyesuaian Stok Opname (${diff > 0 ? '+' : ''}${diff} ${targetItem.unit}). Alasan: ${input.reason}`,
        operatorName: input.inspectorName,
      };
      const nextRawMuts = [...stockMutationsRef.current, opMut];
      const invSync = reconcileInventoryFromQualityControl({
        qualityControlRecords: qualityControlRecordsRef.current,
        purchaseOrders: purchaseOrdersRef.current,
        rabItems: rabItemsRef.current,
        masterBahan,
        existingInventory: inventoryRef.current,
        existingMutations: nextRawMuts,
      });
      inventoryRef.current = invSync.inventory;
      stockMutationsRef.current = invSync.stockMutations;
      setStockMutations(invSync.stockMutations);
      setInventory(invSync.inventory);
    }

    await logAudit(
      'UPDATE',
      'inventory',
      `Stok Opname ${opNum} (${targetItem.name}): Sistem ${targetItem.currentStock} -> Fisik ${input.physicalStock} (${diff > 0 ? '+' : ''}${diff})`
    );
    addToast(
      'info',
      'Stok Opname Dicatat & Tersinkron',
      `${opNum}: Stok ${targetItem.name} disesuaikan menjadi ${input.physicalStock} ${targetItem.unit}.`
    );
    return newOpname;
  };

  const adjustStock = async (id: string, delta: number, reason: string) => {
    const targetItem = inventoryRef.current.find(i => i.id === id);
    if (!targetItem || delta === 0) return;
    const nextStock = Math.max(0, targetItem.currentStock + delta);
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    const adjMut: StockMutation = {
      id: `mut-adj-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      itemId: targetItem.id,
      itemCode: targetItem.code,
      itemName: targetItem.name,
      date: todayStr,
      timestamp: `${todayStr} ${nowTime}`,
      type: 'Stok Opname',
      referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
      unit: targetItem.unit,
      quantityIn: delta > 0 ? delta : 0,
      quantityOut: delta < 0 ? Math.abs(delta) : 0,
      balance: nextStock,
      unitPrice: targetItem.pricePerUnit,
      totalPrice: Math.abs(delta) * targetItem.pricePerUnit,
      notes: reason,
      operatorName: currentUser.name,
    };
    const nextRawMuts = [...stockMutationsRef.current, adjMut];
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: qualityControlRecordsRef.current,
      purchaseOrders: purchaseOrdersRef.current,
      rabItems: rabItemsRef.current,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: nextRawMuts,
    });
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;
    setStockMutations(invSync.stockMutations);
    setInventory(invSync.inventory);

    await logAudit('UPDATE', 'inventory', `Penyesuaian stok (${delta > 0 ? '+' : ''}${delta}) ${targetItem.name}. Alasan: ${reason}`);
    addToast('info', 'Stok & Kartu Stok Disesuaikan', `${targetItem.name} dimutakhirkan (${delta > 0 ? '+' : ''}${delta} ${targetItem.unit}).`);
  };

  // Purchase Orders Workflow (Single-pass RAB Reconciliation prevents double-counting & releases cancelled/rejected PO allocations)
  const addPurchaseOrder = async (po: Omit<PurchaseOrder, 'id'>) => {
    const sortedItems = sortPOItemsBahanThenOperasional(
      po.items || [],
      po,
      rabItemsRef.current
    );
    const newPO: PurchaseOrder = { ...po, items: sortedItems, id: 'po-' + Date.now() };
    const nextPOs = [newPO, ...purchaseOrdersRef.current];
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);

    await logAudit('CREATE', 'procurement', `Membuat Purchase Order baru: ${po.poNumber} (${po.supplierName})`);
    addToast('success', 'PO Berhasil Dibuat', `Purchase Order ${po.poNumber} berhasil diajukan & alokasi RAB disinkronkan.`);
  };

  const updatePurchaseOrder = async (id: string, po: Partial<PurchaseOrder>) => {
    const nextPOs = purchaseOrdersRef.current.map(p => (p.id === id ? { ...p, ...po } : p));
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    await logAudit('UPDATE', 'procurement', `Memperbarui Purchase Order ID: ${id}`);
    addToast('success', 'PO Diperbarui', 'Data Purchase Order & sisa alokasi RAB diperbarui.');
  };

  const verifyPurchaseOrderFinance = async (id: string, verifierName: string) => {
    const nextPOs = purchaseOrdersRef.current.map(p =>
      p.id === id
        ? {
            ...p,
            verifiedByFinance: verifierName,
            status: 'Disetujui Kepala' as const,
          }
        : p
    );
    purchaseOrdersRef.current = nextPOs;
    setPurchaseOrders(nextPOs);
    await logAudit('APPROVE', 'procurement', `Verifikasi anggaran keuangan PO ID: ${id} oleh ${verifierName}`);
    addToast('success', 'PO Terverifikasi', 'Purchase Order diverifikasi oleh Pengawas Keuangan.');
  };

  const approvePurchaseOrderHead = async (id: string, approverName: string) => {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const nextPOs = purchaseOrdersRef.current.map(p =>
      p.id === id
        ? {
            ...p,
            approvedBy: approverName,
            status: 'Disetujui Kepala' as const,
            items: (p.items || []).map(it =>
              it.approvalStatus === 'Ditolak'
                ? it
                : {
                    ...it,
                    approvalStatus: 'Disetujui' as const,
                    approvedBy: approverName,
                    approvedAt: stamp,
                  }
            ),
          }
        : p
    );
    purchaseOrdersRef.current = nextPOs;
    setPurchaseOrders(nextPOs);
    await logAudit('APPROVE', 'procurement', `Persetujuan PO ID: ${id} oleh Kepala SPPG: ${approverName}`);
    addToast('success', 'PO Disetujui', 'Purchase Order resmi disetujui Kepala SPPG.');
  };

  const updatePOQualityControl = async (id: string, qcStatus: PurchaseOrder['qcStatus'], notes: string) => {
    const nextPOs = purchaseOrdersRef.current.map(p =>
      p.id === id
        ? {
            ...p,
            qcStatus,
            qcNotes: notes,
          }
        : p
    );
    purchaseOrdersRef.current = nextPOs;
    setPurchaseOrders(nextPOs);
    await logAudit('UPDATE', 'procurement', `Pemeriksaan QC PO ID: ${id} hasil: ${qcStatus}`);
    addToast('info', 'QC Dicatat', `Hasil uji mutu penerimaan: ${qcStatus}`);
  };

  const receivePOToWarehouse = async (id: string) => {
    const po = purchaseOrdersRef.current.find(p => p.id === id);
    if (!po) return;
    const eligibleItems = (po.items || []).filter(it => it.approvalStatus !== 'Ditolak');
    if (eligibleItems.length === 0) {
      addToast('warning', 'Tidak Ada Item Disetujui', `Seluruh item pada PO ${po.poNumber} berstatus Ditolak.`);
      return;
    }
    // Record QC records per PO item so Warehouse Stock strictly flows through QC -> Inventory
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const inspectedAt = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const defaultExp = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const createdQCs: QualityControlRecord[] = eligibleItems.map((it, idx) => ({
      id: `qc-${Date.now()}-${idx}`,
      poId: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      itemName: it.itemName,
      orderedQuantity: it.quantity,
      unit: it.unit || 'kg',
      receivedQuantity: it.quantity,
      differenceQuantity: 0,
      condition: 'Baik',
      qualityGrade: 'Grade A (Sangat Baik)',
      receivingTemp: 24,
      expiryDate: defaultExp,
      notes: `Penerimaan gudang via QC otomatis PO ${po.poNumber}`,
      inspectorName: currentUser.name,
      status: 'Diterima',
      inspectedAt,
      acceptedStatusAt: inspectedAt,
      inventoryAdded: true,
    }));

    const nextQCs = [...createdQCs, ...qualityControlRecordsRef.current];
    const nextPOs = reconcilePurchaseOrdersWithQC(purchaseOrdersRef.current, nextQCs);
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: nextQCs,
      purchaseOrders: nextPOs,
      rabItems: nextRABs,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: stockMutationsRef.current,
    });

    qualityControlRecordsRef.current = nextQCs;
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;

    setQualityControlRecords(nextQCs);
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    setInventory(invSync.inventory);
    setStockMutations(invSync.stockMutations);

    await logAudit('UPDATE', 'inventory', `Penerimaan PO ${po.poNumber} diverifikasi QC & masuk ke stok gudang`);
    addToast('success', 'Bahan Diterima di Gudang', `PO ${po.poNumber} telah dicatat pada QC dan otomatis memperbarui Stok Gudang.`);
  };

  const syncDailyPOsFromRAB = async (targetDate?: string): Promise<number> => {
    const res = seedAndSyncDailyPurchaseOrders({
      purchaseOrders: purchaseOrdersRef.current,
      rabItems: rabItemsRef.current,
      menuItems: menuItemsRef.current,
      targetDate: targetDate && targetDate !== 'ALL' ? targetDate : undefined,
      includeApprovedPangan: true,
    });
    const reconciledPOs = reconcilePurchaseOrdersWithQC(
      res.purchaseOrders,
      qualityControlRecordsRef.current
    );
    const reconciledRABs = reconcileRABWithPurchaseOrders(
      reconciledPOs,
      rabItemsRef.current
    );
    purchaseOrdersRef.current = reconciledPOs;
    rabItemsRef.current = reconciledRABs;
    setPurchaseOrders(reconciledPOs);
    setRabItems(reconciledRABs);

    const changed = res.createdCount + res.updatedCount;
    const scopeLabel =
      targetDate && targetDate !== 'ALL' ? `tanggal ${targetDate}` : 'seluruh jadwal harian';
    await logAudit(
      'CREATE',
      'procurement',
      `Sinkronisasi PO Harian (Bahan Pangan lalu Operasional, target kirim H-1) untuk ${scopeLabel}: +${res.createdCount} PO baru, ${res.updatedCount} PO disesuaikan`
    );
    addToast(
      'success',
      'PO Harian (Bahan & Operasional) Disinkronkan',
      res.createdCount > 0
        ? `${res.createdCount} PO harian baru dibuat (target kirim H-1, urutan Bahan Pangan → Operasional) untuk ${scopeLabel}.`
        : `Daftar PO ${scopeLabel} sudah sesuai (urutan Bahan Pangan → Operasional & target kirim H-1).`
    );
    return changed;
  };

  // Modul PLOK: RAB Handlers & Single-Entry Sync Generators
  const addRABItem = async (item: Omit<RABItem, 'id' | 'totalBudget'>) => {
    const cleanVol = toNonNegativeNumber(item.volume, 0);
    const cleanPrice = toNonNegativeNumber(item.unitPrice, 0);
    const totalBudget = cleanVol * cleanPrice;
    const newRAB: RABItem = {
      ...item,
      volume: cleanVol,
      unitPrice: cleanPrice,
      id: 'rab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      totalBudget,
      poCreatedQuantity: 0,
      poCreatedAmount: 0,
    };
    setRabItems(prev => [newRAB, ...prev]);
    await logAudit('CREATE', 'procurement', `Membuat anggaran baru ${newRAB.budgetCode}: ${newRAB.itemName} senilai Rp ${totalBudget.toLocaleString('id-ID')}`);
    addToast('success', 'RAB Ditambahkan', `Anggaran ${newRAB.budgetCode} berhasil diajukan.`);
  };

  // Edit RAB strictly inside RAB state — NEVER modifies Menu PLOG or Foodcost PLOG
  const updateRABItem = async (id: string, item: Partial<RABItem>) => {
    const hasContentEdit =
      item.itemName !== undefined ||
      item.volume !== undefined ||
      item.unit !== undefined ||
      item.unitPrice !== undefined ||
      item.totalBudget !== undefined ||
      item.planDate !== undefined;

    const nextRABs = rabItemsRef.current.map(r => {
      if (r.id === id) {
        const sanitizedPatch: Partial<RABItem> = {
          ...item,
          ...(item.volume !== undefined ? { volume: toNonNegativeNumber(item.volume, 0) } : {}),
          ...(item.unitPrice !== undefined ? { unitPrice: toNonNegativeNumber(item.unitPrice, 0) } : {}),
          ...(item.totalBudget !== undefined ? { totalBudget: toNonNegativeNumber(item.totalBudget, 0) } : {}),
        };
        const updated: RABItem = {
          ...r,
          ...sanitizedPatch,
          ...(item.planDate && !item.periodMonth
            ? { periodMonth: formatIndonesianPeriodMonth(item.planDate) }
            : {}),
          isManualOverride:
            item.isManualOverride !== undefined
              ? item.isManualOverride
              : hasContentEdit
              ? true
              : r.isManualOverride,
        };
        if (item.totalBudget === undefined && (item.volume !== undefined || item.unitPrice !== undefined)) {
          updated.totalBudget = toNonNegativeNumber(updated.volume, 0) * toNonNegativeNumber(updated.unitPrice, 0);
        }
        return updated;
      }
      return r;
    });

    rabItemsRef.current = nextRABs;
    setRabItems(nextRABs);
    await logAudit('UPDATE', 'procurement', `Memperbarui anggaran RAB ID: ${id}`);
    addToast('success', 'RAB Diperbarui', 'Data Rencana Anggaran Belanja diperbarui tanpa mengubah Menu/Food Cost PLOG.');
  };

  // Delete RAB strictly inside RAB state — NEVER deletes Menu PLOG or Foodcost PLOG
  const deleteRABItem = async (id: string) => {
    const target = rabItemsRef.current.find(r => r.id === id);
    if (target && target.category === 'RAB Bahan Pangan') {
      const nextDeleted = new Set(deletedMenuRabKeysRef.current);
      if (target.sourceIngredientKey) {
        nextDeleted.add(target.sourceIngredientKey);
      }
      if (target.planDate && target.itemName) {
        nextDeleted.add(buildDailyMenuIngredientKey(target.planDate, target.itemName));
      }
      deletedMenuRabKeysRef.current = nextDeleted;
      safeWriteLocalStorage(
        'esppg_deleted_menu_rab_keys_v1',
        JSON.stringify(Array.from(nextDeleted))
      );
    }

    const nextRABs = rabItemsRef.current.filter(r => r.id !== id);
    rabItemsRef.current = nextRABs;
    setRabItems(nextRABs);
    await logAudit('DELETE', 'procurement', `Menghapus anggaran RAB ID: ${id} (Menu & Food Cost PLOG tetap aman)`);
    addToast(
      'info',
      'Item RAB Dihapus',
      'Item bahan pangan dihapus dari RAB. Menu PLOG & Food Cost PLOG tetap utuh dan tidak ikut terhapus.'
    );
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

  const syncCriticalInventoryToRAB = async (): Promise<number> => {
    const criticalItems = inventory.filter(i => i.currentStock <= i.minimumStock);
    if (criticalItems.length === 0) {
      addToast('info', 'Stok Gudang Aman', 'Tidak ada bahan dengan stok di bawah minimum saat ini.');
      return 0;
    }

    const activeRABs = rabItems.filter(r => r.status !== 'Ditolak');
    const newEntries: RABItem[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    criticalItems.forEach((inv, idx) => {
      const hasOpenRAB = activeRABs.some(
        r => isMatchingMaterialName(r.itemName, inv.name) && (r.volume - (r.poCreatedQuantity || 0)) > 0
      );
      if (hasOpenRAB) return;

      const suggestedVol = Math.max(inv.minimumStock * 2 - inv.currentStock, inv.minimumStock, 10);
      const codeNum = String(rabItems.length + newEntries.length + 1).padStart(3, '0');
      newEntries.push({
        id: `rab-inv-${Date.now()}-${idx}`,
        category: 'RAB Bahan Pangan',
        budgetCode: `RAB-BP-${todayStr.slice(2, 7).replace('-', '')}-${codeNum}`,
        planDate: todayStr,
        periodMonth: 'November 2026',
        itemName: inv.name,
        volume: suggestedVol,
        unit: inv.unit,
        unitPrice: inv.pricePerUnit,
        totalBudget: suggestedVol * inv.pricePerUnit,
        status: 'Menunggu Persetujuan',
        poCreatedQuantity: 0,
        poCreatedAmount: 0,
        notes: `Otomatis dari alert stok kritis Gudang (${inv.code}: sisa ${inv.currentStock} <= min ${inv.minimumStock} ${inv.unit})`,
      });
    });

    if (newEntries.length === 0) {
      addToast('info', 'Sudah Ada Pengajuan RAB', 'Seluruh bahan stok kritis sudah memiliki alokasi RAB aktif.');
      return 0;
    }

    setRabItems(prev => [...newEntries, ...prev]);
    await logAudit('CREATE', 'procurement', `Sinkronisasi otomatis ${newEntries.length} bahan stok kritis gudang ke RAB Pengadaan`);
    addToast(
      'success',
      'Sinkronisasi Gudang -> RAB Berhasil',
      `${newEntries.length} item stok kritis otomatis dibuatkan pengajuan RAB dengan harga terbaru gudang.`
    );
    return newEntries.length;
  };

  const syncAllMenuNeedsToRAB = async (targetDate?: string): Promise<number> => {
    // When user explicitly triggers daily sync, allow re-syncing items for the targeted date(s)
    // while keeping user's manually edited RAB overrides protected.
    const nextDeleted = new Set(deletedMenuRabKeysRef.current);
    if (targetDate && targetDate !== 'ALL') {
      for (const key of Array.from(nextDeleted)) {
        if (key.startsWith(`${targetDate}__`)) {
          nextDeleted.delete(key);
        }
      }
    } else {
      nextDeleted.clear();
    }
    deletedMenuRabKeysRef.current = nextDeleted;
    safeWriteLocalStorage(
      'esppg_deleted_menu_rab_keys_v1',
      JSON.stringify(Array.from(nextDeleted))
    );

    const res = syncRABWithMenuPlans({
      menuItems: menuItemsRef.current,
      menuIngredientsMap: menuIngredientsMapRef.current,
      masterUnits,
      institutions: institutionsRef.current,
      rabItems: rabItemsRef.current,
      inventory: inventoryRef.current,
      masterBahan,
      options: {
        targetDate: targetDate && targetDate !== 'ALL' ? targetDate : undefined,
        preserveManualEdits: true,
      },
    });
    const reconciledRABs = reconcileRABWithPurchaseOrders(purchaseOrdersRef.current, res.rabItems);
    rabItemsRef.current = reconciledRABs;
    setRabItems(reconciledRABs);

    const changed = res.createdCount + res.updatedCount;
    const scopeLabel =
      targetDate && targetDate !== 'ALL' ? `tanggal ${targetDate}` : 'seluruh jadwal harian';
    await logAudit(
      'CREATE',
      'procurement',
      `Sinkronisasi harian Perencanaan Menu (PLOG) ${scopeLabel} ke RAB (+${res.createdCount} item baru, ${res.updatedCount} item diperbarui)`
    );
    addToast(
      'success',
      'RAB Harian Tersinkron dari Menu PLOG',
      changed > 0
        ? `${res.createdCount} item RAB baru ditambahkan & ${res.updatedCount} item RAB diperbarui untuk ${scopeLabel}.`
        : `Seluruh item Perencanaan Menu ${scopeLabel} sudah sesuai di RAB Bahan Pangan.`
    );
    return changed;
  };

  const syncInventoryFromQualityControl = async (): Promise<number> => {
    const nextPOs = reconcilePurchaseOrdersWithQC(
      purchaseOrdersRef.current,
      qualityControlRecordsRef.current
    );
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: qualityControlRecordsRef.current,
      purchaseOrders: nextPOs,
      rabItems: nextRABs,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: stockMutationsRef.current,
    });

    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;

    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    setInventory(invSync.inventory);
    setStockMutations(invSync.stockMutations);

    await logAudit(
      'UPDATE',
      'inventory',
      `Sinkronisasi ulang Stok Gudang dari ${qualityControlRecordsRef.current.length} record Quality Control (${invSync.inventory.length} SKU aktif)`
    );
    addToast(
      'success',
      'Stok Gudang Tersinkron dari Quality Control',
      `${invSync.inventory.length} komoditas gudang & kartu stok diperbarui langsung dari hasil input QC.`
    );
    return invSync.inventory.length;
  };

  const syncMenuNeedsToRAB = async (
    menuId: string,
    needs: Array<{
      name: string;
      category: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>
  ): Promise<number> => {
    const targetMenu = menuItemsRef.current.find(m => m.id === menuId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDate = targetMenu?.date || todayStr;
    const derivedPeriodMonth = formatIndonesianPeriodMonth(targetDate);
    let createdCount = 0;
    let updatedCount = 0;

    // Clear deleted-key block for items being explicitly synced for this menu day
    const nextDeleted = new Set(deletedMenuRabKeysRef.current);
    needs.forEach(n => {
      nextDeleted.delete(buildDailyMenuIngredientKey(targetDate, n.name));
    });
    deletedMenuRabKeysRef.current = nextDeleted;
    safeWriteLocalStorage(
      'esppg_deleted_menu_rab_keys_v1',
      JSON.stringify(Array.from(nextDeleted))
    );

    const next = [...rabItemsRef.current];
    needs.forEach((need, idx) => {
      if (need.quantity <= 0) return;
      const invMatch = inventoryRef.current.find(inv => isMatchingMaterialName(inv.name, need.name));
      const mbMatch = masterBahan.find(mb => isMatchingMaterialName(mb.name, need.name));
      const resolvedPrice = need.unitPrice || mbMatch?.actualPrice || invMatch?.pricePerUnit || 15000;
      const resolvedUnit = need.unit || mbMatch?.unit || invMatch?.unit || 'kg';
      const menuLabel = targetMenu
        ? `${targetMenu.menuCode} (${targetMenu.dayName}, ${targetDate})`
        : menuId;
      const sourceKey = buildDailyMenuIngredientKey(targetDate, need.name);

      // Match strictly within the same daily date (targetDate) or sourceMenuId
      const existingDraftIdx = next.findIndex(
        r =>
          r.category === 'RAB Bahan Pangan' &&
          r.status !== 'Ditolak' &&
          (
            (r.sourceIngredientKey && r.sourceIngredientKey === sourceKey) ||
            (r.planDate === targetDate && isMatchingMaterialName(r.itemName, need.name)) ||
            (r.sourceMenuId === menuId && isMatchingMaterialName(r.itemName, need.name))
          )
      );

      const menuDishLabel = targetMenu
        ? getDishLabelFromMenu(targetMenu, need.category)
        : menuLabel;
      const autoRincianLine = {
        id: `rin-sync-${menuId}-${idx}-${Date.now()}`,
        menuName: menuDishLabel,
        ingredientName: need.name,
        quantity: need.quantity,
        unit: resolvedUnit,
        sourceMenuId: menuId,
        sourceMenuCode: targetMenu?.menuCode || menuId,
        isManual: false,
      };

      if (existingDraftIdx >= 0) {
        const curr = next[existingDraftIdx];
        if (curr.isManualOverride) {
          return;
        }
        const poUsedQty = curr.poCreatedQuantity || 0;
        const canUpdateAmounts =
          curr.status === 'Draft' ||
          curr.status === 'Menunggu Persetujuan' ||
          poUsedQty === 0;
        if (canUpdateAmounts) {
          const effVol = Math.max(need.quantity, poUsedQty);
          next[existingDraftIdx] = {
            ...curr,
            planDate: targetDate,
            periodMonth: derivedPeriodMonth,
            volume: effVol,
            unit: resolvedUnit,
            unitPrice: resolvedPrice,
            totalBudget: effVol * resolvedPrice,
            sourceType: 'menu_planning',
            sourceMenuId: menuId,
            sourceMenuCode: targetMenu?.menuCode || menuId,
            sourceMenuLabel: menuLabel,
            sourceIngredientKey: curr.sourceIngredientKey || sourceKey,
            notes: `Sumber Perencanaan Menu PLOG Harian (${targetDate}): ${menuLabel}`,
            rincianItems: curr.isRincianManual ? curr.rincianItems : [autoRincianLine],
            isRincianManual: curr.isRincianManual ?? false,
          };
          updatedCount++;
        }
      } else {
        const codeNum = String(next.length + 1).padStart(3, '0');
        const compactDate = targetDate.replace(/-/g, '').slice(2);
        next.unshift({
          id: `rab-menu-${targetDate}-${Date.now()}-${idx}`,
          category: 'RAB Bahan Pangan',
          budgetCode: `RAB-BP-${compactDate}-${codeNum}`,
          planDate: targetDate,
          periodMonth: derivedPeriodMonth,
          itemName: need.name,
          volume: need.quantity,
          unit: resolvedUnit,
          unitPrice: resolvedPrice,
          totalBudget: need.quantity * resolvedPrice,
          status: 'Menunggu Persetujuan',
          poCreatedQuantity: 0,
          poCreatedAmount: 0,
          sourceType: 'menu_planning',
          sourceMenuId: menuId,
          sourceMenuCode: targetMenu?.menuCode || menuId,
          sourceMenuLabel: menuLabel,
          sourceIngredientKey: sourceKey,
          notes: `Sumber Perencanaan Menu PLOG Harian (${targetDate}): ${menuLabel} (${need.category})`,
          rincianItems: [autoRincianLine],
          isRincianManual: false,
          isManualOverride: false,
        });
        createdCount++;
      }
    });

    const reconciled = reconcileRABWithPurchaseOrders(purchaseOrdersRef.current, next);
    rabItemsRef.current = reconciled;
    setRabItems(reconciled);

    await logAudit(
      'CREATE',
      'procurement',
      `Sinkronisasi kebutuhan bahan harian Menu ${targetMenu?.menuCode || menuId} (${targetDate}) ke RAB (+${createdCount} baru, ${updatedCount} diperbarui)`
    );
    addToast(
      'success',
      'Kebutuhan Resep Harian Tersinkron ke RAB',
      `${createdCount} item RAB baru & ${updatedCount} item RAB diperbarui untuk tanggal ${targetDate} dari resep ${targetMenu?.menuCode || ''}.`
    );
    return createdCount + updatedCount;
  };

  // Modul PLOK: Quality Control Handlers with Strict 4-Stage Pipeline Reconciliation (Menu -> RAB -> PO -> QC -> Stok Gudang)
  const addQualityControlRecord = async (qc: Omit<QualityControlRecord, 'id' | 'inspectedAt'>) => {
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const inspectedAt = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const uniqueSuffix = Math.random().toString(36).slice(2, 6);
    const orderedQuantity = toNonNegativeNumber(qc.orderedQuantity, 0);
    const receivedQuantity = toNonNegativeNumber(qc.receivedQuantity, 0);
    const receivingTemp = toFiniteNumber(qc.receivingTemp, 0);
    const differenceQuantity =
      qc.differenceQuantity !== undefined && Number.isFinite(qc.differenceQuantity)
        ? qc.differenceQuantity
        : receivedQuantity - orderedQuantity;
    const newQC: QualityControlRecord = {
      ...qc,
      orderedQuantity,
      receivedQuantity,
      receivingTemp,
      differenceQuantity,
      id: `qc-${Date.now()}-${uniqueSuffix}`,
      inspectedAt,
      ...(isQCAcceptedStatus(qc.status)
        ? { acceptedStatusAt: qc.acceptedStatusAt || inspectedAt }
        : {}),
    };
    if (!isQCAcceptedStatus(qc.status)) {
      delete newQC.acceptedStatusAt;
    }

    const nextQCs = [newQC, ...qualityControlRecordsRef.current];
    const nextPOs = reconcilePurchaseOrdersWithQC(purchaseOrdersRef.current, nextQCs);
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: nextQCs,
      purchaseOrders: nextPOs,
      rabItems: nextRABs,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: stockMutationsRef.current,
    });

    qualityControlRecordsRef.current = nextQCs;
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;

    setQualityControlRecords(nextQCs);
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    setInventory(invSync.inventory);
    setStockMutations(invSync.stockMutations);

    await logAudit('CREATE', 'procurement', `Pemeriksaan QC PO ${qc.poNumber}: ${qc.itemName} status ${qc.status} (${receivedQuantity} ${qc.unit})`);
    addToast('success', 'QC Dicatat & Tersinkron ke Gudang', `Pemeriksaan QC PO ${qc.poNumber} tersimpan & otomatis memperbarui Stok Gudang.`);
  };

  const updateQualityControlRecord = async (id: string, qc: Partial<QualityControlRecord>) => {
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const nowStamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const nextQCs = qualityControlRecordsRef.current.map(r => {
      if (r.id !== id) return r;
      const merged: QualityControlRecord = { ...r, ...qc };
      const ordered = toNonNegativeNumber(merged.orderedQuantity, 0);
      const received = toNonNegativeNumber(merged.receivedQuantity, 0);
      merged.orderedQuantity = ordered;
      merged.receivedQuantity = received;
      merged.receivingTemp = toFiniteNumber(merged.receivingTemp, 0);
      merged.differenceQuantity =
        qc.differenceQuantity !== undefined && Number.isFinite(qc.differenceQuantity)
          ? qc.differenceQuantity
          : received - ordered;
      if (qc.status !== undefined) {
        if (isQCAcceptedStatus(qc.status)) {
          if (qc.acceptedStatusAt) {
            merged.acceptedStatusAt = qc.acceptedStatusAt;
          } else if (r.status !== qc.status || !r.acceptedStatusAt) {
            merged.acceptedStatusAt = nowStamp;
          }
        } else {
          delete merged.acceptedStatusAt;
        }
      }
      return merged;
    });
    const nextPOs = reconcilePurchaseOrdersWithQC(purchaseOrdersRef.current, nextQCs);
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: nextQCs,
      purchaseOrders: nextPOs,
      rabItems: nextRABs,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: stockMutationsRef.current,
    });

    qualityControlRecordsRef.current = nextQCs;
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;

    setQualityControlRecords(nextQCs);
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    setInventory(invSync.inventory);
    setStockMutations(invSync.stockMutations);

    await logAudit('UPDATE', 'procurement', `Memperbarui data QC ID: ${id} & menyinkronkan PO + Stok Gudang`);
    addToast('success', 'QC & Stok Gudang Diperbarui', 'Perubahan pemeriksaan mutu otomatis menyinkronkan PO dan saldo Stok Gudang.');
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

  // Finance Transactions (legacy internal helpers kept compatible via 'petty_cash' audit key)
  const addTransaction = async (tx: Omit<FinancialTransaction, 'id'>) => {
    const newTx: FinancialTransaction = { ...tx, id: 'tx-' + Date.now() };
    setFinancialTransactions(prev => [newTx, ...prev]);
    await logAudit('CREATE', 'petty_cash', `Mencatat ${tx.type} Rp ${tx.amount} (${tx.description}) [${tx.approvalStatus}]`);
    addToast('success', 'Transaksi Tercatat', `Kas ${tx.type} Rp ${tx.amount.toLocaleString('id-ID')} berhasil dicatat.`);
  };

  const updateTransaction = async (id: string, update: Partial<FinancialTransaction>) => {
    setFinancialTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...update } : t)));
    await logAudit('UPDATE', 'petty_cash', `Memperbarui transaksi kas ID: ${id}`);
    addToast('info', 'Transaksi Diperbarui', 'Pembaruan data transaksi berhasil disimpan.');
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    const target = financialTransactions.find(t => t.id === id);
    if (!target) return false;

    if (target.approvalStatus === 'Disetujui') {
      addToast('error', 'Hapus Ditolak', 'Transaksi yang berstatus Disetujui tidak boleh dihapus secara permanen. Gunakan prosedur Pembatalan Resmi dengan jejak audit.');
      return false;
    }

    setFinancialTransactions(prev => prev.filter(t => t.id !== id));
    await logAudit('DELETE', 'petty_cash', `Menghapus transaksi draf/ditolak kas ID: ${id} (${target.transactionNumber})`);
    addToast('warning', 'Transaksi Dihapus', 'Pencatatan kas telah dihapus.');
    return true;
  };

  const approveTransaction = async (id: string, approverName: string) => {
    const now = new Date().toLocaleString('id-ID');
    setFinancialTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, approvalStatus: 'Disetujui', approvedBy: approverName, approvedAt: now } : t))
    );
    await logAudit('APPROVE', 'petty_cash', `Menyetujui transaksi kas ID: ${id} oleh ${approverName}`);
    addToast('success', 'Transaksi Disetujui', 'Pencatatan kas resmi disahkan dan mempengaruhi saldo kas.');
  };

  const rejectTransaction = async (id: string, reason: string) => {
    setFinancialTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, approvalStatus: 'Ditolak', notes: (t.notes ? t.notes + ' | ' : '') + `Ditolak: ${reason}` } : t))
    );
    await logAudit('UPDATE', 'petty_cash', `Menolak transaksi kas ID: ${id} alasan: ${reason}`);
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
    await logAudit('DELETE', 'petty_cash', `PEMBATALAN TRANSAKSI RESMI ID: ${id} alasan: "${reason}" oleh: ${cancelledByName}`);
    addToast('error', 'Transaksi Dibatalkan', 'Transaksi disetujui telah dibatalkan dengan jejak audit permanen.');
  };

  // ---------------------------------------------------------------------------
  // KAS PETTY CASH (Saldo Awal, Pemasukan, Pengeluaran, Saldo Akhir)
  // ---------------------------------------------------------------------------
  const setPettyCashOpeningBalance = async (amount: number) => {
    const sanitized = Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
    setPettyCashOpeningBalanceState(sanitized);
    await logAudit('UPDATE', 'petty_cash', `Menetapkan Saldo Awal Kas Petty Cash sebesar Rp ${sanitized.toLocaleString('id-ID')}`);
    addToast('success', 'Saldo Awal Disimpan', `Saldo awal Petty Cash diperbarui menjadi Rp ${sanitized.toLocaleString('id-ID')}.`);
  };

  const addPettyCashTransaction = async (
    tx: Omit<PettyCashTransaction, 'id' | 'createdAt'>
  ): Promise<PettyCashTransaction> => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const cleanAmount = toNonNegativeNumber(tx.amount, 0);
    const created: PettyCashTransaction = {
      ...tx,
      amount: cleanAmount,
      id: 'pc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      createdAt: now,
    };
    setPettyCashTransactions(prev => [created, ...prev]);
    await logAudit('CREATE', 'petty_cash', `Petty Cash ${tx.type}: Rp ${cleanAmount.toLocaleString('id-ID')} - ${tx.description}`);
    addToast('success', `${tx.type} Petty Cash Dicatat`, `${tx.voucherNumber} sebesar Rp ${cleanAmount.toLocaleString('id-ID')} tersimpan.`);
    return created;
  };

  const updatePettyCashTransaction = async (id: string, tx: Partial<PettyCashTransaction>) => {
    const sanitizedPatch: Partial<PettyCashTransaction> = {
      ...tx,
      ...(tx.amount !== undefined ? { amount: toNonNegativeNumber(tx.amount, 0) } : {}),
    };
    setPettyCashTransactions(prev => prev.map(item => (item.id === id ? { ...item, ...sanitizedPatch } : item)));
    await logAudit('UPDATE', 'petty_cash', `Memperbarui mutasi Petty Cash ID: ${id}`);
    addToast('info', 'Mutasi Diperbarui', 'Data transaksi Petty Cash berhasil diperbarui.');
  };

  const deletePettyCashTransaction = async (id: string) => {
    const target = pettyCashTransactions.find(item => item.id === id);
    setPettyCashTransactions(prev => prev.filter(item => item.id !== id));
    await logAudit('DELETE', 'petty_cash', `Menghapus mutasi Petty Cash ${target?.voucherNumber || id}`);
    addToast('warning', 'Mutasi Dihapus', 'Catatan mutasi Petty Cash telah dihapus dan saldo akhir dihitung ulang.');
  };

  // ---------------------------------------------------------------------------
  // INSENTIF PIC LEMBAGA (Terhubung Data Harian Penerima Manfaat)
  // ---------------------------------------------------------------------------
  const updatePICIncentiveConfig = async (cfg: Partial<PICIncentiveConfig>) => {
    const updated: PICIncentiveConfig = {
      ...picIncentiveConfig,
      ...cfg,
      institutionRates:
        cfg.institutionRates !== undefined
          ? cfg.institutionRates
          : picIncentiveConfig.institutionRates || {},
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedBy: currentUser.name,
    };
    setPicIncentiveConfig(updated);
    const customCount = Object.keys(updated.institutionRates || {}).length;
    await logAudit(
      'UPDATE',
      'pic_incentives',
      `Memperbarui tarif insentif PIC Lembaga (Default: ${
        updated.rateMode === 'per_porsi'
          ? `Rp ${updated.ratePerPortion}/porsi`
          : `Flat Rp ${updated.flatDailyRate}/hari`
      }, ${customCount} tarif khusus lembaga)`
    );
    addToast(
      'success',
      'Tarif Insentif PIC Disimpan',
      'Perhitungan insentif PIC per lembaga otomatis menyesuaikan data kehadiran harian.'
    );
  };

  const upsertPICIncentivePayout = async (
    payout: Omit<PICIncentivePayout, 'id'> & { id?: string },
    recordToPettyCash: boolean = false
  ) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const targetId = payout.id || `picp-${payout.attendanceLogId}`;
    let pettyCashTxId = payout.pettyCashTxId;

    if (recordToPettyCash && payout.status === 'Sudah Dibayarkan' && !pettyCashTxId && payout.totalIncentive > 0) {
      const pcTx = await addPettyCashTransaction({
        voucherNumber: `BKK-PC/PIC/${payout.date.replace(/-/g, '')}/${String(pettyCashTransactions.length + 1).padStart(3, '0')}`,
        date: payout.date,
        type: 'Pengeluaran',
        category: 'Insentif PIC Lembaga',
        description: `Pencairan Insentif PIC ${payout.institutionName} (${payout.presentPortions} porsi hadir)`,
        counterparty: `${payout.picName} (${payout.institutionName})`,
        amount: payout.totalIncentive,
        recordedBy: currentUser.name,
        sourceModule: 'pic_incentives',
        sourceRefId: targetId,
        proofNumber: `INS-PIC-${payout.attendanceLogId}`,
        notes: `Otomatis terhubung dari Modul Insentif PIC Lembaga.`,
      });
      pettyCashTxId = pcTx.id;
    }

    const finalRecord: PICIncentivePayout = {
      ...payout,
      id: targetId,
      pettyCashTxId,
      approvedAt: payout.status !== 'Menunggu Pencairan' ? payout.approvedAt || now : payout.approvedAt,
      paidAt: payout.status === 'Sudah Dibayarkan' ? payout.paidAt || now : payout.paidAt,
    };

    setPicIncentivePayouts(prev => {
      const idx = prev.findIndex(p => p.id === targetId || p.attendanceLogId === payout.attendanceLogId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...finalRecord };
        return next;
      }
      return [finalRecord, ...prev];
    });

    await logAudit('APPROVE', 'pic_incentives', `Status insentif PIC ${payout.institutionName} (${payout.date}) -> ${payout.status} Rp ${payout.totalIncentive.toLocaleString('id-ID')}`);
    addToast('success', 'Insentif PIC Diperbarui', `${payout.picName} (${payout.institutionName}): ${payout.status}.`);
  };

  const batchApprovePICIncentives = async (items: (Omit<PICIncentivePayout, 'id'> & { id?: string })[]) => {
    if (items.length === 0) return;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setPicIncentivePayouts(prev => {
      const next = [...prev];
      for (const item of items) {
        const targetId = item.id || `picp-${item.attendanceLogId}`;
        const idx = next.findIndex(p => p.id === targetId || p.attendanceLogId === item.attendanceLogId);
        const merged: PICIncentivePayout = {
          ...item,
          id: targetId,
          status: 'Disetujui',
          approvedBy: currentUser.name,
          approvedAt: now,
        };
        if (idx >= 0) {
          if (next[idx].status !== 'Sudah Dibayarkan') {
            next[idx] = { ...next[idx], ...merged };
          }
        } else {
          next.unshift(merged);
        }
      }
      return next;
    });
    await logAudit('APPROVE', 'pic_incentives', `Menyetujui massal ${items.length} daftar insentif PIC Lembaga.`);
    addToast('success', 'Persetujuan Massal Berhasil', `${items.length} tagihan insentif PIC telah disetujui.`);
  };

  // ---------------------------------------------------------------------------
  // INSENTIF RELAWAN (Terhubung Data Absensi & Penggantian Relawan)
  // ---------------------------------------------------------------------------
  const updateVolunteerIncentiveConfig = async (cfg: Partial<VolunteerIncentiveConfig>) => {
    const updated: VolunteerIncentiveConfig = {
      ...volunteerIncentiveConfig,
      ...cfg,
      divisionRates: {
        ...volunteerIncentiveConfig.divisionRates,
        ...(cfg.divisionRates || {}),
      },
      positionRates:
        cfg.positionRates !== undefined
          ? cfg.positionRates
          : volunteerIncentiveConfig.positionRates || {},
      divisionPositionRates:
        cfg.divisionPositionRates !== undefined
          ? cfg.divisionPositionRates
          : volunteerIncentiveConfig.divisionPositionRates || {},
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedBy: currentUser.name,
    };
    setVolunteerIncentiveConfig(updated);
    const customPosCount = Object.values(updated.divisionPositionRates || {}).reduce(
      (sum, posMap) => sum + Object.keys(posMap || {}).length,
      0
    );
    await logAudit(
      'UPDATE',
      'volunteer_incentives',
      `Memperbarui tarif insentif harian relawan per divisi & jabatan (${customPosCount} tarif khusus jabatan/divisi).`
    );
    addToast(
      'success',
      'Tarif Relawan Disimpan',
      'Tarif insentif per divisi & jabatan berhasil diperbarui.'
    );
  };

  const upsertVolunteerIncentivePayout = async (
    payout: Omit<VolunteerIncentivePayout, 'id'> & { id?: string },
    recordToPettyCash: boolean = false
  ) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const targetId = payout.id || `volp-${payout.attendanceId}`;
    let pettyCashTxId = payout.pettyCashTxId;

    if (recordToPettyCash && payout.status === 'Sudah Dibayarkan' && !pettyCashTxId && payout.totalIncentive > 0) {
      const pcTx = await addPettyCashTransaction({
        voucherNumber: `BKK-PC/REL/${payout.date.replace(/-/g, '')}/${String(pettyCashTransactions.length + 1).padStart(3, '0')}`,
        date: payout.date,
        type: 'Pengeluaran',
        category: 'Insentif Relawan',
        description: `Pencairan Insentif Relawan ${payout.volunteerName} (Div. ${payout.division}${payout.isSubstitute ? ' - Pengganti' : ''})`,
        counterparty: payout.volunteerName,
        amount: payout.totalIncentive,
        recordedBy: currentUser.name,
        sourceModule: 'volunteer_incentives',
        sourceRefId: targetId,
        proofNumber: `INS-REL-${payout.attendanceId}`,
        notes: `Otomatis terhubung dari Modul Insentif Relawan.`,
      });
      pettyCashTxId = pcTx.id;
    }

    const finalRecord: VolunteerIncentivePayout = {
      ...payout,
      id: targetId,
      pettyCashTxId,
      approvedAt: payout.status !== 'Menunggu Pencairan' ? payout.approvedAt || now : payout.approvedAt,
      paidAt: payout.status === 'Sudah Dibayarkan' ? payout.paidAt || now : payout.paidAt,
    };

    setVolunteerIncentivePayouts(prev => {
      const idx = prev.findIndex(p => p.id === targetId || p.attendanceId === payout.attendanceId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...finalRecord };
        return next;
      }
      return [finalRecord, ...prev];
    });

    await logAudit('APPROVE', 'volunteer_incentives', `Status insentif relawan ${payout.volunteerName} (${payout.date}) -> ${payout.status} Rp ${payout.totalIncentive.toLocaleString('id-ID')}`);
    addToast('success', 'Insentif Relawan Diperbarui', `${payout.volunteerName}: ${payout.status}.`);
  };

  const batchApproveVolunteerIncentives = async (items: (Omit<VolunteerIncentivePayout, 'id'> & { id?: string })[]) => {
    if (items.length === 0) return;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setVolunteerIncentivePayouts(prev => {
      const next = [...prev];
      for (const item of items) {
        const targetId = item.id || `volp-${item.attendanceId}`;
        const idx = next.findIndex(p => p.id === targetId || p.attendanceId === item.attendanceId);
        const merged: VolunteerIncentivePayout = {
          ...item,
          id: targetId,
          status: 'Disetujui',
          approvedBy: currentUser.name,
          approvedAt: now,
        };
        if (idx >= 0) {
          if (next[idx].status !== 'Sudah Dibayarkan') {
            next[idx] = { ...next[idx], ...merged };
          }
        } else {
          next.unshift(merged);
        }
      }
      return next;
    });
    await logAudit('APPROVE', 'volunteer_incentives', `Menyetujui massal ${items.length} insentif harian relawan.`);
    addToast('success', 'Persetujuan Massal Berhasil', `${items.length} insentif relawan telah disetujui.`);
  };

  // Volunteers Attendance
  const recordAttendance = async (att: Omit<VolunteerAttendance, 'id'>) => {
    const matchedMaster = masterVolunteers.find(
      m => m.id === att.volunteerId || m.name.trim().toLowerCase() === att.volunteerName.trim().toLowerCase()
    );
    const newAtt: VolunteerAttendance = {
      ...att,
      id: 'v-' + Date.now(),
      volunteerId: matchedMaster?.id || att.volunteerId,
      volunteerName: matchedMaster?.name || att.volunteerName,
      division: (matchedMaster?.division as VolunteerAttendance['division']) || att.division,
    };
    setVolunteerAttendance(prev => [newAtt, ...prev]);
    await logAudit('CREATE', 'volunteers', `Absensi relawan: ${newAtt.volunteerName} (${newAtt.status})`);
    addToast('success', 'Presensi Dicatat', `Kehadiran ${newAtt.volunteerName} berhasil disimpan.`);
  };

  const updateAttendance = async (id: string, att: Partial<VolunteerAttendance>) => {
    const matchedMaster = att.volunteerName
      ? masterVolunteers.find(
          m => m.id === att.volunteerId || m.name.trim().toLowerCase() === att.volunteerName!.trim().toLowerCase()
        )
      : undefined;
    setVolunteerAttendance(prev =>
      prev.map(v =>
        v.id === id
          ? {
              ...v,
              ...att,
              ...(matchedMaster
                ? {
                    volunteerId: matchedMaster.id,
                    volunteerName: matchedMaster.name,
                    division: (matchedMaster.division as VolunteerAttendance['division']) || att.division || v.division,
                  }
                : {}),
            }
          : v
      )
    );
    await logAudit('UPDATE', 'volunteers', `Memperbarui data kehadiran relawan ID: ${id}`);
    addToast('info', 'Presensi Dimutakhirkan', 'Status kehadiran relawan telah diperbarui.');
  };

  const syncVolunteerAttendanceFromMaster = async (
    date: string
  ): Promise<{ createdCount: number; updatedCount: number }> => {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const activeMasters = masterVolunteers.filter(m => m.isActive);
    if (activeMasters.length === 0) {
      addToast('warning', 'Master Relawan Kosong', 'Tidak ada relawan berstatus Aktif di Master Data Relawan.');
      return { createdCount: 0, updatedCount: 0 };
    }

    let createdCount = 0;
    let updatedCount = 0;

    setVolunteerAttendance(prev => {
      const next = [...prev];

      for (const vol of activeMasters) {
        const matchedAbsence = volunteerAbsences.find(
          abs =>
            abs.date === targetDate &&
            abs.approvalStatus === 'Disetujui' &&
            (abs.volunteerId === vol.id ||
              abs.volunteerName.trim().toLowerCase() === vol.name.trim().toLowerCase())
        );

        const existingIdx = next.findIndex(
          att =>
            att.date === targetDate &&
            (att.volunteerId === vol.id ||
              att.volunteerName.trim().toLowerCase() === vol.name.trim().toLowerCase())
        );

        if (existingIdx >= 0) {
          const existing = next[existingIdx];
          const nextDivision = (vol.division as VolunteerAttendance['division']) || existing.division;
          const needsMasterSync =
            existing.volunteerId !== vol.id ||
            existing.volunteerName !== vol.name ||
            existing.division !== nextDivision;
          const needsAbsenceSync =
            matchedAbsence &&
            (existing.status === 'Hadir' || !existing.replacementVolunteer);

          if (needsMasterSync || needsAbsenceSync) {
            next[existingIdx] = {
              ...existing,
              volunteerId: vol.id,
              volunteerName: vol.name,
              division: nextDivision,
              ...(matchedAbsence
                ? {
                    status: matchedAbsence.reason === 'Sakit' ? 'Sakit' : 'Izin',
                    healthCheckPassed: matchedAbsence.reason !== 'Sakit',
                    hygieneGearComplete: false,
                    reason: `${matchedAbsence.reason}${matchedAbsence.reasonDetails ? `: ${matchedAbsence.reasonDetails}` : ''}`,
                    replacementVolunteer: matchedAbsence.replacementVolunteerName,
                    notes: `Tersinkron izin disetujui. Pengganti: ${matchedAbsence.replacementVolunteerName} (Divisi ${matchedAbsence.replacementDivision}).`,
                  }
                : {}),
            };
            updatedCount += 1;
          }
        } else {
          const defaultShift: VolunteerAttendance['shift'] =
            vol.division === 'Cuci Ompreng' || vol.division === 'Kebersihan'
              ? 'Siang (08:00 - 13:00)'
              : 'Pagi (03:30 - 08:30)';

          const newAtt: VolunteerAttendance = {
            id: `v-sync-${targetDate}-${vol.id}-${Date.now().toString().slice(-4)}`,
            date: targetDate,
            volunteerId: vol.id,
            volunteerName: vol.name,
            division: (vol.division as VolunteerAttendance['division']) || 'Persiapan',
            shift: defaultShift,
            status: matchedAbsence ? (matchedAbsence.reason === 'Sakit' ? 'Sakit' : 'Izin') : 'Hadir',
            healthCheckPassed: matchedAbsence ? matchedAbsence.reason !== 'Sakit' : true,
            hygieneGearComplete: matchedAbsence ? false : true,
            reason: matchedAbsence
              ? `${matchedAbsence.reason}${matchedAbsence.reasonDetails ? `: ${matchedAbsence.reasonDetails}` : ''}`
              : undefined,
            replacementVolunteer: matchedAbsence?.replacementVolunteerName,
            notes: matchedAbsence
              ? `Tersinkron dari Master Relawan & Izin Disetujui. Pengganti: ${matchedAbsence.replacementVolunteerName}.`
              : `Sinkronisasi otomatis dari Master Relawan (${vol.code || vol.id} • ${vol.position}).`,
          };
          next.unshift(newAtt);
          createdCount += 1;
        }
      }

      return next;
    });

    await logAudit(
      'UPDATE',
      'volunteers',
      `Sinkronisasi presensi harian tanggal ${targetDate} dari Master Relawan (${createdCount} baru, ${updatedCount} diperbarui).`
    );

    if (createdCount === 0 && updatedCount === 0) {
      addToast('info', 'Presensi Sudah Sinkron', `Seluruh ${activeMasters.length} relawan aktif pada ${targetDate} sudah tercatat & sinkron.`);
    } else {
      addToast(
        'success',
        'Presensi Tersinkron dari Master',
        `${createdCount} presensi ditambahkan & ${updatedCount} data dimutakhirkan untuk ${targetDate}.`
      );
    }

    return { createdCount, updatedCount };
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

  // Kitchen Progress (otomatis terhitung real-time dari catatan 5 Divisi Produksi + Distribusi)
  const kitchenProgress = React.useMemo<KitchenProgress>(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const allOpsDates = [
      ...prepRecords.map(r => r.date),
      ...cookingRecords.map(r => r.date),
      ...portioningRecords.map(r => r.date),
      ...distributionDeliveries.map(r => r.date),
      ...distributionLogs.map(r => r.date),
      ...washingWasteRecords.map(r => r.date),
    ].filter(Boolean);

    const activeDate = allOpsDates.includes(todayIso)
      ? todayIso
      : allOpsDates.sort().reverse()[0] || todayIso;

    const dayPrep = prepRecords.filter(r => r.date === activeDate);
    const dayCook = cookingRecords.filter(r => r.date === activeDate);
    const dayPort = portioningRecords.filter(r => r.date === activeDate);
    const dayDeliv = distributionDeliveries.filter(r => r.date === activeDate);
    const dayLogs = distributionLogs.filter(r => r.date === activeDate);
    const dayReturns = omprengReturns.filter(r => r.date === activeDate);
    const dayWaste = washingWasteRecords.filter(r => r.date === activeDate);

    // 1. Divisi Persiapan
    let preparation = 0;
    if (dayPrep.length > 0) {
      const latestPrep = dayPrep[0];
      const hasDamagedCheck = Boolean(
        latestPrep.damagedVegetable?.name ||
          latestPrep.damagedAnimal?.name ||
          latestPrep.damagedFruit?.name ||
          (latestPrep.additionalDamagedItems && latestPrep.additionalDamagedItems.length > 0)
      );
      const hasFacilityTemp = Boolean(latestPrep.facilityTemps);
      preparation = 40 + (hasDamagedCheck ? 30 : 0) + (hasFacilityTemp ? 30 : 0);
    }

    // 2. Divisi Pengolahan
    let cooking = 0;
    if (dayCook.length > 0) {
      const latestCook = dayCook[0];
      const tempsList = latestCook.itemEntries?.length
        ? latestCook.itemEntries.map(it => it.temp)
        : [
            latestCook.cookedFoods.rice.temp,
            latestCook.cookedFoods.animalProtein.temp,
            latestCook.cookedFoods.plantProtein.temp,
            latestCook.cookedFoods.vegetable.temp,
            latestCook.cookedFoods.fruit.temp,
          ];
      const validTempCount = tempsList.filter(t => typeof t === 'number' && Number.isFinite(t)).length;
      const tempRatio = tempsList.length > 0 ? Math.min(1, validTempCount / tempsList.length) : 0;
      const hasFacTemp = Boolean(latestCook.facilityTemps);
      cooking = Math.min(100, Math.round(40 + tempRatio * 40 + (hasFacTemp ? 20 : 0)));
    }

    // 3. Divisi Pemorsian
    let portioning = 0;
    if (dayPort.length > 0) {
      const latestPort = dayPort[0];
      const hasWeights =
        latestPort.smallPortionWeightGrams > 0 && latestPort.largePortionWeightGrams > 0;
      const hasFoodTemps = Boolean(
        latestPort.foodTemps &&
          typeof latestPort.foodTemps.rice?.temp === 'number' &&
          Number.isFinite(latestPort.foodTemps.rice.temp)
      );
      const hasPhotos = Boolean(latestPort.smallPortionPhoto || latestPort.largePortionPhoto);
      portioning =
        40 + (hasWeights ? 25 : 0) + (hasFoodTemps ? 20 : 0) + (hasPhotos ? 15 : 0);
    }

    // 4. Divisi Distribusi
    const activeInstitutions = institutions.filter(i => i.isActive !== false);
    const normalizeInstName = (name?: string) => (name || '').trim().toLowerCase();
    const resolveStatusWeight = (status?: string) => {
      if (status === 'Selesai Serah Terima') return 1;
      if (status === 'Tiba di Lokasi') return 0.75;
      if (status === 'Dalam Perjalanan') return 0.5;
      return 0;
    };

    let distribution = 0;
    if (activeInstitutions.length > 0) {
      const weightSum = activeInstitutions.reduce((sum, inst) => {
        const matchedDeliv = dayDeliv.find(
          d =>
            d.institutionId === inst.id ||
            normalizeInstName(d.institutionName) === normalizeInstName(inst.name)
        );
        const matchedLog = dayLogs.find(
          l =>
            l.institutionId === inst.id ||
            normalizeInstName(l.institutionName) === normalizeInstName(inst.name)
        );
        const status = matchedDeliv?.status || matchedLog?.status;
        return sum + resolveStatusWeight(status);
      }, 0);
      distribution = Math.min(100, Math.round((weightSum / activeInstitutions.length) * 100));
    } else if (dayDeliv.length > 0 || dayLogs.length > 0) {
      const sourceList = dayDeliv.length > 0 ? dayDeliv : dayLogs;
      const weightSum = sourceList.reduce((sum, item) => sum + resolveStatusWeight(item.status), 0);
      distribution = Math.min(100, Math.round((weightSum / sourceList.length) * 100));
    }

    // 5. Divisi Cuci Ompreng & Food Waste
    let washing = 0;
    if (dayWaste.length > 0 || dayReturns.length > 0) {
      const returnDenominator = Math.max(
        1,
        dayDeliv.length || dayLogs.length || activeInstitutions.length
      );
      const uniqueReturnInsts = new Set(
        dayReturns.map(r => r.institutionId || normalizeInstName(r.institutionName))
      );
      const returnRatio = Math.min(1, uniqueReturnInsts.size / returnDenominator);
      const wasteScore =
        dayWaste.length > 0 ? (dayWaste.some(w => w.sterilizationChecked) ? 50 : 35) : 0;
      washing = Math.min(100, Math.round(returnRatio * 50 + wasteScore));
    }

    const tasteCheckDone =
      dayCook.length > 0 ||
      dayDeliv.some(d => Boolean(d.picOrganolepticPhoto) || d.status === 'Selesai Serah Terima');
    const temperatureLogged =
      dayPrep.some(r => Boolean(r.facilityTemps)) || dayCook.length > 0 || dayPort.length > 0;

    return {
      preparation,
      cooking,
      portioning,
      distribution,
      washing,
      tasteCheckDone,
      temperatureLogged,
      ...(kitchenProgressOverride || {}),
    };
  }, [
    prepRecords,
    cookingRecords,
    portioningRecords,
    distributionDeliveries,
    distributionLogs,
    omprengReturns,
    washingWasteRecords,
    institutions,
    kitchenProgressOverride,
  ]);

  const updateKitchenProgress = (progress: Partial<KitchenProgress>) => {
    setKitchenProgressOverride(prev => ({ ...(prev || {}), ...progress }));
    addToast('info', 'Progres Dapur Diperbarui', 'Checklist kesiapan produksi harian dimutakhirkan.');
  };

  // 5 Divisi Dapur & Operasional Actions
  const addPrepRecord = async (rec: Omit<PreparationInspectionRecord, 'id'>) => {
    const newRec: PreparationInspectionRecord = {
      ...rec,
      id: `prep-${Date.now()}`,
    };
    const nextRecords = [newRec, ...prepRecordsRef.current];
    prepRecordsRef.current = nextRecords;
    setPrepRecords(nextRecords);
    addToast('success', 'Data Persiapan Tersimpan', `Pemeriksaan bahan rusak dan suhu oleh ${rec.officerName} berhasil dicatat.`);
    await logAudit('CREATE', 'production', `Mencatat inspeksi bahan rusak & suhu Divisi Persiapan: ${rec.damagedVegetable.name}`);
  };

  const updatePrepRecord = async (id: string, update: Partial<PreparationInspectionRecord>) => {
    const nextRecords = prepRecordsRef.current.map(r => (r.id === id ? { ...r, ...update } : r));
    prepRecordsRef.current = nextRecords;
    setPrepRecords(nextRecords);
    addToast('success', 'Laporan Persiapan Diperbarui', 'Pembaruan suhu & bukti foto Divisi Persiapan berhasil disimpan.');
    await logAudit('UPDATE', 'production', `Memperbarui laporan suhu/foto Divisi Persiapan (${id})`);
  };

  const addCookingRecord = async (rec: Omit<CookingInspectionRecord, 'id'>): Promise<CookingInspectionRecord> => {
    const newRec: CookingInspectionRecord = {
      ...rec,
      id: `cook-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const nextRecords = [newRec, ...cookingRecordsRef.current];
    cookingRecordsRef.current = nextRecords;
    setCookingRecords(nextRecords);
    const persisted = safeWriteLocalStorage('esppg_cooking_records', JSON.stringify(nextRecords));
    if (!persisted) {
      addToast(
        'warning',
        'Memori Browser Penuh',
        'Data pengolahan tersimpan di sesi aktif, namun sebagian foto terlalu besar untuk cache lokal browser.'
      );
    } else {
      addToast('success', 'Data Pengolahan Tersimpan', `Titik kendali kritis (CCP) suhu matang masakan dicatat.`);
    }
    await logAudit('CREATE', 'production', `Mencatat suhu makanan matang Divisi Pengolahan oleh ${rec.officerName}`);
    return newRec;
  };

  const updateCookingRecord = async (id: string, update: Partial<CookingInspectionRecord>) => {
    const nextRecords = cookingRecordsRef.current.map(r => (r.id === id ? { ...r, ...update } : r));
    cookingRecordsRef.current = nextRecords;
    setCookingRecords(nextRecords);
    const persisted = safeWriteLocalStorage('esppg_cooking_records', JSON.stringify(nextRecords));
    if (!persisted) {
      addToast(
        'warning',
        'Memori Browser Penuh',
        'Perubahan tersimpan di sesi aktif, namun ukuran total foto melebihi batas penyimpanan lokal browser.'
      );
    } else {
      addToast('success', 'Laporan Pengolahan Diperbarui', 'Pembaruan suhu & bukti foto Divisi Pengolahan berhasil disimpan.');
    }
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

  const updateOmprengReturn = async (id: string, update: Partial<OmprengReturnRecord>) => {
    setOmprengReturns(prev => prev.map(r => (r.id === id ? { ...r, ...update } : r)));
    addToast('info', 'Pengembalian Ompreng Diperbarui', 'Pembaruan data & dokumentasi foto pengembalian berhasil disimpan.');
    await logAudit('UPDATE', 'distribution', `Memperbarui log pengembalian ompreng ${id}`);
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

    const matchedVolunteer = masterVolunteers.find(
      m => m.id === target.volunteerId || m.name.trim().toLowerCase() === target.volunteerName.trim().toLowerCase()
    );
    const matchedReplacement = masterVolunteers.find(
      m =>
        (target.replacementVolunteerId && m.id === target.replacementVolunteerId) ||
        m.name.trim().toLowerCase() === target.replacementVolunteerName.trim().toLowerCase()
    );

    const approvedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setVolunteerAbsences(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              volunteerId: matchedVolunteer?.id || a.volunteerId,
              volunteerName: matchedVolunteer?.name || a.volunteerName,
              division: matchedVolunteer?.division || a.division,
              replacementVolunteerId: matchedReplacement?.id || a.replacementVolunteerId,
              replacementVolunteerName: matchedReplacement?.name || a.replacementVolunteerName,
              replacementDivision: matchedReplacement?.division || a.replacementDivision,
              approvalStatus: 'Disetujui',
              approvedBy: approverName,
              approvedAt,
            }
          : a
      )
    );

    // Otomatis sinkronisasi ke presensi relawan
    setVolunteerAttendance(prev => {
      const targetVolId = matchedVolunteer?.id || target.volunteerId;
      const targetVolName = matchedVolunteer?.name || target.volunteerName;
      const targetDivision = (matchedVolunteer?.division || target.division) as VolunteerAttendance['division'];
      const repName = matchedReplacement?.name || target.replacementVolunteerName;
      const repDivision = matchedReplacement?.division || target.replacementDivision;

      const existing = prev.find(
        att =>
          att.date === target.date &&
          (att.volunteerId === targetVolId ||
            att.volunteerName.trim().toLowerCase() === targetVolName.trim().toLowerCase())
      );
      if (existing) {
        return prev.map(att =>
          att.id === existing.id
            ? {
                ...att,
                volunteerId: targetVolId,
                volunteerName: targetVolName,
                division: targetDivision,
                status: target.reason === 'Sakit' ? 'Sakit' : 'Izin',
                healthCheckPassed: target.reason !== 'Sakit',
                hygieneGearComplete: false,
                reason: `${target.reason}${target.reasonDetails ? `: ${target.reasonDetails}` : ''}`,
                replacementVolunteer: repName,
                notes: `Disetujui oleh ${approverName}. Pengganti: ${repName} (Divisi ${repDivision})`,
              }
            : att
        );
      } else {
        const newAtt: VolunteerAttendance = {
          id: `att-abs-${target.id}`,
          date: target.date,
          volunteerId: targetVolId,
          volunteerName: targetVolName,
          division: targetDivision,
          shift:
            targetDivision === 'Cuci Ompreng' || targetDivision === 'Kebersihan'
              ? 'Siang (08:00 - 13:00)'
              : 'Pagi (03:30 - 08:30)',
          status: target.reason === 'Sakit' ? 'Sakit' : 'Izin',
          healthCheckPassed: target.reason !== 'Sakit',
          hygieneGearComplete: false,
          replacementVolunteer: repName,
          reason: `${target.reason}${target.reasonDetails ? `: ${target.reasonDetails}` : ''}`,
          notes: `Disetujui oleh ${approverName}. Pengganti: ${repName} (Divisi ${repDivision})`,
        };
        return [newAtt, ...prev];
      }
    });

    addToast('success', 'Ketidakhadiran Disetujui', `Pergantian relawan ${target.volunteerName} oleh ${target.replacementVolunteerName} disetujui & tersinkron ke Presensi & Insentif.`);
    await logAudit('APPROVE', 'volunteers', `Menyetujui ketidakhadiran & pergantian relawan: ${target.volunteerName} -> ${target.replacementVolunteerName}`);
  };

  const rejectVolunteerAbsence = async (id: string, reason: string) => {
    const target = volunteerAbsences.find(a => a.id === id);
    setVolunteerAbsences(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              approvalStatus: 'Ditolak',
              rejectionReason: reason,
            }
          : a
      )
    );
    if (target) {
      setVolunteerAttendance(prev => prev.filter(att => att.id !== `att-abs-${target.id}`));
    }
    addToast('info', 'Ketidakhadiran Ditolak', `Pengajuan ketidakhadiran ${target?.volunteerName || id} ditolak.`);
    await logAudit('UPDATE', 'volunteers', `Menolak pengajuan ketidakhadiran: ${target?.volunteerName || id} (Alasan: ${reason})`);
  };

  const deleteVolunteerAbsence = async (id: string) => {
    const target = volunteerAbsences.find(a => a.id === id);
    setVolunteerAbsences(prev => prev.filter(a => a.id !== id));
    if (target) {
      setVolunteerAttendance(prev => prev.filter(att => att.id !== `att-abs-${target.id}`));
    }
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
    const nextPOs = purchaseOrdersRef.current.map(po =>
      po.id === poId
        ? {
            ...po,
            supplierConfirmed: false,
            supplierDeliveryStatus: 'Ditolak Supplier' as const,
            supplierRejectionReason: reason,
            status: 'Ditolak' as const,
          }
        : po
    );
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    addToast('warning', 'Pesanan Ditolak Supplier', `Pesanan PO ditolak oleh supplier dengan alasan: ${reason}. Alokasi RAB dikembalikan.`);
    await logAudit('UPDATE', 'procurement', `Supplier menolak pesanan PO ${poId}: ${reason}`);
  };

  const findTargetItemIndex = (items: PurchaseOrderItem[], itemMatch: { itemId?: string; itemName: string }) => {
    let idx = items.findIndex(
      it =>
        (itemMatch.itemId ? it.itemId === itemMatch.itemId : true) &&
        it.itemName === itemMatch.itemName
    );
    if (idx === -1 && itemMatch.itemId) {
      idx = items.findIndex(it => it.itemId === itemMatch.itemId);
    }
    if (idx === -1) {
      idx = items.findIndex(it => it.itemName === itemMatch.itemName);
    }
    return idx;
  };

  const rollupPOFromItems = (
    po: PurchaseOrder,
    nextItems: PurchaseOrderItem[]
  ): PurchaseOrder => {
    const rejectedCount = nextItems.filter(it => it.approvalStatus === 'Ditolak').length;
    const activeItems = nextItems.filter(it => it.approvalStatus !== 'Ditolak');
    const allRejected = nextItems.length > 0 && rejectedCount === nextItems.length;
    const allActiveApproved =
      activeItems.length > 0 && activeItems.every(it => it.approvalStatus === 'Disetujui');
    const allActiveConfirmed =
      activeItems.length > 0 && activeItems.every(it => Boolean(it.supplierConfirmed));
    const nextTotalAmount = activeItems.reduce(
      (sum, it) => sum + Number(it.subtotal ?? (it.quantity || 0) * (it.unitPrice || 0)),
      0
    );

    let nextPOStatus: POStatusPLOK = po.status;
    if (allRejected) {
      nextPOStatus = 'Ditolak';
    } else if (
      po.status === 'Menunggu persetujuan' ||
      po.status === 'Draft' ||
      po.status === 'Ditolak'
    ) {
      nextPOStatus = allActiveApproved ? 'Disetujui' : 'Menunggu persetujuan';
    }

    let nextDeliveryStatus: NonNullable<PurchaseOrder['supplierDeliveryStatus']> =
      po.supplierDeliveryStatus || 'Menunggu Konfirmasi';
    if (allRejected) {
      nextDeliveryStatus = 'Ditolak Supplier';
    } else if (activeItems.length > 0 && activeItems.every(it => it.supplierDeliveryStatus === 'Telah Tiba di Gudang')) {
      nextDeliveryStatus = 'Telah Tiba di Gudang';
    } else if (activeItems.length > 0 && activeItems.every(it => it.supplierDeliveryStatus === 'Dalam Pengiriman')) {
      nextDeliveryStatus = 'Dalam Pengiriman';
      if (nextPOStatus !== 'Diterima di Gudang' && nextPOStatus !== 'Selesai diterima') {
        nextPOStatus = 'Dikirim ke supplier';
      }
    } else if (activeItems.length > 0 && activeItems.every(it => it.supplierDeliveryStatus === 'Sedang Dipersiapkan')) {
      nextDeliveryStatus = 'Sedang Dipersiapkan';
    } else if (allActiveConfirmed) {
      nextDeliveryStatus = 'Dikonfirmasi Supplier';
    } else {
      nextDeliveryStatus = 'Menunggu Konfirmasi';
    }

    return {
      ...po,
      items: nextItems,
      totalAmount: nextTotalAmount,
      status: nextPOStatus,
      supplierConfirmed: allActiveConfirmed,
      supplierDeliveryStatus: nextDeliveryStatus,
      approvedBy:
        nextPOStatus === 'Disetujui'
          ? po.approvedBy || `${currentUser.name} (${currentUser.role})`
          : po.approvedBy,
    };
  };

  const supplierConfirmPOItem = async (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    estimatedDelivery: string,
    driverName?: string,
    driverPhone?: string,
    vehicleNumber?: string
  ) => {
    const confirmedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const approverLabel = `${currentUser.name} (${currentUser.role})`;
    const nextPOs = purchaseOrdersRef.current.map(po => {
      if (po.id !== poId) return po;
      const items = po.items && po.items.length > 0 ? po.items : [];
      if (items.length === 0) {
        return {
          ...po,
          supplierConfirmed: true,
          supplierConfirmedAt: confirmedAt,
          supplierEstimatedDelivery: estimatedDelivery,
          supplierDriverName: driverName,
          supplierDriverPhone: driverPhone,
          supplierVehicleNumber: vehicleNumber,
          supplierDeliveryStatus: 'Dikonfirmasi Supplier' as const,
          status:
            po.status === 'Menunggu persetujuan' || po.status === 'Draft'
              ? ('Disetujui' as const)
              : po.status,
        };
      }
      const targetIdx = findTargetItemIndex(items, itemMatch);
      if (targetIdx === -1) return po;

      const nextItems: PurchaseOrderItem[] = items.map((it, idx) => {
        if (idx === targetIdx) {
          return {
            ...it,
            approvalStatus: 'Disetujui' as const,
            approvedBy: it.approvedBy || approverLabel,
            approvedAt: it.approvedAt || confirmedAt,
            supplierConfirmed: true,
            supplierConfirmedAt: confirmedAt,
            supplierEstimatedDelivery: estimatedDelivery,
            supplierDriverName: driverName,
            supplierDriverPhone: driverPhone,
            supplierVehicleNumber: vehicleNumber,
            supplierDeliveryStatus: 'Dikonfirmasi Supplier' as const,
            supplierRejectionReason: undefined,
          };
        }
        return {
          ...it,
          approvalStatus: resolvePOItemApprovalStatus(it, po),
          supplierConfirmed: resolvePOItemSupplierConfirmed(it, po),
          supplierDeliveryStatus: resolvePOItemSupplierDeliveryStatus(it, po),
        };
      });

      const updatedPO = rollupPOFromItems(po, nextItems);
      return {
        ...updatedPO,
        supplierConfirmedAt: confirmedAt,
        supplierEstimatedDelivery: estimatedDelivery,
        supplierDriverName: driverName,
        supplierDriverPhone: driverPhone,
        supplierVehicleNumber: vehicleNumber,
      };
    });

    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    addToast(
      'success',
      'Item PO Dikonfirmasi',
      `${itemMatch.itemName} berhasil dikonfirmasi & disetujui. Estimasi kirim: ${estimatedDelivery}`
    );
    await logAudit(
      'UPDATE',
      'procurement',
      `Supplier mengonfirmasi item [${itemMatch.itemName}] pada PO ${poId} (Estimasi: ${estimatedDelivery})`
    );
  };

  const supplierUpdatePOItemStatus = async (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    status: NonNullable<PurchaseOrder['supplierDeliveryStatus']>,
    notes?: string
  ) => {
    const nextPOs = purchaseOrdersRef.current.map(po => {
      if (po.id !== poId) return po;
      const items = po.items && po.items.length > 0 ? po.items : [];
      if (items.length === 0) {
        return {
          ...po,
          supplierDeliveryStatus: status,
          status: status === 'Dalam Pengiriman' ? ('Dikirim ke supplier' as const) : po.status,
          notes: notes ? `${po.notes ? po.notes + ' | ' : ''}Update Supplier: ${notes}` : po.notes,
        };
      }
      const targetIdx = findTargetItemIndex(items, itemMatch);
      if (targetIdx === -1) return po;

      const nextItems: PurchaseOrderItem[] = items.map((it, idx) => {
        if (idx === targetIdx) {
          return {
            ...it,
            approvalStatus: resolvePOItemApprovalStatus(it, po),
            supplierConfirmed: true,
            supplierDeliveryStatus: status,
          };
        }
        return {
          ...it,
          approvalStatus: resolvePOItemApprovalStatus(it, po),
          supplierConfirmed: resolvePOItemSupplierConfirmed(it, po),
          supplierDeliveryStatus: resolvePOItemSupplierDeliveryStatus(it, po),
        };
      });

      const updatedPO = rollupPOFromItems(po, nextItems);
      return {
        ...updatedPO,
        notes: notes
          ? `${po.notes ? po.notes + ' | ' : ''}Update ${itemMatch.itemName}: ${notes}`
          : po.notes,
      };
    });

    purchaseOrdersRef.current = nextPOs;
    setPurchaseOrders(nextPOs);
    addToast(
      'success',
      'Status Item Diperbarui',
      `Status pengiriman ${itemMatch.itemName} kini: ${status}`
    );
    await logAudit(
      'UPDATE',
      'procurement',
      `Supplier memperbarui status item [${itemMatch.itemName}] pada PO ${poId} menjadi ${status}`
    );
  };

  const supplierRejectPOItem = async (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    reason: string
  ) => {
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const approverLabel = `${currentUser.name} (${currentUser.role})`;
    const nextPOs = purchaseOrdersRef.current.map(po => {
      if (po.id !== poId) return po;
      const items = po.items && po.items.length > 0 ? po.items : [];
      if (items.length === 0) {
        return {
          ...po,
          supplierConfirmed: false,
          supplierDeliveryStatus: 'Ditolak Supplier' as const,
          supplierRejectionReason: reason,
          status: 'Ditolak' as const,
        };
      }
      const targetIdx = findTargetItemIndex(items, itemMatch);
      if (targetIdx === -1) return po;

      const nextItems: PurchaseOrderItem[] = items.map((it, idx) => {
        if (idx === targetIdx) {
          return {
            ...it,
            approvalStatus: 'Ditolak' as const,
            approvedBy: approverLabel,
            approvedAt: stamp,
            supplierConfirmed: false,
            supplierDeliveryStatus: 'Ditolak Supplier' as const,
            supplierRejectionReason: reason,
          };
        }
        return {
          ...it,
          approvalStatus: resolvePOItemApprovalStatus(it, po),
          supplierConfirmed: resolvePOItemSupplierConfirmed(it, po),
          supplierDeliveryStatus: resolvePOItemSupplierDeliveryStatus(it, po),
        };
      });

      const updatedPO = rollupPOFromItems(po, nextItems);
      return {
        ...updatedPO,
        supplierRejectionReason:
          updatedPO.status === 'Ditolak' ? reason : po.supplierRejectionReason,
      };
    });

    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    addToast(
      'warning',
      'Item PO Ditolak Supplier',
      `Item ${itemMatch.itemName} ditolak (${reason}). Alokasi RAB item terkait dilepaskan.`
    );
    await logAudit(
      'UPDATE',
      'procurement',
      `Supplier menolak item [${itemMatch.itemName}] pada PO ${poId}: ${reason}`
    );
  };

  const supplierResetPOItem = async (
    poId: string,
    itemMatch: { itemId?: string; itemName: string }
  ) => {
    const nextPOs = purchaseOrdersRef.current.map(po => {
      if (po.id !== poId) return po;
      const items = po.items && po.items.length > 0 ? po.items : [];
      if (items.length === 0) {
        return {
          ...po,
          supplierConfirmed: false,
          supplierDeliveryStatus: 'Menunggu Konfirmasi' as const,
          supplierRejectionReason: undefined,
          status: 'Menunggu persetujuan' as const,
        };
      }
      const targetIdx = findTargetItemIndex(items, itemMatch);
      if (targetIdx === -1) return po;

      const nextItems: PurchaseOrderItem[] = items.map((it, idx) => {
        if (idx === targetIdx) {
          return {
            ...it,
            approvalStatus: 'Menunggu persetujuan' as const,
            approvedBy: undefined,
            approvedAt: undefined,
            supplierConfirmed: false,
            supplierConfirmedAt: undefined,
            supplierEstimatedDelivery: undefined,
            supplierDriverName: undefined,
            supplierDriverPhone: undefined,
            supplierVehicleNumber: undefined,
            supplierDeliveryStatus: 'Menunggu Konfirmasi' as const,
            supplierRejectionReason: undefined,
          };
        }
        return {
          ...it,
          approvalStatus: resolvePOItemApprovalStatus(it, po),
          supplierConfirmed: resolvePOItemSupplierConfirmed(it, po),
          supplierDeliveryStatus: resolvePOItemSupplierDeliveryStatus(it, po),
        };
      });

      return rollupPOFromItems(po, nextItems);
    });

    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    addToast(
      'info',
      'Konfirmasi Item Direset',
      `Item ${itemMatch.itemName} dikembalikan ke status Menunggu Konfirmasi.`
    );
    await logAudit(
      'UPDATE',
      'procurement',
      `Supplier mereset konfirmasi item [${itemMatch.itemName}] pada PO ${poId}`
    );
  };

  const supplierReducePOItemQuantity = async (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    newOrderedQty: number,
    notes?: string
  ) => {
    const safeNewQty = Math.max(0, Number(newOrderedQty) || 0);
    const targetPO = purchaseOrdersRef.current.find(p => p.id === poId);
    if (!targetPO) return;

    const items = targetPO.items || [];
    const targetIdx = findTargetItemIndex(items, itemMatch);
    if (targetIdx === -1) return;

    const draftPOs = purchaseOrdersRef.current.map(po => {
      if (po.id !== poId) return po;
      const nextItems: PurchaseOrderItem[] = (po.items || []).map((it, idx) => {
        if (idx !== targetIdx) return it;
        const unitPrice = Number(it.unitPrice || 0);
        return {
          ...it,
          quantity: safeNewQty,
          subtotal: safeNewQty * unitPrice,
        };
      });
      const activeTotal = nextItems
        .filter(it => it.approvalStatus !== 'Ditolak')
        .reduce((s, it) => s + Number(it.subtotal ?? (it.quantity || 0) * (it.unitPrice || 0)), 0);
      return {
        ...po,
        items: nextItems,
        totalAmount: activeTotal,
        notes: notes
          ? `${po.notes ? po.notes + ' | ' : ''}Penyesuaian PO ${itemMatch.itemName}: ${notes}`
          : po.notes,
      };
    });

    const isItemQC = (q: QualityControlRecord) =>
      (q.poId === targetPO.id || (q.poNumber && q.poNumber === targetPO.poNumber)) &&
      isMatchingMaterialNameShared(q.itemName, itemMatch.itemName);

    const totalQcReceived = qualityControlRecordsRef.current
      .filter(isItemQC)
      .reduce((s, q) => s + (q.status === 'Ditolak' ? 0 : Number(q.receivedQuantity || 0)), 0);

    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const nowStamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    const nextQCs = qualityControlRecordsRef.current.map(q => {
      if (!isItemQC(q)) return q;
      const diff = Number(q.receivedQuantity || 0) - safeNewQty;
      const shouldUpgradeToReceived =
        safeNewQty > 0 &&
        totalQcReceived >= safeNewQty &&
        (q.status === 'Diterima sebagian' || q.status === 'Lolos Sebagian');
      return {
        ...q,
        orderedQuantity: safeNewQty,
        differenceQuantity: totalQcReceived >= safeNewQty ? 0 : diff,
        status: shouldUpgradeToReceived ? ('Diterima' as const) : q.status,
        ...(shouldUpgradeToReceived
          ? { acceptedStatusAt: q.acceptedStatusAt || nowStamp }
          : {}),
        notes: notes ? `${q.notes ? q.notes + ' | ' : ''}${notes}` : q.notes,
      };
    });

    const nextPOs = reconcilePurchaseOrdersWithQC(draftPOs, nextQCs).map(po => {
      if (po.id !== poId) return po;
      const nextTotal = (po.items || [])
        .filter(it => it.approvalStatus !== 'Ditolak')
        .reduce((s, it) => s + Number(it.subtotal ?? (it.quantity || 0) * (it.unitPrice || 0)), 0);
      return { ...po, totalAmount: nextTotal };
    });
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: nextQCs,
      purchaseOrders: nextPOs,
      rabItems: nextRABs,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: stockMutationsRef.current,
    });

    qualityControlRecordsRef.current = nextQCs;
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;

    setQualityControlRecords(nextQCs);
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    setInventory(invSync.inventory);
    setStockMutations(invSync.stockMutations);

    addToast(
      'success',
      'Jumlah PO Dikurangi',
      `Jumlah pesanan PO untuk ${itemMatch.itemName} disesuaikan menjadi ${safeNewQty} & RAB disinkronkan.`
    );
    await logAudit(
      'UPDATE',
      'procurement',
      `Mengurangi jumlah PO item [${itemMatch.itemName}] pada PO ${targetPO.poNumber} menjadi ${safeNewQty}`
    );
  };

  const supplierCoverPOItemShortage = async (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    addedQty: number,
    options?: {
      deliveredAt?: string;
      condition?: QualityControlRecord['condition'];
      qualityGrade?: QualityControlRecord['qualityGrade'];
      notes?: string;
    }
  ) => {
    const safeAddedQty = Math.max(0, Number(addedQty) || 0);
    if (safeAddedQty <= 0) return;

    const targetPO = purchaseOrdersRef.current.find(p => p.id === poId);
    if (!targetPO) return;

    const items = targetPO.items || [];
    const targetIdx = findTargetItemIndex(items, itemMatch);
    if (targetIdx === -1) return;

    const targetItem = items[targetIdx];
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const fallbackStamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const stamp = options?.deliveredAt?.trim() || fallbackStamp;
    const orderedQty = Number(targetItem.quantity || 0);

    const isItemQC = (q: QualityControlRecord) =>
      (q.poId === targetPO.id || (q.poNumber && q.poNumber === targetPO.poNumber)) &&
      isMatchingMaterialNameShared(q.itemName, itemMatch.itemName);

    const existingItemQCs = qualityControlRecordsRef.current.filter(isItemQC);
    const prevQcPassed = existingItemQCs.reduce(
      (s, q) => s + (q.status === 'Ditolak' ? 0 : Number(q.receivedQuantity || 0)),
      0
    );
    const prevDelivered =
      typeof targetItem.deliveredQuantity === 'number'
        ? targetItem.deliveredQuantity
        : existingItemQCs.reduce((s, q) => s + Number(q.receivedQuantity || 0), 0) ||
          Number(targetItem.receivedQuantity || 0);

    const nextTotalQcPassed = prevQcPassed + safeAddedQty;
    const isNowFulfilled = orderedQty > 0 && nextTotalQcPassed >= orderedQty;
    const defaultExp = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const newSupplementalQC: QualityControlRecord = {
      id: `qc-cover-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      poId: targetPO.id,
      poNumber: targetPO.poNumber,
      supplierName: targetPO.supplierName,
      itemName: targetItem.itemName,
      orderedQuantity: orderedQty,
      unit: targetItem.unit || 'kg',
      receivedQuantity: safeAddedQty,
      differenceQuantity: isNowFulfilled ? 0 : nextTotalQcPassed - orderedQty,
      condition: options?.condition || 'Baik',
      qualityGrade: options?.qualityGrade || 'Grade A (Sangat Baik)',
      expiryDate: defaultExp,
      notes:
        options?.notes?.trim() ||
        `Pengiriman susulan penutup kekurangan sebesar ${safeAddedQty} ${targetItem.unit}.`,
      inspectorName: `${currentUser.name} (${currentUser.role})`,
      status: isNowFulfilled ? 'Diterima' : 'Diterima sebagian',
      inspectedAt: stamp,
      acceptedStatusAt: stamp,
      inventoryAdded: true,
    };

    const updatedExistingQCs = qualityControlRecordsRef.current.map(q => {
      if (!isItemQC(q)) return q;
      if (
        isNowFulfilled &&
        (q.status === 'Diterima sebagian' || q.status === 'Lolos Sebagian')
      ) {
        return {
          ...q,
          status: 'Diterima' as const,
          acceptedStatusAt: stamp,
          differenceQuantity: 0,
        };
      }
      return q;
    });

    const nextQCs = [newSupplementalQC, ...updatedExistingQCs];

    const draftPOs = purchaseOrdersRef.current.map(po => {
      if (po.id !== poId) return po;
      const nextItems: PurchaseOrderItem[] = (po.items || []).map((it, idx) => {
        if (idx !== targetIdx) return it;
        return {
          ...it,
          deliveredQuantity: prevDelivered + safeAddedQty,
          deliveredAt: stamp,
          supplierConfirmed: true,
          supplierDeliveryStatus: 'Telah Tiba di Gudang' as const,
        };
      });
      return {
        ...po,
        items: nextItems,
      };
    });

    const nextPOs = reconcilePurchaseOrdersWithQC(draftPOs, nextQCs);
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: nextQCs,
      purchaseOrders: nextPOs,
      rabItems: nextRABs,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: stockMutationsRef.current,
    });

    qualityControlRecordsRef.current = nextQCs;
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;

    setQualityControlRecords(nextQCs);
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    setInventory(invSync.inventory);
    setStockMutations(invSync.stockMutations);

    addToast(
      'success',
      'Kekurangan Ditutupi',
      `Tambahan ${safeAddedQty} ${targetItem.unit} untuk ${targetItem.itemName} berhasil dicatat & disinkronkan ke QC dan Gudang.`
    );
    await logAudit(
      'UPDATE',
      'procurement',
      `Menutupi kekurangan item [${targetItem.itemName}] pada PO ${targetPO.poNumber} (+${safeAddedQty} ${targetItem.unit})`
    );
  };

  const supplierEditDeliveredPOItem = async (
    poId: string,
    itemMatch: { itemId?: string; itemName: string },
    payload: {
      deliveredAt: string;
      orderedQuantity: number;
      deliveredQuantity: number;
      qcPassedQuantity?: number;
      damagedQuantity?: number;
      status: QCStatusPLOK;
      notes?: string;
    }
  ) => {
    const targetPO = purchaseOrdersRef.current.find(p => p.id === poId);
    if (!targetPO) return;

    const items = targetPO.items || [];
    const targetIdx = findTargetItemIndex(items, itemMatch);
    if (targetIdx === -1) return;

    const targetItem = items[targetIdx];
    const safeOrderedQty = Math.max(0, Number(payload.orderedQuantity) || 0);
    const safeDeliveredQty = Math.max(0, Number(payload.deliveredQuantity) || 0);
    const hasDamagedPayload =
      typeof payload.damagedQuantity === 'number' && Number.isFinite(payload.damagedQuantity);
    const safeDamagedQty = hasDamagedPayload
      ? Math.max(0, Number(payload.damagedQuantity) || 0)
      : 0;
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const fallbackStamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const stamp = payload.deliveredAt.trim() || fallbackStamp;

    const isItemQC = (q: QualityControlRecord) =>
      (q.poId === targetPO.id || (q.poNumber && q.poNumber === targetPO.poNumber)) &&
      isMatchingMaterialNameShared(q.itemName, itemMatch.itemName);

    const existingItemQCs = qualityControlRecordsRef.current.filter(isItemQC);
    const effectiveQcReceivedQty = safeDeliveredQty;
    const effectivePassedQty =
      payload.status === 'Ditolak' ? 0 : effectiveQcReceivedQty;
    const isAccepted = isQCAcceptedStatus(payload.status);
    const defaultExp = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    let nextQCs: QualityControlRecord[];
    if (existingItemQCs.length > 0) {
      const primaryId = existingItemQCs[0].id;
      nextQCs = qualityControlRecordsRef.current
        .filter(q => !isItemQC(q) || q.id === primaryId)
        .map(q => {
          if (q.id !== primaryId) return q;
          const updated: QualityControlRecord = {
            ...q,
            orderedQuantity: safeOrderedQty,
            receivedQuantity: effectiveQcReceivedQty,
            differenceQuantity: effectivePassedQty - safeDamagedQty - safeOrderedQty,
            inspectedAt: stamp,
            status: payload.status,
            notes: payload.notes !== undefined ? payload.notes : q.notes,
            inventoryAdded: payload.status !== 'Ditolak' && effectivePassedQty > 0,
          };
          if (isAccepted) {
            updated.acceptedStatusAt = stamp;
          } else {
            delete updated.acceptedStatusAt;
          }
          return updated;
        });
    } else {
      const newQC: QualityControlRecord = {
        id: `qc-edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        poId: targetPO.id,
        poNumber: targetPO.poNumber,
        supplierName: targetPO.supplierName,
        itemName: targetItem.itemName,
        orderedQuantity: safeOrderedQty,
        unit: targetItem.unit || 'kg',
        receivedQuantity: effectiveQcReceivedQty,
        differenceQuantity: effectivePassedQty - safeDamagedQty - safeOrderedQty,
        condition: payload.status === 'Ditolak' ? 'Busuk/Tercemar' : 'Baik',
        qualityGrade:
          payload.status === 'Diterima sebagian' || payload.status === 'Lolos Sebagian'
            ? 'Grade B (Standar)'
            : payload.status === 'Ditolak'
            ? 'Afkir (Tidak Layak)'
            : 'Grade A (Sangat Baik)',
        expiryDate: defaultExp,
        notes: payload.notes || '',
        inspectorName: `${currentUser.name} (${currentUser.role})`,
        status: payload.status,
        inspectedAt: stamp,
        ...(isAccepted ? { acceptedStatusAt: stamp } : {}),
        inventoryAdded: payload.status !== 'Ditolak' && effectivePassedQty > 0,
      };
      nextQCs = [newQC, ...qualityControlRecordsRef.current];
    }

    // Sinkronkan jumlah rusak per bahan ke Data Inspeksi Bahan Rusak Divisi Persiapan jika dikirimkan
    if (hasDamagedPayload) {
      const distDate = resolvePOItemDistributionDate(
        targetItem,
        targetPO,
        rabItemsRef.current,
        menuItems
      );
      const qcDateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(stamp);
      const qcDate = qcDateMatch ? qcDateMatch[1] : '';
      const candidateDates: string[] = [];
      [distDate, qcDate, (targetPO.deliveryDate || '').trim()].forEach(d => {
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !candidateDates.includes(d)) {
          candidateDates.push(d);
        }
      });
      const itemUnit = targetItem.unit || 'kg';
      let updatedExistingPrep = false;

      const nextPrepRecords = prepRecordsRef.current.map(rec => {
        if (!candidateDates.includes(rec.date)) return rec;
        let recModified = false;
        const applySlot = (slot: typeof rec.damagedVegetable) => {
          if (isMatchingPrepDamagedMaterial(slot.name, targetItem.itemName)) {
            recModified = true;
            updatedExistingPrep = true;
            const convertedBack = convertDamagedQuantityToPOUnit(
              safeDamagedQty,
              itemUnit,
              slot.unit || itemUnit,
              masterUnits
            );
            return { ...slot, quantity: convertedBack };
          }
          return slot;
        };

        const nextVeg = applySlot(rec.damagedVegetable);
        const nextAnimal = applySlot(rec.damagedAnimal);
        const nextFruit = applySlot(rec.damagedFruit);
        const nextExtra = (rec.additionalDamagedItems || []).map(extra => {
          if (isMatchingPrepDamagedMaterial(extra.name, targetItem.itemName)) {
            recModified = true;
            updatedExistingPrep = true;
            const convertedBack = convertDamagedQuantityToPOUnit(
              safeDamagedQty,
              itemUnit,
              extra.unit || itemUnit,
              masterUnits
            );
            return { ...extra, quantity: convertedBack };
          }
          return extra;
        });

        if (!recModified) return rec;
        return {
          ...rec,
          damagedVegetable: nextVeg,
          damagedAnimal: nextAnimal,
          damagedFruit: nextFruit,
          ...(nextExtra.length > 0 ? { additionalDamagedItems: nextExtra } : {}),
        };
      });

      if (updatedExistingPrep) {
        prepRecordsRef.current = nextPrepRecords;
        setPrepRecords(nextPrepRecords);
      } else if (safeDamagedQty > 0) {
        const targetDate = candidateDates[0] || new Date().toISOString().slice(0, 10);
        const targetIdxPrep = nextPrepRecords.findIndex(r => r.date === targetDate);
        if (targetIdxPrep >= 0) {
          const targetRec = nextPrepRecords[targetIdxPrep];
          const updatedRec: PreparationInspectionRecord = {
            ...targetRec,
            additionalDamagedItems: [
              ...(targetRec.additionalDamagedItems || []),
              {
                name: targetItem.itemName,
                quantity: safeDamagedQty,
                unit: itemUnit,
                temp: 18,
              },
            ],
          };
          const patched = nextPrepRecords.map((r, i) => (i === targetIdxPrep ? updatedRec : r));
          prepRecordsRef.current = patched;
          setPrepRecords(patched);
        } else {
          const newPrepRec: PreparationInspectionRecord = {
            id: `prep-${Date.now()}`,
            date: targetDate,
            time: '04:30 WIB',
            officerName: getDefaultDivisionOfficerName(
              masterVolunteers,
              'Persiapan',
              currentUser.name
            ),
            damagedVegetable: {
              name: '-',
              quantity: 0,
              unit: 'kg',
              temp: 18,
            },
            damagedAnimal: {
              name: '-',
              quantity: 0,
              unit: 'kg',
              temp: 4,
            },
            damagedFruit: {
              name: '-',
              quantity: 0,
              unit: 'kg',
              temp: 18,
            },
            additionalDamagedItems: [
              {
                name: targetItem.itemName,
                quantity: safeDamagedQty,
                unit: itemUnit,
                temp: 18,
              },
            ],
            facilityTemps: { ...defaultFacilityTemperatures },
            notes: `Pembaruan bahan rusak dari Portal Mitra (${targetPO.poNumber}).`,
          };
          const added = [newPrepRec, ...nextPrepRecords];
          prepRecordsRef.current = added;
          setPrepRecords(added);
        }
      }
    }

    const draftPOs = purchaseOrdersRef.current.map(po => {
      if (po.id !== poId) return po;
      const nextItems: PurchaseOrderItem[] = (po.items || []).map((it, idx) => {
        if (idx !== targetIdx) return it;
        const unitPrice = Number(it.unitPrice || 0);
        return {
          ...it,
          quantity: safeOrderedQty,
          subtotal: safeOrderedQty * unitPrice,
          deliveredQuantity: effectiveQcReceivedQty,
          receivedQuantity: effectivePassedQty,
          deliveredAt: stamp,
          supplierConfirmed: true,
          supplierDeliveryStatus: 'Telah Tiba di Gudang' as const,
        };
      });
      const activeTotal = nextItems
        .filter(it => it.approvalStatus !== 'Ditolak')
        .reduce((s, it) => s + Number(it.subtotal ?? (it.quantity || 0) * (it.unitPrice || 0)), 0);
      return {
        ...po,
        items: nextItems,
        totalAmount: activeTotal,
      };
    });

    const nextPOs = reconcilePurchaseOrdersWithQC(draftPOs, nextQCs).map(po => {
      if (po.id !== poId) return po;
      const nextTotal = (po.items || [])
        .filter(it => it.approvalStatus !== 'Ditolak')
        .reduce((s, it) => s + Number(it.subtotal ?? (it.quantity || 0) * (it.unitPrice || 0)), 0);
      return { ...po, totalAmount: nextTotal };
    });
    const nextRABs = reconcileRABWithPurchaseOrders(nextPOs, rabItemsRef.current);
    const invSync = reconcileInventoryFromQualityControl({
      qualityControlRecords: nextQCs,
      purchaseOrders: nextPOs,
      rabItems: nextRABs,
      masterBahan,
      existingInventory: inventoryRef.current,
      existingMutations: stockMutationsRef.current,
    });

    qualityControlRecordsRef.current = nextQCs;
    purchaseOrdersRef.current = nextPOs;
    rabItemsRef.current = nextRABs;
    inventoryRef.current = invSync.inventory;
    stockMutationsRef.current = invSync.stockMutations;

    setQualityControlRecords(nextQCs);
    setPurchaseOrders(nextPOs);
    setRabItems(nextRABs);
    setInventory(invSync.inventory);
    setStockMutations(invSync.stockMutations);

    addToast(
      'success',
      'Data Terkirim Diperbarui',
      `Data pengiriman, QC & inspeksi bahan rusak item ${targetItem.itemName} berhasil diperbarui.`
    );
    await logAudit(
      'UPDATE',
      'procurement',
      `Memperbarui data terkirim item [${targetItem.itemName}] pada PO ${targetPO.poNumber} (Pesan: ${safeOrderedQty}, Terima: ${safeDeliveredQty}, Rusak/Hasil QC: ${safeDamagedQty})`
    );
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
        canSwitchRole: isAuthenticated && (isOriginAdminSession || currentUser.role === 'Admin Utama'),
        loginWithProfile,
        logout,
        switchRole,
        hasPermission,
        rolePermissions,
        updateRolePermissions,
        roleModuleAccess,
        updateRoleModuleAccess,
        resetRoleModuleAccess,
        dashboardLayoutConfig,
        updateDashboardLayoutConfig,
        resetDashboardLayoutConfig,
        webAccessUsers,
        webAccessPolicy,
        addWebAccessUser,
        registerSelfWebAccessUser,
        updateWebAccessUser,
        toggleWebAccessStatus,
        deleteWebAccessUser,
        updateWebAccessPolicy,
        recordWebLoginTimestamp,
        findWebAccessUser,
        firebaseAuthEmail,
        syncAllWebAccessToCloud,
        connectFirebaseAdminSync,
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
        beneficiaryRecords,
        isDataHydrating,
        checkDuplicateNik,
        addBeneficiaryRecord,
        updateBeneficiaryRecord,
        deleteBeneficiaryRecord,
        maternalHealthRecords,
        checkDuplicateMaternalNik,
        addMaternalHealthRecord,
        updateMaternalHealthRecord,
        deleteMaternalHealthRecord,
        lactatingHealthRecords,
        checkDuplicateLactatingNik,
        addLactatingHealthRecord,
        updateLactatingHealthRecord,
        deleteLactatingHealthRecord,
        menuItems,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        approveMenuItem,
        menuIngredientsMap,
        updateMenuIngredients,
        recipeCustomColumns,
        addRecipeCustomColumn,
        updateRecipeCustomColumn,
        deleteRecipeCustomColumn,
        divisionJobdesks,
        updateDivisionJobdesks,
        inventory,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustStock,
        stockMutations,
        addStockMutation,
        updateStockMutation,
        stockOpnames,
        recordStockOpname,
        purchaseOrders,
        addPurchaseOrder,
        updatePurchaseOrder,
        verifyPurchaseOrderFinance,
        approvePurchaseOrderHead,
        updatePOQualityControl,
        receivePOToWarehouse,
        syncDailyPOsFromRAB,
        rabItems,
        addRABItem,
        updateRABItem,
        deleteRABItem,
        approveRABItem,
        syncCriticalInventoryToRAB,
        syncAllMenuNeedsToRAB,
        syncInventoryFromQualityControl,
        syncMenuNeedsToRAB,
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
        picIncentiveConfig,
        updatePICIncentiveConfig,
        picIncentivePayouts,
        upsertPICIncentivePayout,
        batchApprovePICIncentives,
        volunteerIncentiveConfig,
        updateVolunteerIncentiveConfig,
        volunteerIncentivePayouts,
        upsertVolunteerIncentivePayout,
        batchApproveVolunteerIncentives,
        pettyCashOpeningBalance,
        setPettyCashOpeningBalance,
        pettyCashTransactions,
        addPettyCashTransaction,
        updatePettyCashTransaction,
        deletePettyCashTransaction,
        volunteerAttendance,
        recordAttendance,
        updateAttendance,
        syncVolunteerAttendanceFromMaster,
        volunteerAbsences,
        addVolunteerAbsence,
        updateVolunteerAbsence,
        approveVolunteerAbsence,
        rejectVolunteerAbsence,
        deleteVolunteerAbsence,
        supplierConfirmPO,
        supplierUpdatePOStatus,
        supplierRejectPO,
        supplierConfirmPOItem,
        supplierUpdatePOItemStatus,
        supplierRejectPOItem,
        supplierResetPOItem,
        supplierReducePOItemQuantity,
        supplierCoverPOItemShortage,
        supplierEditDeliveredPOItem,
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
        updateOmprengReturn,
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
