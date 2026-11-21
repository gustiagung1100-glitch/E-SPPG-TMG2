import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import {
  getDefaultDivisionOfficerName,
  getDivisionOfficerSelectOptions,
} from '../../lib/volunteerUtils';
import { PrintHeader } from '../common/PrintHeader';
import { Modal } from '../common/Modal';
import { ClassicTimeInput } from '../common/ClassicTimeInput';
import { DataTable, Column } from '../common/DataTable';
import {
  BASTDocumentSheet,
  resolveBastAutoFields,
  generateBastNumber,
  exportBastDocumentPDF,
} from '../common/BASTDocumentSheet';
import {
  processFacilityImageUpload,
  FacilityTempReportPanel,
  FacilityTempModalGrid,
  applyFacilityPhotoPatch,
} from '../common/FacilityTempUploadSection';
import { LandscapeTrayCameraModal } from '../common/LandscapeTrayCameraModal';
import { formatNumber, formatRupiah, formatIndonesianDate, triggerPrint } from '../../lib/exportUtils';
import { monthlyWasteSummary, defaultFacilityTemperatures } from '../../lib/productionData';
import { resolveMenuGrammages } from '../../lib/plogData';
import {
  CookingInspectionRecord,
  CookingItemDetail,
  DistributionDeliveryRecord,
  FacilityTemperatures,
  MenuItem,
  OmprengReturnRecord,
  PortioningInspectionRecord,
  PreparationInspectionRecord,
} from '../../types';
import {
  DynamicFormEditToggleBar,
  DynamicFormBuilderPanel,
  DynamicFormRenderer,
  validateDynamicFormFields,
} from '../common/DynamicFormBuilder';
import {
  formatDynamicFieldValue,
  getCustomTableFields,
  getInitialCustomFieldValues,
} from '../../lib/dynamicFormSchemas';
import {
  Flame,
  ChefHat,
  Scissors,
  CookingPot,
  Scale,
  Sparkles,
  Truck,
  CheckCircle2,
  Clock,
  Thermometer,
  ShieldAlert,
  Printer,
  Plus,
  Camera,
  Upload,
  AlertTriangle,
  RotateCcw,
  Fuel,
  Trash2,
  Calendar,
  Building2,
  FileCheck,
  TrendingDown,
  Layers,
  Check,
  Eye,
  Download,
  MapPin,
  X,
  ClipboardCheck,
  RefreshCw,
  Edit3,
  Utensils,
} from 'lucide-react';

type ProductionTab = 'prep' | 'cooking' | 'portioning' | 'distribution' | 'washing';

export const ProductionModule: React.FC = () => {
  const {
    sppgConfig,
    institutions,
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
    beneficiaryAttendance,
    masterVolunteers,
    masterUnits,
    menuItems,
    menuIngredientsMap,
    distributionLogs,
    kitchenProgress,
    updateKitchenProgress,
    currentUser,
    addToast,
    dynamicFormSchemas,
  } = useApp();

  const prepVolunteerOptions = useMemo(
    () => getDivisionOfficerSelectOptions(masterVolunteers, 'Persiapan'),
    [masterVolunteers]
  );
  const cookingVolunteerOptions = useMemo(
    () => getDivisionOfficerSelectOptions(masterVolunteers, 'Pengolahan'),
    [masterVolunteers]
  );
  const portioningVolunteerOptions = useMemo(
    () => getDivisionOfficerSelectOptions(masterVolunteers, 'Pemorsian'),
    [masterVolunteers]
  );
  const distVolunteerOptions = useMemo(
    () => getDivisionOfficerSelectOptions(masterVolunteers, 'Distribusi'),
    [masterVolunteers]
  );
  const washingVolunteerOptions = useMemo(
    () => getDivisionOfficerSelectOptions(masterVolunteers, 'Cuci Ompreng'),
    [masterVolunteers]
  );

  const [activeTab, setActiveTab] = useState<ProductionTab>('prep');
  const [isEditingWasteSchema, setIsEditingWasteSchema] = useState(false);
  const [isModalWasteSchemaEdit, setIsModalWasteSchemaEdit] = useState(false);

  // Modals state
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [editingPrepId, setEditingPrepId] = useState<string | null>(null);
  const [isCookingModalOpen, setIsCookingModalOpen] = useState(false);
  const [editingCookingId, setEditingCookingId] = useState<string | null>(null);
  const [selectedCookingId, setSelectedCookingId] = useState<string | null>(null);
  const [isSavingCooking, setIsSavingCooking] = useState(false);
  const [isPortioningModalOpen, setIsPortioningModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [selectedDeliveryForBast, setSelectedDeliveryForBast] = useState<DistributionDeliveryRecord | null>(null);

  const handleUploadError = (msg: string) => {
    addToast('error', 'Upload Foto Gagal', msg);
  };

  // Helper file uploader to base64 (with validation & compression) for instant preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    processFacilityImageUpload(e, callback, handleUploadError);
  };

  // -------------------------------------------------------------
  // TAB A: Form State Divisi Persiapan
  // -------------------------------------------------------------
  const [prepForm, setPrepForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '04:15 WIB',
    officerName: currentUser.name || 'Siti Aminah, S.Gz.',
    // Bahan Rusak Sayur
    vegName: 'Sawi Putih & Daun Seledri',
    vegQty: 1.5,
    vegUnit: 'kg',
    vegTemp: 18.2,
    vegPhoto: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80',
    // Bahan Rusak Hewani
    animalName: 'Lemak Berlebih Fillet Ayam Broiler',
    animalQty: 2.5,
    animalUnit: 'kg',
    animalTemp: 3.8,
    animalPhoto: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=500&q=80',
    // Bahan Rusak Buah
    fruitName: 'Pisang Cavendish Lembek/Memar',
    fruitQty: 1.2,
    fruitUnit: 'kg',
    fruitTemp: 19.5,
    fruitPhoto: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
    facilityTemps: { ...defaultFacilityTemperatures } as FacilityTemperatures,
    notes: 'Pembersihan dan sortir bahan segar batch subuh.',
  });

  const openNewPrepModal = () => {
    setEditingPrepId(null);
    setPrepForm(f => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
      officerName: getDefaultDivisionOfficerName(masterVolunteers, 'Persiapan', f.officerName),
      facilityTemps: { ...defaultFacilityTemperatures },
    }));
    setIsPrepModalOpen(true);
  };

  const openEditPrepModal = (rec: PreparationInspectionRecord) => {
    setEditingPrepId(rec.id);
    setPrepForm({
      date: rec.date,
      time: rec.time,
      officerName: rec.officerName,
      vegName: rec.damagedVegetable.name,
      vegQty: rec.damagedVegetable.quantity,
      vegUnit: rec.damagedVegetable.unit,
      vegTemp: rec.damagedVegetable.temp,
      vegPhoto: rec.damagedVegetable.photoUrl || '',
      animalName: rec.damagedAnimal.name,
      animalQty: rec.damagedAnimal.quantity,
      animalUnit: rec.damagedAnimal.unit,
      animalTemp: rec.damagedAnimal.temp,
      animalPhoto: rec.damagedAnimal.photoUrl || '',
      fruitName: rec.damagedFruit.name,
      fruitQty: rec.damagedFruit.quantity,
      fruitUnit: rec.damagedFruit.unit,
      fruitTemp: rec.damagedFruit.temp,
      fruitPhoto: rec.damagedFruit.photoUrl || '',
      facilityTemps: {
        ...defaultFacilityTemperatures,
        ...(rec.facilityTemps || {}),
      },
      notes: rec.notes || '',
    });
    setIsPrepModalOpen(true);
  };

  const handleSavePrep = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      date: prepForm.date,
      time: prepForm.time,
      officerName: prepForm.officerName,
      damagedVegetable: {
        name: prepForm.vegName,
        quantity: Number(prepForm.vegQty),
        unit: prepForm.vegUnit,
        temp: Number(prepForm.vegTemp),
        photoUrl: prepForm.vegPhoto,
      },
      damagedAnimal: {
        name: prepForm.animalName,
        quantity: Number(prepForm.animalQty),
        unit: prepForm.animalUnit,
        temp: Number(prepForm.animalTemp),
        photoUrl: prepForm.animalPhoto,
      },
      damagedFruit: {
        name: prepForm.fruitName,
        quantity: Number(prepForm.fruitQty),
        unit: prepForm.fruitUnit,
        temp: Number(prepForm.fruitTemp),
        photoUrl: prepForm.fruitPhoto,
      },
      facilityTemps: prepForm.facilityTemps,
      notes: prepForm.notes,
    };

    if (editingPrepId) {
      await updatePrepRecord(editingPrepId, payload);
    } else {
      await addPrepRecord(payload);
    }
    setEditingPrepId(null);
    setIsPrepModalOpen(false);
  };

  // -------------------------------------------------------------
  // TAB B: Form State Divisi Pengolahan (Terhubung Live ke Menu & Gramasi Item Menu PLOG)
  // -------------------------------------------------------------
  const getCookedSlotDefaults = (categoryKey: CookingItemDetail['categoryKey']) => {
    switch (categoryKey) {
      case 'stapleFood':
        return {
          temp: 93.5,
          equipment: 'Rice Steamer Gas 40 Tray',
          photoUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=500&q=80',
        };
      case 'animalProtein':
        return {
          temp: 84.6,
          equipment: 'Wajan Penggorengan A1',
          photoUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=80',
        };
      case 'plantProtein':
        return {
          temp: 82.5,
          equipment: 'Wajan Penggorengan A2',
          photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
        };
      case 'vegetable':
        return {
          temp: 87.1,
          equipment: 'Kettle Sup Uap 200L',
          photoUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=80',
        };
      case 'fruit':
        return {
          temp: 18.0,
          equipment: 'Meja Steril Buah & Pelengkap',
          photoUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
        };
      default:
        return {
          temp: 18.0,
          equipment: 'Meja Steril Pelengkap & Pendamping',
          photoUrl: '',
        };
    }
  };

  const mapCategoryToCookedSlot = (
    categoryKey: CookingItemDetail['categoryKey'],
    cookedFoods?: CookingInspectionRecord['cookedFoods']
  ) => {
    if (!cookedFoods) return undefined;
    if (categoryKey === 'stapleFood') return cookedFoods.rice;
    if (categoryKey === 'animalProtein') return cookedFoods.animalProtein;
    if (categoryKey === 'plantProtein') return cookedFoods.plantProtein;
    if (categoryKey === 'vegetable') return cookedFoods.vegetable;
    if (categoryKey === 'fruit') return cookedFoods.fruit;
    return undefined;
  };

  const buildCookingItemEntries = (
    menu: MenuItem | undefined,
    existingItems?: CookingItemDetail[],
    existingCookedFoods?: CookingInspectionRecord['cookedFoods']
  ): CookingItemDetail[] => {
    if (menu) {
      const plogGrammages = resolveMenuGrammages(menu, menuIngredientsMap[menu.id] || []);
      return plogGrammages.map(gram => {
        const prev =
          existingItems?.find(it => it.id === gram.id) ||
          existingItems?.find(
            it => it.categoryKey === gram.categoryKey && gram.categoryKey !== 'custom'
          );
        const slot = mapCategoryToCookedSlot(gram.categoryKey, existingCookedFoods);
        const defaults = getCookedSlotDefaults(gram.categoryKey);

        return {
          id: gram.id,
          categoryKey: gram.categoryKey,
          categoryLabel: gram.categoryLabel,
          itemName: gram.itemName,
          smallGrams: gram.smallGrams,
          largeGrams: gram.largeGrams,
          grammagePhotoUrl: prev?.grammagePhotoUrl || '',
          grammageSmallPhotoUrl: prev?.grammageSmallPhotoUrl || '',
          grammageLargePhotoUrl: prev?.grammageLargePhotoUrl || '',
          temp: prev?.temp ?? slot?.temp ?? defaults.temp,
          photoUrl: prev?.photoUrl ?? slot?.photoUrl ?? defaults.photoUrl,
          equipment: prev?.equipment ?? slot?.equipment ?? defaults.equipment,
          session2Temp: prev?.session2Temp ?? slot?.session2Temp,
          session2PhotoUrl: prev?.session2PhotoUrl ?? slot?.session2PhotoUrl,
          session3Temp: prev?.session3Temp ?? slot?.session3Temp,
          session3PhotoUrl: prev?.session3PhotoUrl ?? slot?.session3PhotoUrl,
          notes: prev?.notes ?? slot?.notes ?? '',
        };
      });
    }

    const fallbackSlots: Array<{
      categoryKey: CookingItemDetail['categoryKey'];
      categoryLabel: string;
      itemName: string;
      smallGrams: number;
      largeGrams: number;
    }> = [
      { categoryKey: 'stapleFood', categoryLabel: 'Makanan Pokok', itemName: 'Nasi Putih Pulen', smallGrams: 100, largeGrams: 150 },
      { categoryKey: 'animalProtein', categoryLabel: 'Lauk Hewani', itemName: 'Lauk Hewani Utama', smallGrams: 55, largeGrams: 80 },
      { categoryKey: 'plantProtein', categoryLabel: 'Lauk Nabati', itemName: 'Lauk Nabati', smallGrams: 40, largeGrams: 60 },
      { categoryKey: 'vegetable', categoryLabel: 'Sayuran', itemName: 'Sayur Berkuah / Tumis', smallGrams: 60, largeGrams: 90 },
      { categoryKey: 'fruit', categoryLabel: 'Buah Segar', itemName: 'Buah Segar', smallGrams: 80, largeGrams: 110 },
    ];

    return fallbackSlots.map(fb => {
      const prev =
        existingItems?.find(it => it.id === `fallback-${fb.categoryKey}`) ||
        existingItems?.find(it => it.categoryKey === fb.categoryKey);
      const slot = mapCategoryToCookedSlot(fb.categoryKey, existingCookedFoods);
      const defaults = getCookedSlotDefaults(fb.categoryKey);
      return {
        id: prev?.id || `fallback-${fb.categoryKey}`,
        categoryKey: fb.categoryKey,
        categoryLabel: prev?.categoryLabel || fb.categoryLabel,
        itemName: prev?.itemName || fb.itemName,
        smallGrams: prev?.smallGrams ?? fb.smallGrams,
        largeGrams: prev?.largeGrams ?? fb.largeGrams,
        grammagePhotoUrl: prev?.grammagePhotoUrl || '',
        grammageSmallPhotoUrl: prev?.grammageSmallPhotoUrl || '',
        grammageLargePhotoUrl: prev?.grammageLargePhotoUrl || '',
        temp: prev?.temp ?? slot?.temp ?? defaults.temp,
        photoUrl: prev?.photoUrl ?? slot?.photoUrl ?? defaults.photoUrl,
        equipment: prev?.equipment ?? slot?.equipment ?? defaults.equipment,
        session2Temp: prev?.session2Temp ?? slot?.session2Temp,
        session2PhotoUrl: prev?.session2PhotoUrl ?? slot?.session2PhotoUrl,
        session3Temp: prev?.session3Temp ?? slot?.session3Temp,
        session3PhotoUrl: prev?.session3PhotoUrl ?? slot?.session3PhotoUrl,
        notes: prev?.notes ?? slot?.notes ?? '',
      };
    });
  };

  const [cookingForm, setCookingForm] = useState<{
    date: string;
    time: string;
    officerName: string;
    menuId: string;
    itemEntries: CookingItemDetail[];
    facilityTemps: FacilityTemperatures;
    notes: string;
  }>({
    date: new Date().toISOString().slice(0, 10),
    time: '06:15 WIB',
    officerName: 'Suparman & Hadi Sukamto',
    menuId: '',
    itemEntries: [],
    facilityTemps: { ...defaultFacilityTemperatures },
    notes: 'Pemasakan inti daging ayam di atas 75°C. Minyak goreng jernih. Organoleptik aroma harum alami tanpa MSG berlebih.',
  });

  const openNewCookingModal = () => {
    setEditingCookingId(null);
    const todayIso = new Date().toISOString().slice(0, 10);
    const defaultMenu = menuItems.find(m => m.date === todayIso) || menuItems[0];
    setCookingForm({
      date: todayIso,
      time: '06:15 WIB',
      officerName: getDefaultDivisionOfficerName(
        masterVolunteers,
        'Pengolahan',
        'Suparman (Juru Masak / Cook)'
      ),
      menuId: defaultMenu?.id || '',
      itemEntries: buildCookingItemEntries(defaultMenu),
      facilityTemps: { ...defaultFacilityTemperatures },
      notes: 'Pemasakan inti daging di atas 75°C. Suhu ruangan, freezer, dan chiller terpantau sesuai standar.',
    });
    setIsCookingModalOpen(true);
  };

  const openEditCookingModal = (rec: CookingInspectionRecord) => {
    setEditingCookingId(rec.id);
    const matchedMenu =
      (rec.menuId ? menuItems.find(m => m.id === rec.menuId) : undefined) ||
      menuItems.find(m => m.date === rec.date) ||
      menuItems[0];
    setCookingForm({
      date: rec.date,
      time: rec.time,
      officerName: rec.officerName,
      menuId: matchedMenu?.id || rec.menuId || '',
      itemEntries: buildCookingItemEntries(matchedMenu, rec.itemEntries, rec.cookedFoods),
      facilityTemps: {
        ...defaultFacilityTemperatures,
        ...(rec.facilityTemps || {}),
      },
      notes: rec.notes || '',
    });
    setIsCookingModalOpen(true);
  };

  const handleCookingMenuChange = (nextMenuId: string) => {
    const nextMenu = menuItems.find(m => m.id === nextMenuId);
    setCookingForm(prev => ({
      ...prev,
      menuId: nextMenuId,
      itemEntries: buildCookingItemEntries(nextMenu, prev.itemEntries),
    }));
  };

  const updateCookingItemEntry = (itemId: string, patch: Partial<CookingItemDetail>) => {
    setCookingForm(prev => ({
      ...prev,
      itemEntries: prev.itemEntries.map(it => (it.id === itemId ? { ...it, ...patch } : it)),
    }));
  };

  const handleSaveCooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingCooking) return;
    setIsSavingCooking(true);
    try {
      const matchedMenu =
        (cookingForm.menuId ? menuItems.find(m => m.id === cookingForm.menuId) : undefined) ||
        menuItems.find(m => m.date === cookingForm.date) ||
        menuItems[0];

      // Pastikan nama item selalu tersinkron dengan data terbaru Sub-menu PLOG dan angka suhu valid
      const syncedEntries = buildCookingItemEntries(matchedMenu, cookingForm.itemEntries).map(
        entry => {
          const defaults = getCookedSlotDefaults(entry.categoryKey);
          return {
            ...entry,
            temp:
              typeof entry.temp === 'number' && Number.isFinite(entry.temp)
                ? entry.temp
                : defaults.temp,
            session2Temp:
              typeof entry.session2Temp === 'number' && Number.isFinite(entry.session2Temp)
                ? entry.session2Temp
                : undefined,
            session3Temp:
              typeof entry.session3Temp === 'number' && Number.isFinite(entry.session3Temp)
                ? entry.session3Temp
                : undefined,
          };
        }
      );

      const pickSlotItem = (
        categoryKey: CookingItemDetail['categoryKey'],
        fallbackKey: CookingItemDetail['categoryKey']
      ) => {
        const found = syncedEntries.find(it => it.categoryKey === categoryKey);
        const defaults = getCookedSlotDefaults(fallbackKey);
        const safeTemp =
          typeof found?.temp === 'number' && Number.isFinite(found.temp)
            ? found.temp
            : defaults.temp;
        return {
          temp: safeTemp,
          photoUrl: found?.photoUrl || undefined,
          equipment: found?.equipment || defaults.equipment,
          session2Temp: found?.session2Temp,
          session2PhotoUrl: found?.session2PhotoUrl || undefined,
          session3Temp: found?.session3Temp,
          session3PhotoUrl: found?.session3PhotoUrl || undefined,
          notes: found?.notes || undefined,
        };
      };

      const rawFac = cookingForm.facilityTemps || defaultFacilityTemperatures;
      const numOr = (val: unknown, fb: number) =>
        typeof val === 'number' && Number.isFinite(val) ? val : fb;

      const safeFacilityTemps: FacilityTemperatures = {
        ...defaultFacilityTemperatures,
        ...rawFac,
        prepRoomTemp: numOr(rawFac.prepRoomTemp, defaultFacilityTemperatures.prepRoomTemp ?? 21.5),
        portioningRoomTemp: numOr(
          rawFac.portioningRoomTemp,
          defaultFacilityTemperatures.portioningRoomTemp ?? 21.5
        ),
        cookingRoomTemp: numOr(
          rawFac.cookingRoomTemp,
          defaultFacilityTemperatures.cookingRoomTemp ?? 26.0
        ),
        wetWarehouseTemp: numOr(
          rawFac.wetWarehouseTemp,
          defaultFacilityTemperatures.wetWarehouseTemp ?? 14.5
        ),
        dryWarehouseTemp: numOr(
          rawFac.dryWarehouseTemp,
          defaultFacilityTemperatures.dryWarehouseTemp ?? 23.0
        ),
        freezer1Temp: numOr(rawFac.freezer1Temp, defaultFacilityTemperatures.freezer1Temp ?? -19.5),
        freezer2Temp: numOr(rawFac.freezer2Temp, defaultFacilityTemperatures.freezer2Temp ?? -20.2),
        fridge1Temp: numOr(rawFac.fridge1Temp, defaultFacilityTemperatures.fridge1Temp ?? 4.8),
        fridge2Temp: numOr(rawFac.fridge2Temp, defaultFacilityTemperatures.fridge2Temp ?? 6.2),
        fridge3Temp: numOr(rawFac.fridge3Temp, defaultFacilityTemperatures.fridge3Temp ?? 5.5),
        fridge4Temp: numOr(rawFac.fridge4Temp, defaultFacilityTemperatures.fridge4Temp ?? 4.2),
      };

      const payload: Omit<CookingInspectionRecord, 'id'> = {
        date: cookingForm.date || new Date().toISOString().slice(0, 10),
        time: (cookingForm.time || '').trim() || '06:15 WIB',
        officerName: (cookingForm.officerName || '').trim() || 'Tim Divisi Pengolahan',
        menuId: matchedMenu?.id,
        cookedFoods: {
          rice: pickSlotItem('stapleFood', 'stapleFood'),
          animalProtein: pickSlotItem('animalProtein', 'animalProtein'),
          plantProtein: pickSlotItem('plantProtein', 'plantProtein'),
          vegetable: pickSlotItem('vegetable', 'vegetable'),
          fruit: pickSlotItem('fruit', 'fruit'),
        },
        itemEntries: syncedEntries,
        facilityTemps: safeFacilityTemps,
        notes: cookingForm.notes || '',
      };

      if (editingCookingId) {
        await updateCookingRecord(editingCookingId, payload);
        setSelectedCookingId(editingCookingId);
      } else {
        const created = await addCookingRecord(payload);
        setSelectedCookingId(created.id);
      }
      setIsCookingModalOpen(false);
      setEditingCookingId(null);
    } catch (err) {
      console.error('Gagal menyimpan data pengolahan:', err);
      addToast(
        'error',
        'Gagal Menyimpan Data Pengolahan',
        'Terjadi kendala saat menyimpan perubahan. Periksa input suhu atau ukuran foto lalu coba lagi.'
      );
    } finally {
      setIsSavingCooking(false);
    }
  };

  // -------------------------------------------------------------
  // TAB C: Form State Divisi Pemorsian
  // -------------------------------------------------------------
  const [portioningForm, setPortioningForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '07:00 WIB',
    portioningTime: '06:45 - 07:30 WIB',
    officerName: 'Nurul Hidayah & Tim Pemorsian',
    menuId: '',
    // 1. Makanan Pokok (Nasi) — Porsi Besar & Porsi Kecil
    riceRawLarge: 85,
    riceFactorLarge: 0.4,
    riceCookedLarge: 200,
    riceTemp: 72.0,
    ricePhoto: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=500&q=80',
    riceS2Temp: '' as string | number,
    riceS2Photo: '',
    riceS3Temp: '' as string | number,
    riceS3Photo: '',
    riceRawSmall: 50,
    riceFactorSmall: 1,
    riceCookedSmall: 100,
    riceSmallS1Temp: '' as string | number,
    riceSmallS1Photo: '',
    riceSmallS2Temp: '' as string | number,
    riceSmallS2Photo: '',
    riceSmallS3Temp: '' as string | number,
    riceSmallS3Photo: '',
    // 2. Lauk Hewani
    animalRaw: 50,
    animalFactor: 1,
    animalCooked: 50,
    animalTemp: 71.5,
    animalPhoto: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=80',
    animalS2Temp: '' as string | number,
    animalS2Photo: '',
    animalS3Temp: '' as string | number,
    animalS3Photo: '',
    // 3. Lauk Nabati
    plantRaw: 50,
    plantFactor: 1,
    plantCooked: 50,
    plantTemp: 68.0,
    plantPhoto: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
    plantS2Temp: '' as string | number,
    plantS2Photo: '',
    plantS3Temp: '' as string | number,
    plantS3Photo: '',
    // 4. Sayur
    vegRaw: 25,
    vegFactor: 1,
    vegCooked: 25,
    vegTemp: 67.5,
    vegPhoto: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=80',
    vegS2Temp: '' as string | number,
    vegS2Photo: '',
    vegS3Temp: '' as string | number,
    vegS3Photo: '',
    // 5. Buah
    fruitRaw: 100,
    fruitFactor: 1,
    fruitCooked: 100,
    fruitTemp: 18.0,
    fruitPhoto: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
    fruitS2Temp: '' as string | number,
    fruitS2Photo: '',
    fruitS3Temp: '' as string | number,
    fruitS3Photo: '',
    smallPortionGrams: 395,
    largePortionGrams: 585,
    smallPhoto: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
    largePhoto: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=500&q=80',
    facilityTemps: { ...defaultFacilityTemperatures } as FacilityTemperatures,
    notes: 'Pemorsian menggunakan ompreng stainless steril bersegel silikon. Gramasi ditimbang teliti sampling per 25 boks.',
  });
  const [editingPortioningId, setEditingPortioningId] = useState<string | null>(null);
  const [portioningCameraTarget, setPortioningCameraTarget] = useState<{
    portionType: 'small' | 'large';
    targetMode: 'form' | 'active_record';
  } | null>(null);

  const handlePortioningCameraCapture = async (dataUrl: string) => {
    if (!portioningCameraTarget) return;
    const isSmall = portioningCameraTarget.portionType === 'small';

    if (portioningCameraTarget.targetMode === 'active_record' && portioningRecords[0]) {
      await updatePortioningRecord(
        portioningRecords[0].id,
        isSmall ? { smallPortionPhoto: dataUrl } : { largePortionPhoto: dataUrl }
      );
      addToast(
        'success',
        'Foto Ompreng Tersimpan',
        `Foto Ompreng ${isSmall ? 'Porsi Kecil' : 'Porsi Besar'} tersimpan & tersinkron ke Flayer Menu.`
      );
    } else {
      setPortioningForm(f => ({
        ...f,
        ...(isSmall ? { smallPhoto: dataUrl } : { largePhoto: dataUrl }),
      }));
      addToast(
        'success',
        'Foto Ompreng Siap',
        `Hasil crop landscape ${isSmall ? 'Porsi Kecil' : 'Porsi Besar'} dimasukkan ke form.`
      );
    }
    setPortioningCameraTarget(null);
  };

  const openNewPortioningModal = () => {
    setEditingPortioningId(null);
    setPortioningForm(f => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
      officerName: getDefaultDivisionOfficerName(masterVolunteers, 'Pemorsian', f.officerName),
      menuId: menuItems[0]?.id || '',
      facilityTemps: { ...defaultFacilityTemperatures },
    }));
    setIsPortioningModalOpen(true);
  };

  const openEditPortioningModal = (rec: PortioningInspectionRecord) => {
    setEditingPortioningId(rec.id);
    setPortioningForm({
      date: rec.date,
      time: rec.time,
      portioningTime: rec.portioningTime,
      officerName: rec.officerName,
      menuId: rec.menuId || '',
      riceRawLarge: rec.foodTemps.rice.rawWeightGrams ?? 85,
      riceFactorLarge: rec.foodTemps.rice.conversionFactor ?? 0.4,
      riceCookedLarge: rec.foodTemps.rice.cookedWeightGrams ?? 200,
      riceTemp: rec.foodTemps.rice.temp,
      ricePhoto: rec.foodTemps.rice.photoUrl || '',
      riceS2Temp: rec.foodTemps.rice.session2Temp ?? '',
      riceS2Photo: rec.foodTemps.rice.session2PhotoUrl || '',
      riceS3Temp: rec.foodTemps.rice.session3Temp ?? '',
      riceS3Photo: rec.foodTemps.rice.session3PhotoUrl || '',
      riceRawSmall: rec.foodTemps.rice.rawWeightSmallGrams ?? 50,
      riceFactorSmall: rec.foodTemps.rice.conversionFactorSmall ?? 1,
      riceCookedSmall: rec.foodTemps.rice.cookedWeightSmallGrams ?? 100,
      riceSmallS1Temp: rec.foodTemps.rice.smallPortionSession1Temp ?? '',
      riceSmallS1Photo: rec.foodTemps.rice.smallPortionSession1PhotoUrl || '',
      riceSmallS2Temp: rec.foodTemps.rice.smallPortionSession2Temp ?? '',
      riceSmallS2Photo: rec.foodTemps.rice.smallPortionSession2PhotoUrl || '',
      riceSmallS3Temp: rec.foodTemps.rice.smallPortionSession3Temp ?? '',
      riceSmallS3Photo: rec.foodTemps.rice.smallPortionSession3PhotoUrl || '',
      animalRaw: rec.foodTemps.animalProtein.rawWeightGrams ?? 50,
      animalFactor: rec.foodTemps.animalProtein.conversionFactor ?? 1,
      animalCooked: rec.foodTemps.animalProtein.cookedWeightGrams ?? 50,
      animalTemp: rec.foodTemps.animalProtein.temp,
      animalPhoto: rec.foodTemps.animalProtein.photoUrl || '',
      animalS2Temp: rec.foodTemps.animalProtein.session2Temp ?? '',
      animalS2Photo: rec.foodTemps.animalProtein.session2PhotoUrl || '',
      animalS3Temp: rec.foodTemps.animalProtein.session3Temp ?? '',
      animalS3Photo: rec.foodTemps.animalProtein.session3PhotoUrl || '',
      plantRaw: rec.foodTemps.plantProtein.rawWeightGrams ?? 50,
      plantFactor: rec.foodTemps.plantProtein.conversionFactor ?? 1,
      plantCooked: rec.foodTemps.plantProtein.cookedWeightGrams ?? 50,
      plantTemp: rec.foodTemps.plantProtein.temp,
      plantPhoto: rec.foodTemps.plantProtein.photoUrl || '',
      plantS2Temp: rec.foodTemps.plantProtein.session2Temp ?? '',
      plantS2Photo: rec.foodTemps.plantProtein.session2PhotoUrl || '',
      plantS3Temp: rec.foodTemps.plantProtein.session3Temp ?? '',
      plantS3Photo: rec.foodTemps.plantProtein.session3PhotoUrl || '',
      vegRaw: rec.foodTemps.vegetable.rawWeightGrams ?? 25,
      vegFactor: rec.foodTemps.vegetable.conversionFactor ?? 1,
      vegCooked: rec.foodTemps.vegetable.cookedWeightGrams ?? 25,
      vegTemp: rec.foodTemps.vegetable.temp,
      vegPhoto: rec.foodTemps.vegetable.photoUrl || '',
      vegS2Temp: rec.foodTemps.vegetable.session2Temp ?? '',
      vegS2Photo: rec.foodTemps.vegetable.session2PhotoUrl || '',
      vegS3Temp: rec.foodTemps.vegetable.session3Temp ?? '',
      vegS3Photo: rec.foodTemps.vegetable.session3PhotoUrl || '',
      fruitRaw: rec.foodTemps.fruit.rawWeightGrams ?? 100,
      fruitFactor: rec.foodTemps.fruit.conversionFactor ?? 1,
      fruitCooked: rec.foodTemps.fruit.cookedWeightGrams ?? 100,
      fruitTemp: rec.foodTemps.fruit.temp,
      fruitPhoto: rec.foodTemps.fruit.photoUrl || '',
      fruitS2Temp: rec.foodTemps.fruit.session2Temp ?? '',
      fruitS2Photo: rec.foodTemps.fruit.session2PhotoUrl || '',
      fruitS3Temp: rec.foodTemps.fruit.session3Temp ?? '',
      fruitS3Photo: rec.foodTemps.fruit.session3PhotoUrl || '',
      smallPortionGrams: rec.smallPortionWeightGrams,
      largePortionGrams: rec.largePortionWeightGrams,
      smallPhoto: rec.smallPortionPhoto || '',
      largePhoto: rec.largePortionPhoto || '',
      facilityTemps: {
        ...defaultFacilityTemperatures,
        ...(rec.facilityTemps || {}),
      },
      notes: rec.notes || '',
    });
    setIsPortioningModalOpen(true);
  };

  const handleSavePortioning = async (e: React.FormEvent) => {
    e.preventDefault();
    const toOptNum = (val: string | number) =>
      val === '' || val === null || val === undefined ? undefined : Number(val);
    const matchedMenu =
      (portioningForm.menuId ? menuItems.find(m => m.id === portioningForm.menuId) : undefined) ||
      menuItems.find(m => m.date === portioningForm.date) ||
      menuItems[0];

    const payload = {
      date: portioningForm.date,
      time: portioningForm.time,
      portioningTime: portioningForm.portioningTime,
      officerName: portioningForm.officerName,
      menuId: matchedMenu?.id,
      foodTemps: {
        rice: {
          temp: Number(portioningForm.riceTemp),
          photoUrl: portioningForm.ricePhoto || undefined,
          session2Temp: toOptNum(portioningForm.riceS2Temp),
          session2PhotoUrl: portioningForm.riceS2Photo || undefined,
          session3Temp: toOptNum(portioningForm.riceS3Temp),
          session3PhotoUrl: portioningForm.riceS3Photo || undefined,
          dangerZone: '60-5°C',
          rawWeightGrams: Number(portioningForm.riceRawLarge),
          conversionFactor: Number(portioningForm.riceFactorLarge),
          cookedWeightGrams: Number(portioningForm.riceCookedLarge),
          rawWeightSmallGrams: Number(portioningForm.riceRawSmall),
          conversionFactorSmall: Number(portioningForm.riceFactorSmall),
          cookedWeightSmallGrams: Number(portioningForm.riceCookedSmall),
          smallPortionSession1Temp: toOptNum(portioningForm.riceSmallS1Temp),
          smallPortionSession1PhotoUrl: portioningForm.riceSmallS1Photo || portioningForm.smallPhoto || undefined,
          smallPortionSession2Temp: toOptNum(portioningForm.riceSmallS2Temp),
          smallPortionSession2PhotoUrl: portioningForm.riceSmallS2Photo || undefined,
          smallPortionSession3Temp: toOptNum(portioningForm.riceSmallS3Temp),
          smallPortionSession3PhotoUrl: portioningForm.riceSmallS3Photo || undefined,
        },
        animalProtein: {
          temp: Number(portioningForm.animalTemp),
          photoUrl: portioningForm.animalPhoto || undefined,
          session2Temp: toOptNum(portioningForm.animalS2Temp),
          session2PhotoUrl: portioningForm.animalS2Photo || undefined,
          session3Temp: toOptNum(portioningForm.animalS3Temp),
          session3PhotoUrl: portioningForm.animalS3Photo || undefined,
          dangerZone: '60-5°C',
          rawWeightGrams: Number(portioningForm.animalRaw),
          conversionFactor: Number(portioningForm.animalFactor),
          cookedWeightGrams: Number(portioningForm.animalCooked),
        },
        plantProtein: {
          temp: Number(portioningForm.plantTemp),
          photoUrl: portioningForm.plantPhoto || undefined,
          session2Temp: toOptNum(portioningForm.plantS2Temp),
          session2PhotoUrl: portioningForm.plantS2Photo || undefined,
          session3Temp: toOptNum(portioningForm.plantS3Temp),
          session3PhotoUrl: portioningForm.plantS3Photo || undefined,
          dangerZone: '60-5°C',
          rawWeightGrams: Number(portioningForm.plantRaw),
          conversionFactor: Number(portioningForm.plantFactor),
          cookedWeightGrams: Number(portioningForm.plantCooked),
        },
        vegetable: {
          temp: Number(portioningForm.vegTemp),
          photoUrl: portioningForm.vegPhoto || undefined,
          session2Temp: toOptNum(portioningForm.vegS2Temp),
          session2PhotoUrl: portioningForm.vegS2Photo || undefined,
          session3Temp: toOptNum(portioningForm.vegS3Temp),
          session3PhotoUrl: portioningForm.vegS3Photo || undefined,
          dangerZone: '60-5°C',
          rawWeightGrams: Number(portioningForm.vegRaw),
          conversionFactor: Number(portioningForm.vegFactor),
          cookedWeightGrams: Number(portioningForm.vegCooked),
        },
        fruit: {
          temp: Number(portioningForm.fruitTemp),
          photoUrl: portioningForm.fruitPhoto || undefined,
          session2Temp: toOptNum(portioningForm.fruitS2Temp),
          session2PhotoUrl: portioningForm.fruitS2Photo || undefined,
          session3Temp: toOptNum(portioningForm.fruitS3Temp),
          session3PhotoUrl: portioningForm.fruitS3Photo || undefined,
          dangerZone: '60-5°C',
          rawWeightGrams: Number(portioningForm.fruitRaw),
          conversionFactor: Number(portioningForm.fruitFactor),
          cookedWeightGrams: Number(portioningForm.fruitCooked),
        },
      },
      smallPortionWeightGrams: Number(portioningForm.smallPortionGrams),
      largePortionWeightGrams: Number(portioningForm.largePortionGrams),
      smallPortionPhoto: portioningForm.smallPhoto,
      largePortionPhoto: portioningForm.largePhoto,
      facilityTemps: portioningForm.facilityTemps,
      notes: portioningForm.notes,
    };

    if (editingPortioningId) {
      await updatePortioningRecord(editingPortioningId, payload);
    } else {
      await addPortioningRecord(payload);
    }
    setEditingPortioningId(null);
    setIsPortioningModalOpen(false);
  };

  // -------------------------------------------------------------
  // TAB D: Form State Divisi Distribusi & Armada
  // -------------------------------------------------------------
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    institutionId: institutions[0]?.id || '',
    departureTime: '08:15 WIB',
    arrivalTime: '08:35 WIB',
    driverName: 'Agus Santoso',
    vehicleNumber: 'N 8921 RA (Armada Box Isothermal 1)',
    picName: institutions[0]?.picName || 'Kepala Sekolah',
    status: 'Selesai Serah Terima' as DistributionDeliveryRecord['status'],
    activityPhoto: '',
    handoverPhoto: '',
    picOrganolepticPhoto: '',
    locationPhoto: '',
    notes: 'Boks termal tersegel rapi, uji organoleptik PIC disetujui, dan serah terima selesai di lokasi.',
  });

  const resolveInstitutionPicName = useCallback(
    (instId?: string): string => {
      const inst = institutions.find(i => i.id === instId);
      if (!inst) return '';
      return (inst.picName || '').trim() || (inst.contactPerson || '').trim() || '';
    },
    [institutions]
  );

  const openNewDeliveryModal = () => {
    const defaultInst = institutions[0];
    setEditingDeliveryId(null);
    setDeliveryForm({
      date: new Date().toISOString().slice(0, 10),
      institutionId: defaultInst?.id || '',
      departureTime: '08:15 WIB',
      arrivalTime: '08:35 WIB',
      driverName: getDefaultDivisionOfficerName(masterVolunteers, 'Distribusi', 'Agus Santoso'),
      vehicleNumber: 'N 8921 RA (Armada Box Isothermal 1)',
      picName: resolveInstitutionPicName(defaultInst?.id),
      status: 'Selesai Serah Terima',
      activityPhoto: '',
      handoverPhoto: '',
      picOrganolepticPhoto: '',
      locationPhoto: '',
      notes: 'Boks termal tersegel rapi, uji organoleptik PIC disetujui, dan serah terima selesai di lokasi.',
    });
    setIsDeliveryModalOpen(true);
  };

  const openEditDeliveryModal = (rec: DistributionDeliveryRecord) => {
    setEditingDeliveryId(rec.id);
    setDeliveryForm({
      date: rec.date,
      institutionId: rec.institutionId,
      departureTime: rec.departureTime,
      arrivalTime: rec.arrivalTime,
      driverName: rec.driverName,
      vehicleNumber: rec.vehicleNumber,
      picName: rec.picName || resolveInstitutionPicName(rec.institutionId),
      status: rec.status,
      activityPhoto: rec.activityPhoto || '',
      handoverPhoto: rec.handoverPhoto || '',
      picOrganolepticPhoto: rec.picOrganolepticPhoto || '',
      locationPhoto: rec.locationPhoto || '',
      notes: rec.notes || '',
    });
    setIsDeliveryModalOpen(true);
  };

  useEffect(() => {
    if (!isDeliveryModalOpen || editingDeliveryId) return;
    if (institutions.length === 0) return;
    const targetInstId = deliveryForm.institutionId || institutions[0].id;
    const autoPic = resolveInstitutionPicName(targetInstId);
    setDeliveryForm(f => {
      if (f.institutionId === targetInstId && f.picName.trim() !== '') {
        return f;
      }
      return {
        ...f,
        institutionId: targetInstId,
        picName: autoPic,
      };
    });
  }, [isDeliveryModalOpen, editingDeliveryId, institutions, deliveryForm.institutionId, resolveInstitutionPicName]);

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutions.find(i => i.id === deliveryForm.institutionId) || institutions[0];
    if (!inst) return;
    if (editingDeliveryId) {
      await updateDistributionDelivery(editingDeliveryId, {
        date: deliveryForm.date,
        institutionId: inst.id,
        institutionName: inst.name,
        smallPortions: inst.smallPortions,
        largePortions: inst.largePortions,
        totalPortions: inst.totalPortions,
        departureTime: deliveryForm.departureTime,
        arrivalTime: deliveryForm.arrivalTime,
        driverName: deliveryForm.driverName,
        vehicleNumber: deliveryForm.vehicleNumber,
        picName: deliveryForm.picName || inst.picName || 'Kepala Sekolah',
        status: deliveryForm.status,
        activityPhoto: deliveryForm.activityPhoto || undefined,
        handoverPhoto: deliveryForm.handoverPhoto || undefined,
        picOrganolepticPhoto: deliveryForm.picOrganolepticPhoto || undefined,
        locationPhoto: deliveryForm.locationPhoto || undefined,
        notes: deliveryForm.notes,
      });
    } else {
      const bastNumber = generateBastNumber(191 + distributionDeliveries.length + 1, deliveryForm.date);
      await addDistributionDelivery({
        date: deliveryForm.date,
        institutionId: inst.id,
        institutionName: inst.name,
        smallPortions: inst.smallPortions,
        largePortions: inst.largePortions,
        totalPortions: inst.totalPortions,
        departureTime: deliveryForm.departureTime,
        arrivalTime: deliveryForm.arrivalTime,
        driverName: deliveryForm.driverName,
        vehicleNumber: deliveryForm.vehicleNumber,
        activityPhoto: deliveryForm.activityPhoto || undefined,
        handoverPhoto: deliveryForm.handoverPhoto || undefined,
        picOrganolepticPhoto: deliveryForm.picOrganolepticPhoto || undefined,
        locationPhoto: deliveryForm.locationPhoto || undefined,
        bastNumber,
        picName: deliveryForm.picName || inst.picName || 'Kepala Sekolah',
        status: deliveryForm.status,
        notes: deliveryForm.notes,
      });
    }
    setIsDeliveryModalOpen(false);
    setEditingDeliveryId(null);
  };

  const [returnForm, setReturnForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    institutionId: institutions[0]?.id || '',
    smallPortions: institutions[0]?.smallPortions || 0,
    largePortions: institutions[0]?.largePortions || 0,
    departureTime: '12:30 WIB',
    arrivalTime: '13:05 WIB',
    driverName: 'Agus Santoso',
    vehicleNumber: 'N 8921 RA',
    receivedByOfficer:
      (institutions[0]?.picName || '').trim() ||
      (institutions[0]?.contactPerson || '').trim() ||
      '',
    activityPhoto: '',
    returnHandoverPhoto: '',
    locationPhoto: '',
    conditionStatus: 'Lengkap & Utuh' as OmprengReturnRecord['conditionStatus'],
    notes: 'Seluruh ompreng stainless kembali utuh dan siap disterilisasi.',
  });

  const openNewReturnModal = () => {
    const defaultInst = institutions[0];
    setReturnForm({
      date: new Date().toISOString().slice(0, 10),
      institutionId: defaultInst?.id || '',
      smallPortions: defaultInst?.smallPortions || 0,
      largePortions: defaultInst?.largePortions || 0,
      departureTime: '12:30 WIB',
      arrivalTime: '13:05 WIB',
      driverName: getDefaultDivisionOfficerName(masterVolunteers, 'Distribusi', 'Agus Santoso'),
      vehicleNumber: 'N 8921 RA',
      receivedByOfficer: resolveInstitutionPicName(defaultInst?.id),
      activityPhoto: '',
      returnHandoverPhoto: '',
      locationPhoto: '',
      conditionStatus: 'Lengkap & Utuh',
      notes: 'Seluruh ompreng stainless kembali utuh dan siap disterilisasi.',
    });
    setIsReturnModalOpen(true);
  };

  useEffect(() => {
    if (!isReturnModalOpen) return;
    if (institutions.length === 0) return;
    const targetInstId = returnForm.institutionId || institutions[0].id;
    const autoPic = resolveInstitutionPicName(targetInstId);
    setReturnForm(f => {
      if (f.institutionId === targetInstId && f.receivedByOfficer.trim() !== '') {
        return f;
      }
      return {
        ...f,
        institutionId: targetInstId,
        receivedByOfficer: autoPic,
      };
    });
  }, [isReturnModalOpen, institutions, returnForm.institutionId, resolveInstitutionPicName]);

  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutions.find(i => i.id === returnForm.institutionId) || institutions[0];
    if (!inst) return;
    const smallQty = Number(returnForm.smallPortions) || 0;
    const largeQty = Number(returnForm.largePortions) || 0;
    const resolvedPic =
      returnForm.receivedByOfficer.trim() || resolveInstitutionPicName(inst.id) || 'PIC Lembaga';
    await addOmprengReturn({
      date: returnForm.date,
      institutionId: inst.id,
      institutionName: inst.name,
      smallPortions: smallQty,
      largePortions: largeQty,
      totalPortions: smallQty + largeQty,
      departureTime: returnForm.departureTime,
      arrivalTime: returnForm.arrivalTime,
      driverName: returnForm.driverName,
      vehicleNumber: returnForm.vehicleNumber,
      activityPhoto: returnForm.activityPhoto || undefined,
      returnHandoverPhoto: returnForm.returnHandoverPhoto || undefined,
      locationPhoto: returnForm.locationPhoto || undefined,
      receivedByOfficer: resolvedPic,
      conditionStatus: returnForm.conditionStatus,
      notes: returnForm.notes,
    });
    setIsReturnModalOpen(false);
  };

  const [fuelForm, setFuelForm] = useState({
    vehicleNumber: 'N 8921 RA (Armada Box Isothermal 1)',
    driverName: 'Agus Santoso',
    fuelType: 'Dexlite' as 'Pertalite' | 'Pertamax' | 'Dexlite' | 'Solar',
    nominalCost: 250000,
    volumeLiters: 19.2,
    odometerKm: 34120,
    gasStationName: 'SPBU 54.672.03 Krejengan Probolinggo',
    activityPhoto: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80',
    receiptPhoto: 'https://images.unsplash.com/photo-1554415707-9e4466b404c0?auto=format&fit=crop&w=500&q=80',
    notes: 'Pengisian bahan bakar solar dexlite sebelum distribusi pagi.',
  });

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    await addFuelLog({
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      vehicleNumber: fuelForm.vehicleNumber,
      driverName: fuelForm.driverName,
      fuelType: fuelForm.fuelType,
      nominalCost: Number(fuelForm.nominalCost),
      volumeLiters: Number(fuelForm.volumeLiters),
      odometerKm: Number(fuelForm.odometerKm),
      gasStationName: fuelForm.gasStationName,
      activityPhoto: fuelForm.activityPhoto,
      receiptPhoto: fuelForm.receiptPhoto,
      notes: fuelForm.notes,
    });
    setIsFuelModalOpen(false);
  };

  const openNewFuelModal = () => {
    setFuelForm(f => ({
      ...f,
      driverName: getDefaultDivisionOfficerName(masterVolunteers, 'Distribusi', f.driverName),
    }));
    setIsFuelModalOpen(true);
  };

  // -------------------------------------------------------------
  // TAB E: Form State Divisi Cuci Ompreng & Food Waste
  // -------------------------------------------------------------
  const [wasteForm, setWasteForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '14:15 WIB',
    officerName: 'Fahrur Rozi & Tim Cuci Ompreng',
    wasteRice: 12.5,
    ricePhoto: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=500&q=80',
    wasteAnimal: 2.1,
    animalPhoto: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=80',
    wastePlant: 3.4,
    plantPhoto: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
    wasteVeg: 7.8,
    vegPhoto: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=80',
    wasteFruit: 1.2,
    fruitPhoto: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
    unit: 'kg',
    notes: 'Sisa nasi kelas 1-2 SD dan kuah sop. Seluruh sisa dialokasikan untuk pakan ternak warga sekitar (Zero Food Waste).',
    customFields: {} as Record<string, any>,
  });

  const handleOpenWasteModal = () => {
    setWasteForm(prev => ({
      ...prev,
      date: new Date().toISOString().slice(0, 10),
      officerName: getDefaultDivisionOfficerName(masterVolunteers, 'Cuci Ompreng', prev.officerName),
      customFields: getInitialCustomFieldValues(dynamicFormSchemas.production_waste_form),
    }));
    setIsWasteModalOpen(true);
  };

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const wasteErr = validateDynamicFormFields(dynamicFormSchemas.production_waste_form, {
      ...wasteForm,
      ...(wasteForm.customFields || {}),
    });
    if (wasteErr) {
      addToast('error', 'Validasi Form Food Waste', wasteErr);
      return;
    }
    const total =
      Number(wasteForm.wasteRice) +
      Number(wasteForm.wasteAnimal) +
      Number(wasteForm.wastePlant) +
      Number(wasteForm.wasteVeg) +
      Number(wasteForm.wasteFruit);
    await addWashingWasteRecord({
      date: wasteForm.date,
      time: wasteForm.time,
      officerName: wasteForm.officerName,
      wasteRice: { weight: Number(wasteForm.wasteRice), unit: wasteForm.unit, photoUrl: wasteForm.ricePhoto },
      wasteAnimalProtein: { weight: Number(wasteForm.wasteAnimal), unit: wasteForm.unit, photoUrl: wasteForm.animalPhoto },
      wastePlantProtein: { weight: Number(wasteForm.wastePlant), unit: wasteForm.unit, photoUrl: wasteForm.plantPhoto },
      wasteVegetable: { weight: Number(wasteForm.wasteVeg), unit: wasteForm.unit, photoUrl: wasteForm.vegPhoto },
      wasteFruit: { weight: Number(wasteForm.wasteFruit), unit: wasteForm.unit, photoUrl: wasteForm.fruitPhoto },
      totalWasteWeight: Number(total.toFixed(2)),
      unit: wasteForm.unit,
      notes: wasteForm.notes,
      sterilizationChecked: true,
      customFields: wasteForm.customFields || {},
    });
    setIsWasteModalOpen(false);
    setIsModalWasteSchemaEdit(false);
  };

  // Helper temperature badge
  const renderTempBadge = (label: string, temp: number, standard: string, isOk: boolean, photoUrl?: string) => (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{label}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isOk ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'}`}>
            {isOk ? 'Standar' : 'Perhatian'}
          </span>
        </div>
        <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
          {temp}°C
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">Target: {standard}</p>
      </div>

      {photoUrl && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewPhotoUrl(photoUrl)}
            className="text-[11px] font-semibold text-blue-900 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Bukti Foto</span>
          </button>
          <span className="text-[10px] text-slate-400 font-mono">Digital Sensor</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <div className="hidden print:block">
        <PrintHeader
          title="LEMBAR KENDALI OPERASIONAL DAN PRODUKSI DAPUR MBG"
          subtitle="Divisi Persiapan, Pengolahan, Pemorsian, Distribusi & Cuci Ompreng (Sanitasi Food Waste)"
          docNumber="BAP-PROD/SPPG-TMG2/2026/XI/009"
        />
      </div>

      {/* Compact Header Bar */}
      <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#1E3A8A] dark:text-sky-400 shrink-0" />
            Modul Produksi dan Operasional Dapur
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Satuan Pelayanan Pemenuhan Gizi: <strong>{sppgConfig.sppgName}</strong> (ID: {sppgConfig.sppgId})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'washing' && (
            <DynamicFormEditToggleBar
              formId="production_waste_form"
              isEditing={isEditingWasteSchema}
              onToggleEdit={() => setIsEditingWasteSchema(v => !v)}
            />
          )}
          <button
            type="button"
            onClick={triggerPrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all duration-200 ease-in-out shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak BAP Operasional</span>
          </button>
        </div>
      </div>

      {activeTab === 'washing' && isEditingWasteSchema && (
        <DynamicFormBuilderPanel
          formId="production_waste_form"
          onClose={() => setIsEditingWasteSchema(false)}
        />
      )}

      {/* 5-Division Responsive Pill Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('prep')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'prep'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Scissors className="w-4 h-4 shrink-0" />
            <span>A. Divisi Persiapan</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${activeTab === 'prep' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {prepRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cooking')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'cooking'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <CookingPot className="w-4 h-4 shrink-0" />
            <span>B. Divisi Pengolahan</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${activeTab === 'cooking' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {cookingRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portioning')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'portioning'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span>C. Divisi Pemorsian</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${activeTab === 'portioning' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {portioningRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('distribution')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'distribution'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>D. Divisi Distribusi & Armada</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${activeTab === 'distribution' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {distributionDeliveries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('washing')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'washing'
                ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>E. Divisi Cuci & Food Waste</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${activeTab === 'washing' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {washingWasteRecords.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB A: DIVISI PERSIAPAN                                  */}
      {/* ========================================================= */}
      {activeTab === 'prep' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-sky-600" />
                Standar CCP, Inspeksi Bahan Rusak, Suhu Ruang &amp; Pendingin Divisi Persiapan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan suhu &amp; foto bahan rusak, suhu &amp; kelembapan ruangan (Ruang Pengolahan, Ruang Pemorsian, Gudang Basah, Gudang Kering), serta Freezer 1–2 &amp; Chiller 1–4.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {prepRecords[0] && (
                <button
                  type="button"
                  onClick={() => openEditPrepModal(prepRecords[0])}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Edit Data &amp; Foto Persiapan</span>
                </button>
              )}
              <button
                type="button"
                onClick={openNewPrepModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Input Data & Foto Persiapan</span>
              </button>
            </div>
          </div>

          {/* Damaged Materials Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {prepRecords[0] && (
              <>
                {/* Damaged Veg */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <AlertTriangle className="w-4 h-4" />
                        Bahan Rusak: Sayuran
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                        {prepRecords[0].damagedVegetable.temp}°C
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {prepRecords[0].damagedVegetable.name}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Kuantitas: <strong>{prepRecords[0].damagedVegetable.quantity} {prepRecords[0].damagedVegetable.unit}</strong>
                    </p>
                  </div>
                  {prepRecords[0].damagedVegetable.photoUrl && (
                    <div className="mt-3">
                      <img
                        src={prepRecords[0].damagedVegetable.photoUrl}
                        alt="Bahan Rusak Sayur"
                        onClick={() => setViewPhotoUrl(prepRecords[0].damagedVegetable.photoUrl || null)}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  )}
                </div>

                {/* Damaged Animal */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
                      <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                        Bahan Rusak: Lauk Hewani
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300">
                        {prepRecords[0].damagedAnimal.temp}°C
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {prepRecords[0].damagedAnimal.name}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Kuantitas: <strong>{prepRecords[0].damagedAnimal.quantity} {prepRecords[0].damagedAnimal.unit}</strong>
                    </p>
                  </div>
                  {prepRecords[0].damagedAnimal.photoUrl && (
                    <div className="mt-3">
                      <img
                        src={prepRecords[0].damagedAnimal.photoUrl}
                        alt="Bahan Rusak Hewani"
                        onClick={() => setViewPhotoUrl(prepRecords[0].damagedAnimal.photoUrl || null)}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  )}
                </div>

                {/* Damaged Fruit */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        Bahan Rusak: Buah
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                        {prepRecords[0].damagedFruit.temp}°C
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {prepRecords[0].damagedFruit.name}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Kuantitas: <strong>{prepRecords[0].damagedFruit.quantity} {prepRecords[0].damagedFruit.unit}</strong>
                    </p>
                  </div>
                  {prepRecords[0].damagedFruit.photoUrl && (
                    <div className="mt-3">
                      <img
                        src={prepRecords[0].damagedFruit.photoUrl}
                        alt="Bahan Rusak Buah"
                        onClick={() => setViewPhotoUrl(prepRecords[0].damagedFruit.photoUrl || null)}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Suhu Ruang (Suhu, Kelembapan, Waktu & Foto) dan Suhu Freezer 1-2 & Chiller 1-4 (Suhu, Waktu & Foto) */}
          {prepRecords[0] && (
            <FacilityTempReportPanel
              divisionLabel="Divisi Persiapan"
              subtitleMeta={`Tanggal: ${formatIndonesianDate(prepRecords[0].date)} • Pukul ${prepRecords[0].time} • Petugas: ${prepRecords[0].officerName}`}
              facilityTemps={prepRecords[0].facilityTemps}
              fallbackTime={prepRecords[0].time}
              showTimeFields={true}
              showCoolingHumidity={false}
              onUploadUnitPhoto={async (photoKey, dataUrl, unitLabel) => {
                const currentTemps = prepRecords[0].facilityTemps || defaultFacilityTemperatures;
                await updatePrepRecord(prepRecords[0].id, {
                  facilityTemps: applyFacilityPhotoPatch(currentTemps, photoKey, dataUrl),
                });
                addToast(
                  'success',
                  'Foto Suhu Tersimpan',
                  `Bukti foto ${unitLabel} berhasil diunggah ke log Divisi Persiapan.`
                );
              }}
              onViewPhoto={url => setViewPhotoUrl(url)}
              onOpenInputModal={() => openEditPrepModal(prepRecords[0])}
              onUploadError={handleUploadError}
            />
          )}

          {/* Historical Prep Log Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              <span>Log Riwayat Pemeriksaan Divisi Persiapan</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {prepRecords.map(r => (
                <div key={r.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{r.date}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {r.time}
                        </span>
                        <span className="text-xs text-slate-500">Oleh: <strong>{r.officerName}</strong></span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                        "{r.notes}"
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5 sm:text-right">
                      <div>Rusak: Sayur {r.damagedVegetable.quantity}kg • Hewani {r.damagedAnimal.quantity}kg • Buah {r.damagedFruit.quantity}kg</div>
                      <div className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
                        Total Rijek: {(r.damagedVegetable.quantity + r.damagedAnimal.quantity + r.damagedFruit.quantity).toFixed(1)} kg
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB B: DIVISI PENGOLAHAN                                 */}
      {/* ========================================================= */}
      {activeTab === 'cooking' && (() => {
        const activeCooking =
          (selectedCookingId ? cookingRecords.find(r => r.id === selectedCookingId) : undefined) ||
          cookingRecords[0];
        const linkedMenu = activeCooking
          ? (activeCooking.menuId ? menuItems.find(m => m.id === activeCooking.menuId) : undefined) ||
            menuItems.find(m => m.date === activeCooking.date) ||
            menuItems[0]
          : menuItems[0];
        const liveItemEntries = activeCooking
          ? buildCookingItemEntries(linkedMenu, activeCooking.itemEntries, activeCooking.cookedFoods)
          : [];

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CookingPot className="w-4 h-4 text-amber-600" />
                  Input Data Pengolahan, Suhu Item Menu, Suhu Ruang &amp; Pendingin
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nama item menu terhubung otomatis dari PLOG, dilengkapi pencatatan suhu &amp; foto Ruang Pengolahan, Ruang Pemorsian, Gudang Basah/Kering, Freezer 1–2, dan Chiller 1–4.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {activeCooking && (
                  <button
                    type="button"
                    onClick={() => openEditCookingModal(activeCooking)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Edit Data &amp; Foto Pengolahan</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={openNewCookingModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Data &amp; Foto Pengolahan</span>
                </button>
              </div>
            </div>

            {activeCooking && (
              <>
                {/* Banner Sinkronisasi Menu PLOG */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-sky-50 dark:from-amber-950/30 dark:to-sky-950/30 p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/50">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md font-bold bg-blue-900 text-white">
                        {linkedMenu ? `${linkedMenu.menuCode} • ${linkedMenu.dayName}` : 'Menu Harian'}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Tanggal Olah: {formatIndonesianDate(activeCooking.date)} • Pukul {activeCooking.time}
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px]">
                        Terhubung PLOG ({liveItemEntries.length} Item Menu)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Petugas Pengolahan: <strong className="text-slate-800 dark:text-slate-200">{activeCooking.officerName}</strong>
                      {activeCooking.notes ? ` — ${activeCooking.notes}` : ''}
                    </p>
                  </div>
                  {cookingRecords.length > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Pilih Log Tanggal:</label>
                      <select
                        value={activeCooking.id}
                        onChange={e => setSelectedCookingId(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                      >
                        {cookingRecords.map(rec => (
                          <option key={rec.id} value={rec.id}>
                            {formatIndonesianDate(rec.date)} ({rec.time})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Grid Kartu Per-Item Menu: Suhu & Foto Item Menu (Sinkron PLOG) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {liveItemEntries.map((item, idx) => {
                    const isColdOrFresh = item.categoryKey === 'fruit' || item.categoryKey === 'milkOrExtra';
                    const safeS1Temp = typeof item.temp === 'number' && Number.isFinite(item.temp) ? item.temp : 0;
                    const isSafeTemp = isColdOrFresh ? safeS1Temp <= 25 || safeS1Temp >= 60 : safeS1Temp >= 75;
                    const hasS2 = typeof item.session2Temp === 'number' && Number.isFinite(item.session2Temp);
                    const hasS3 = typeof item.session3Temp === 'number' && Number.isFinite(item.session3Temp);

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {idx + 1}. {item.categoryLabel}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                {item.itemName}
                              </h4>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isColdOrFresh
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : isSafeTemp
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {isColdOrFresh ? 'Segar / Pendamping' : isSafeTemp ? 'CCP Aman ≥75°C' : 'Perlu Pantau'}
                            </span>
                          </div>

                          {/* Suhu Matang Item Menu */}
                          <div className="flex items-center justify-between pt-2">
                            <div>
                              <span className="text-[10px] text-slate-500 block">Suhu Matang Sesi 1</span>
                              <span
                                className={`text-2xl font-black font-mono ${
                                  isColdOrFresh
                                    ? 'text-blue-900 dark:text-sky-400'
                                    : isSafeTemp
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {safeS1Temp}°C
                              </span>
                            </div>
                            <div className="text-right text-[10px] text-slate-500">
                              <span className="block font-semibold text-slate-700 dark:text-slate-300">
                                {item.equipment || 'Peralatan Standar'}
                              </span>
                              {(hasS2 || hasS3) && (
                                <span className="font-mono">
                                  {hasS2 ? `S2: ${item.session2Temp}°C` : ''}
                                  {hasS2 && hasS3 ? ' • ' : ''}
                                  {hasS3 ? `S3: ${item.session3Temp}°C` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dokumentasi Foto Item Menu */}
                        {item.photoUrl && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                              <Camera className="w-3 h-3 text-amber-600" /> Foto Item Menu ({item.itemName}):
                            </span>
                            <img
                              src={item.photoUrl}
                              alt={`Foto ${item.itemName}`}
                              onClick={() => setViewPhotoUrl(item.photoUrl || null)}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Suhu Ruang & Pendingin (Ruang Pengolahan, Ruang Pemorsian, Gudang Basah, Gudang Kering, Freezer 1-2, Chiller 1-4) */}
                <FacilityTempReportPanel
                  divisionLabel="Divisi Pengolahan"
                  subtitleMeta={`Tanggal Olah: ${formatIndonesianDate(activeCooking.date)} • Pukul ${activeCooking.time} • Petugas: ${activeCooking.officerName}`}
                  facilityTemps={activeCooking.facilityTemps}
                  fallbackTime={activeCooking.time}
                  showTimeFields={true}
                  onUploadUnitPhoto={async (photoKey, dataUrl) => {
                    try {
                      const currentTemps = activeCooking.facilityTemps || defaultFacilityTemperatures;
                      await updateCookingRecord(activeCooking.id, {
                        facilityTemps: applyFacilityPhotoPatch(currentTemps, photoKey, dataUrl),
                      });
                    } catch {
                      addToast('error', 'Upload Foto Gagal', 'Terjadi kendala saat menyimpan foto suhu unit.');
                    }
                  }}
                  onViewPhoto={url => setViewPhotoUrl(url)}
                  onOpenInputModal={() => openEditCookingModal(activeCooking)}
                  onUploadError={handleUploadError}
                />
              </>
            )}
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* TAB C: DIVISI PEMORSIAN                                   */}
      {/* ========================================================= */}
      {activeTab === 'portioning' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                Standar Gramasi & Suhu Pemorsian Ompreng MBG
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sampling gramasi porsi kecil vs porsi besar, suhu makanan saat di-seal, dan dokumentasi foto ompreng lengkap.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {portioningRecords[0] && (
                <button
                  type="button"
                  onClick={() => openEditPortioningModal(portioningRecords[0])}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Edit Foto &amp; Suhu Aktif</span>
                </button>
              )}
              <button
                type="button"
                onClick={openNewPortioningModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Input Data & Foto Pemorsian</span>
              </button>
            </div>
          </div>

          {/* Gramasi & Ompreng Photos */}
          {portioningRecords[0] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Porsi Kecil */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      Porsi Kecil (PAUD/TK & SD Kelas 1-3)
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      Target: 380 - 410 gram
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black font-mono text-blue-900 dark:text-sky-400">
                      {portioningRecords[0].smallPortionWeightGrams}
                    </span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">gram / ompreng</span>
                    <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Presisi Sesuai Standar
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Rincian: Nasi 130g, Daging Ayam 55g, Tempe 35g, Sayur 65g, Buah Pisang 110g.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> Foto Ompreng Porsi Kecil:
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPortioningCameraTarget({ portionType: 'small', targetMode: 'active_record' })
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Live Camera Landscape</span>
                    </button>
                  </div>
                  {portioningRecords[0].smallPortionPhoto && (
                    <img
                      src={portioningRecords[0].smallPortionPhoto}
                      alt="Foto Ompreng Porsi Kecil"
                      onClick={() => setViewPhotoUrl(portioningRecords[0].smallPortionPhoto || null)}
                      className="w-full h-44 object-cover rounded-xl cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  )}
                </div>
              </div>

              {/* Porsi Besar */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Porsi Besar (SD Kelas 4-6, SMP, SMA, Santri)
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      Target: 560 - 600 gram
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black font-mono text-blue-900 dark:text-sky-400">
                      {portioningRecords[0].largePortionWeightGrams}
                    </span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">gram / ompreng</span>
                    <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Presisi Sesuai Standar
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Rincian: Nasi 200g, Daging Ayam 80g, Tempe 45g, Sayur 90g, Buah Pisang 120g.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> Foto Ompreng Porsi Besar:
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPortioningCameraTarget({ portionType: 'large', targetMode: 'active_record' })
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Live Camera Landscape</span>
                    </button>
                  </div>
                  {portioningRecords[0].largePortionPhoto && (
                    <img
                      src={portioningRecords[0].largePortionPhoto}
                      alt="Foto Ompreng Porsi Besar"
                      onClick={() => setViewPhotoUrl(portioningRecords[0].largePortionPhoto || null)}
                      className="w-full h-44 object-cover rounded-xl cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Holding & Portioning Temps */}
          {portioningRecords[0] && (
            <>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Suhu Makanan Saat Masuk Ompreng
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Waktu Pemorsian: {portioningRecords[0].portioningTime} • Petugas: {portioningRecords[0].officerName}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {renderTempBadge('Suhu Nasi Saat Masuk', portioningRecords[0].foodTemps.rice.temp, '> 65°C', portioningRecords[0].foodTemps.rice.temp >= 65)}
                  {renderTempBadge('Suhu Lauk Hewani', portioningRecords[0].foodTemps.animalProtein.temp, '> 65°C', portioningRecords[0].foodTemps.animalProtein.temp >= 65)}
                  {renderTempBadge('Suhu Lauk Nabati', portioningRecords[0].foodTemps.plantProtein.temp, '> 60°C', portioningRecords[0].foodTemps.plantProtein.temp >= 60)}
                  {renderTempBadge('Suhu Sayur Sop', portioningRecords[0].foodTemps.vegetable.temp, '> 60°C', portioningRecords[0].foodTemps.vegetable.temp >= 60)}
                  {renderTempBadge('Suhu Buah Pisang', portioningRecords[0].foodTemps.fruit.temp, '15 - 20°C', true)}
                </div>
              </div>

              {/* Suhu Ruang (Suhu, Kelembapan, Waktu & Foto) dan Suhu Freezer 1-2 & Chiller 1-4 (Suhu, Waktu & Foto) */}
              <FacilityTempReportPanel
                divisionLabel="Divisi Pemorsian"
                subtitleMeta={`Tanggal: ${formatIndonesianDate(portioningRecords[0].date)} • Waktu Pemorsian: ${portioningRecords[0].portioningTime} • Petugas: ${portioningRecords[0].officerName}`}
                facilityTemps={portioningRecords[0].facilityTemps}
                fallbackTime={portioningRecords[0].time}
                showTimeFields={true}
                showCoolingHumidity={false}
                onUploadUnitPhoto={async (photoKey, dataUrl, unitLabel) => {
                  const currentTemps = portioningRecords[0].facilityTemps || defaultFacilityTemperatures;
                  await updatePortioningRecord(portioningRecords[0].id, {
                    facilityTemps: applyFacilityPhotoPatch(currentTemps, photoKey, dataUrl),
                  });
                  addToast(
                    'success',
                    'Foto Suhu Tersimpan',
                    `Bukti foto ${unitLabel} berhasil diunggah ke log Divisi Pemorsian.`
                  );
                }}
                onViewPhoto={url => setViewPhotoUrl(url)}
                onOpenInputModal={() => openEditPortioningModal(portioningRecords[0])}
                onUploadError={handleUploadError}
              />
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB D: DIVISI DISTRIBUSI & ARMADA                         */}
      {/* ========================================================= */}
      {activeTab === 'distribution' && (
        <div className="space-y-6">
          {/* Sub Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Operasional Logistik Distribusi, Pengembalian Ompreng & BBM
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Input data pengiriman (foto uji organoleptik, serah terima &amp; lokasi), pengembalian ompreng (foto pengembalian &amp; lokasi), dan log BBM armada.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={openNewDeliveryModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Input Data Pengiriman</span>
              </button>
              <button
                type="button"
                onClick={openNewReturnModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>+ Pengembalian Ompreng</span>
              </button>
              <button
                type="button"
                onClick={openNewFuelModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>+ Log BBM</span>
              </button>
            </div>
          </div>

          {/* Section 1: Pengiriman ke Lembaga & BAST */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <Building2 className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                <span>Daftar Pengiriman Makanan MBG ke Sekolah (Terhubung BAST & Organoleptik)</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Total Rute: {distributionDeliveries.length} Sekolah
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {distributionDeliveries.map(d => (
                <div key={d.id} className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900 dark:text-white">{d.institutionName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {d.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {d.bastNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{d.date}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                        <span>Porsi Kecil: <strong>{d.smallPortions}</strong></span>
                        <span>•</span>
                        <span>Porsi Besar: <strong>{d.largePortions}</strong></span>
                        <span>•</span>
                        <span className="font-bold text-blue-900 dark:text-sky-400">Total: {d.totalPortions} Boks</span>
                        <span>•</span>
                        <span>Armada: <strong>{d.vehicleNumber}</strong> ({d.driverName})</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Berangkat: {d.departureTime} → Tiba: {d.arrivalTime}
                        </span>
                        <span>•</span>
                        <span>Penerima: <strong>{d.picName}</strong></span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1">
                        "{d.notes}"
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDeliveryForBast(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-900 dark:text-sky-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 transition"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Lihat / Cetak Format BAST</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditDeliveryModal(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Edit / Lengkapi Foto</span>
                        </button>
                      </div>
                    </div>

                    {/* Photos Preview */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {d.picOrganolepticPhoto && (
                        <div className="text-center">
                          <img
                            src={d.picOrganolepticPhoto}
                            alt="Uji Organoleptik"
                            onClick={() => setViewPhotoUrl(d.picOrganolepticPhoto || null)}
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Uji Organoleptik</span>
                        </div>
                      )}
                      {d.handoverPhoto && (
                        <div className="text-center">
                          <img
                            src={d.handoverPhoto}
                            alt="Serah Terima"
                            onClick={() => setViewPhotoUrl(d.handoverPhoto || null)}
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Serah Terima</span>
                        </div>
                      )}
                      {d.locationPhoto && (
                        <div className="text-center">
                          <img
                            src={d.locationPhoto}
                            alt="Foto Lokasi"
                            onClick={() => setViewPhotoUrl(d.locationPhoto || null)}
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Foto Lokasi</span>
                        </div>
                      )}
                      {d.activityPhoto && (
                        <div className="text-center">
                          <img
                            src={d.activityPhoto}
                            alt="Kegiatan Distribusi"
                            onClick={() => setViewPhotoUrl(d.activityPhoto || null)}
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                          <span className="text-[10px] text-slate-400 block mt-0.5">Kegiatan</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Pengembalian Ompreng & Log BBM Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pengembalian Ompreng Kosong */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-sky-600" />
                  Pengembalian Ompreng Kosong
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {omprengReturns.length} Lembaga Kembali
                </span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-96 overflow-y-auto">
                {omprengReturns.map(ret => (
                  <div key={ret.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{ret.institutionName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Kembali: <strong>{ret.totalPortions} Ompreng</strong> (Kecil: {ret.smallPortions}, Besar: {ret.largePortions})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {ret.date} • Driver: {ret.driverName} • PIC Lembaga: {ret.receivedByOfficer} • Tiba SPPG: {ret.arrivalTime}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        {ret.conditionStatus}
                      </span>
                    </div>

                    {(ret.returnHandoverPhoto || ret.locationPhoto) && (
                      <div className="flex items-center gap-3 pt-1">
                        {ret.returnHandoverPhoto && (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(ret.returnHandoverPhoto || null)}
                            className="flex items-center gap-1.5 group text-left"
                          >
                            <img
                              src={ret.returnHandoverPhoto}
                              alt="Foto Pengembalian"
                              className="w-11 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 group-hover:opacity-80"
                            />
                            <span className="text-[10px] font-semibold text-blue-900 dark:text-sky-400 group-hover:underline">
                              Foto Pengembalian
                            </span>
                          </button>
                        )}
                        {ret.locationPhoto && (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(ret.locationPhoto || null)}
                            className="flex items-center gap-1.5 group text-left"
                          >
                            <img
                              src={ret.locationPhoto}
                              alt="Foto Lokasi"
                              className="w-11 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 group-hover:opacity-80"
                            />
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                              Foto Lokasi
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Log BBM Armada */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-500" />
                  Log Pengisian Bahan Bakar (BBM) Armada
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {fuelLogs.length} Transaksi
                </span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-96 overflow-y-auto">
                {fuelLogs.map(fl => (
                  <div key={fl.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{fl.vehicleNumber}</div>
                        <div className="text-xs font-mono font-bold text-blue-900 dark:text-sky-400 mt-0.5">
                          {formatRupiah(fl.nominalCost)} ({fl.volumeLiters} Liter {fl.fuelType})
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Driver: {fl.driverName} • Odo: {formatNumber(fl.odometerKm)} km • {fl.date} {fl.time}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{fl.gasStationName}</div>
                      </div>
                      <div className="text-right">
                        {fl.receiptPhoto && (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(fl.receiptPhoto || null)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 dark:text-sky-400 hover:underline"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Struk BBM</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB E: DIVISI CUCI OMPRENG & FOOD WASTE                   */}
      {/* ========================================================= */}
      {activeTab === 'washing' && (
        <div className="space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                Audit Limbah Makanan (Food Waste) & Sterilisasi Cuci Ompreng
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan sisa sampah per kategori (nasi, hewani, nabati, sayur, buah) dengan rekapitulasi harian & bulanan Program Zero Waste.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenWasteModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Input Data & Foto Food Waste</span>
            </button>
          </div>

          {/* Latest Day Waste Breakdown Card */}
          {washingWasteRecords[0] && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Sisa Sampah Makanan Terakhir: {washingWasteRecords[0].date} ({washingWasteRecords[0].time})
                  </span>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    Total: {washingWasteRecords[0].totalWasteWeight} kg{' '}
                    <span className="text-xs font-normal text-emerald-600 font-sans">
                      (Hanya ~2.1% dari total 2.850 porsi, lolos kriteria efisiensi BGN &lt; 3%)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Sterilisasi UV & Air Panas 82°C Aktif
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Petugas: {washingWasteRecords[0].officerName}
                  </p>
                </div>
              </div>

              {/* 5 Waste Categories Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Rice */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">1. Sisa Nasi</span>
                  <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                    {washingWasteRecords[0].wasteRice.weight} kg
                  </div>
                  {washingWasteRecords[0].wasteRice.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setViewPhotoUrl(washingWasteRecords[0].wasteRice.photoUrl || null)}
                      className="text-[10px] text-blue-900 dark:text-sky-400 hover:underline mt-2 block"
                    >
                      Lihat Foto Sisa
                    </button>
                  )}
                </div>

                {/* Animal Protein */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">2. Sisa Hewani</span>
                  <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                    {washingWasteRecords[0].wasteAnimalProtein.weight} kg
                  </div>
                  {washingWasteRecords[0].wasteAnimalProtein.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setViewPhotoUrl(washingWasteRecords[0].wasteAnimalProtein.photoUrl || null)}
                      className="text-[10px] text-blue-900 dark:text-sky-400 hover:underline mt-2 block"
                    >
                      Lihat Foto Sisa
                    </button>
                  )}
                </div>

                {/* Plant Protein */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">3. Sisa Nabati</span>
                  <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                    {washingWasteRecords[0].wastePlantProtein.weight} kg
                  </div>
                  {washingWasteRecords[0].wastePlantProtein.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setViewPhotoUrl(washingWasteRecords[0].wastePlantProtein.photoUrl || null)}
                      className="text-[10px] text-blue-900 dark:text-sky-400 hover:underline mt-2 block"
                    >
                      Lihat Foto Sisa
                    </button>
                  )}
                </div>

                {/* Vegetable */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">4. Sisa Sayur</span>
                  <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                    {washingWasteRecords[0].wasteVegetable.weight} kg
                  </div>
                  {washingWasteRecords[0].wasteVegetable.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setViewPhotoUrl(washingWasteRecords[0].wasteVegetable.photoUrl || null)}
                      className="text-[10px] text-blue-900 dark:text-sky-400 hover:underline mt-2 block"
                    >
                      Lihat Foto Sisa
                    </button>
                  )}
                </div>

                {/* Fruit */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">5. Sisa Buah</span>
                  <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                    {washingWasteRecords[0].wasteFruit.weight} kg
                  </div>
                  {washingWasteRecords[0].wasteFruit.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setViewPhotoUrl(washingWasteRecords[0].wasteFruit.photoUrl || null)}
                      className="text-[10px] text-blue-900 dark:text-sky-400 hover:underline mt-2 block"
                    >
                      Lihat Foto Sisa
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div>
                  <strong>Catatan Evaluasi Sisa:</strong> {washingWasteRecords[0].notes}
                </div>
                {(() => {
                  const customFields = getCustomTableFields(dynamicFormSchemas.production_waste_form);
                  const latestCustom = washingWasteRecords[0].customFields || {};
                  const filled = customFields.filter(
                    f => latestCustom[f.key] !== undefined && latestCustom[f.key] !== ''
                  );
                  if (filled.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {filled.map(f => (
                        <span
                          key={f.id}
                          className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/70 border border-amber-300 dark:border-amber-700 text-[11px]"
                        >
                          <strong>{f.label}:</strong> {formatDynamicFieldValue(f, latestCustom[f.key])}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Section: Rekap Harian Food Waste */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Rekapitulasi Harian Food Waste (5 Hari Terakhir)
              </span>
              <span className="text-xs font-mono text-slate-500">
                Audit Rutin Satgas Higiene SPPG
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Tanggal & Waktu</th>
                    <th className="py-2.5 px-4 text-right">Nasi (kg)</th>
                    <th className="py-2.5 px-4 text-right">Hewani (kg)</th>
                    <th className="py-2.5 px-4 text-right">Nabati (kg)</th>
                    <th className="py-2.5 px-4 text-right">Sayur (kg)</th>
                    <th className="py-2.5 px-4 text-right">Buah (kg)</th>
                    <th className="py-2.5 px-4 text-right">Total Limbah</th>
                    <th className="py-2.5 px-4">Evaluasi / Alasan</th>
                    <th className="py-2.5 px-4">Foto Sisa Makanan</th>
                    {getCustomTableFields(dynamicFormSchemas.production_waste_form).map(cf => (
                      <th key={cf.id} className="py-2.5 px-4 whitespace-nowrap">
                        {cf.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {washingWasteRecords.map(w => {
                    const rowPhotos = [
                      { label: 'Nasi', url: w.wasteRice?.photoUrl },
                      { label: 'Hewani', url: w.wasteAnimalProtein?.photoUrl },
                      { label: 'Nabati', url: w.wastePlantProtein?.photoUrl },
                      { label: 'Sayur', url: w.wasteVegetable?.photoUrl },
                      { label: 'Buah', url: w.wasteFruit?.photoUrl },
                    ].filter((item): item is { label: string; url: string } => Boolean(item.url && item.url.trim() !== ''));
                    const customFields = getCustomTableFields(dynamicFormSchemas.production_waste_form);

                    return (
                      <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {w.date} <span className="text-[11px] font-normal text-slate-500">({w.time})</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">{w.wasteRice.weight}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{w.wasteAnimalProtein.weight}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{w.wastePlantProtein.weight}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{w.wasteVegetable.weight}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{w.wasteFruit.weight}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-900 dark:text-sky-400">
                          {w.totalWasteWeight} kg
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={w.notes}>
                          {w.notes}
                        </td>
                        <td className="py-2.5 px-4">
                          {rowPhotos.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1 min-w-[160px]">
                              {rowPhotos.map((p, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setViewPhotoUrl(p.url)}
                                  title={`Lihat foto sisa ${p.label}`}
                                  className="flex flex-col items-center gap-0.5 p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-600 transition"
                                >
                                  <img
                                    src={p.url}
                                    alt={`Foto ${p.label}`}
                                    className="w-8 h-8 object-cover rounded-xs"
                                  />
                                  <span className="text-[9px] text-slate-600 dark:text-slate-300 leading-none">
                                    {p.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-slate-400">Belum ada foto</span>
                          )}
                        </td>
                        {customFields.map(cf => {
                          const val = w.customFields?.[cf.key];
                          return (
                            <td key={cf.id} className="py-2.5 px-4">
                              {cf.type === 'photo' && typeof val === 'string' && val ? (
                                <button
                                  type="button"
                                  onClick={() => setViewPhotoUrl(val)}
                                  className="p-0.5 rounded border border-slate-200 dark:border-slate-700 hover:border-blue-500"
                                >
                                  <img src={val} alt={cf.label} className="w-8 h-8 object-cover rounded-xs" />
                                </button>
                              ) : (
                                <span>{formatDynamicFieldValue(cf, val)}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Rekap Bulanan Food Waste */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Rekapitulasi Bulanan Food Waste & Program Zero Waste SPPG
              </span>
              <span className="text-xs font-mono text-emerald-600 font-bold">
                Target: &lt; 2.5% Food Waste BGN
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Bulan Operasional</th>
                    <th className="py-2.5 px-4 text-right">Total Porsi MBG</th>
                    <th className="py-2.5 px-4 text-right">Total Food Waste (kg)</th>
                    <th className="py-2.5 px-4 text-right">Rata-rata Sisa/Siswa</th>
                    <th className="py-2.5 px-4 text-right">% Terhadap Produksi</th>
                    <th className="py-2.5 px-4 text-right">Pemanfaatan Pakan Ternak (kg)</th>
                    <th className="py-2.5 px-4 text-center">Status Audit BGN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {monthlyWasteSummary.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900 dark:text-white">{m.month}</td>
                      <td className="py-2.5 px-4 text-right">{formatNumber(m.totalPortions)}</td>
                      <td className="py-2.5 px-4 text-right">{m.totalWasteKg} kg</td>
                      <td className="py-2.5 px-4 text-right">{m.avgWastePerStudentGrams} gram</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600">{m.wastePercentage}%</td>
                      <td className="py-2.5 px-4 text-right text-sky-600">{m.zeroWasteReuseKg} kg</td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Memenuhi Standar Zero Waste
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL VIEW PHOTO                                         */}
      {/* ========================================================= */}
      {viewPhotoUrl && (
        <Modal
          isOpen={!!viewPhotoUrl}
          onClose={() => setViewPhotoUrl(null)}
          title="Bukti Dokumentasi Foto Lapangan"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <img
              src={viewPhotoUrl}
              alt="Bukti Dokumentasi"
              className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-black/5"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewPhotoUrl(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: TAB A (DIVISI PERSIAPAN)                     */}
      {/* ========================================================= */}
      {isPrepModalOpen && (
        <Modal
          isOpen={isPrepModalOpen}
          onClose={() => {
            setIsPrepModalOpen(false);
            setEditingPrepId(null);
          }}
          title={
            editingPrepId
              ? 'Edit Data Bahan Rusak, Suhu Ruang, Pendingin & Foto Divisi Persiapan'
              : 'Input Data Inspeksi Bahan Rusak, Suhu Ruang & Pendingin Divisi Persiapan'
          }
          maxWidth="4xl"
        >
          <form onSubmit={handleSavePrep} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={prepForm.date}
                  onChange={e => setPrepForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Waktu Pemeriksaan</label>
                <ClassicTimeInput
                  required
                  value={prepForm.time}
                  onChange={val => setPrepForm(f => ({ ...f, time: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nama Petugas Pemeriksa (Div. Persiapan)
                </label>
                <select
                  required
                  value={prepForm.officerName}
                  onChange={e => setPrepForm(f => ({ ...f, officerName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                >
                  {prepVolunteerOptions.length === 0 && !prepForm.officerName && (
                    <option value="">-- Belum ada relawan Divisi Persiapan --</option>
                  )}
                  {prepVolunteerOptions.map(opt => (
                    <option key={opt.volunteer.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {prepForm.officerName &&
                    !prepVolunteerOptions.some(o => o.value === prepForm.officerName) && (
                      <option value={prepForm.officerName}>{prepForm.officerName}</option>
                    )}
                </select>
              </div>
            </div>

            {/* Bahan Rusak 3 Kategori */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/40">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Data & Foto Bahan Rusak (Sayur, Lauk Hewani, Buah)
              </span>

              {/* Sayur */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Nama Sayur Rusak</label>
                  <input
                    type="text"
                    value={prepForm.vegName}
                    onChange={e => setPrepForm(f => ({ ...f, vegName: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Jumlah Rusak</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.vegQty}
                    onChange={e => setPrepForm(f => ({ ...f, vegQty: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Satuan</label>
                  <select
                    value={prepForm.vegUnit}
                    onChange={e => setPrepForm(f => ({ ...f, vegUnit: e.target.value }))}
                    className="w-full px-2 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-semibold"
                  >
                    {masterUnits.map(u => (
                      <option key={u.id} value={u.code}>{u.code}</option>
                    ))}
                    {prepForm.vegUnit && !masterUnits.some(u => u.code === prepForm.vegUnit) && (
                      <option value={prepForm.vegUnit}>{prepForm.vegUnit}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Suhu (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.vegTemp}
                    onChange={e => setPrepForm(f => ({ ...f, vegTemp: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Upload Foto Sayur</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setPrepForm(f => ({ ...f, vegPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
              </div>

              {/* Hewani */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Nama Hewani Rusak/Trimming</label>
                  <input
                    type="text"
                    value={prepForm.animalName}
                    onChange={e => setPrepForm(f => ({ ...f, animalName: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Jumlah Rusak</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.animalQty}
                    onChange={e => setPrepForm(f => ({ ...f, animalQty: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Satuan</label>
                  <select
                    value={prepForm.animalUnit}
                    onChange={e => setPrepForm(f => ({ ...f, animalUnit: e.target.value }))}
                    className="w-full px-2 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-semibold"
                  >
                    {masterUnits.map(u => (
                      <option key={u.id} value={u.code}>{u.code}</option>
                    ))}
                    {prepForm.animalUnit && !masterUnits.some(u => u.code === prepForm.animalUnit) && (
                      <option value={prepForm.animalUnit}>{prepForm.animalUnit}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Suhu (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.animalTemp}
                    onChange={e => setPrepForm(f => ({ ...f, animalTemp: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Upload Foto Hewani</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setPrepForm(f => ({ ...f, animalPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
              </div>

              {/* Buah */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Nama Buah Rusak/Memar</label>
                  <input
                    type="text"
                    value={prepForm.fruitName}
                    onChange={e => setPrepForm(f => ({ ...f, fruitName: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Jumlah Rusak</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.fruitQty}
                    onChange={e => setPrepForm(f => ({ ...f, fruitQty: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Satuan</label>
                  <select
                    value={prepForm.fruitUnit}
                    onChange={e => setPrepForm(f => ({ ...f, fruitUnit: e.target.value }))}
                    className="w-full px-2 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-semibold"
                  >
                    {masterUnits.map(u => (
                      <option key={u.id} value={u.code}>{u.code}</option>
                    ))}
                    {prepForm.fruitUnit && !masterUnits.some(u => u.code === prepForm.fruitUnit) && (
                      <option value={prepForm.fruitUnit}>{prepForm.fruitUnit}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Suhu (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.fruitTemp}
                    onChange={e => setPrepForm(f => ({ ...f, fruitTemp: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Upload Foto Buah</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setPrepForm(f => ({ ...f, fruitPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
              </div>
            </div>

            {/* Input Data & Upload Foto Suhu Ruang (Suhu, Kelembapan, Waktu) + Freezer 1-2 & Chiller 1-4 (Suhu, Waktu) */}
            <FacilityTempModalGrid
              divisionLabel="Divisi Persiapan"
              value={prepForm.facilityTemps}
              fallbackTime={prepForm.time}
              showTimeFields={true}
              showCoolingHumidity={false}
              onChange={next => setPrepForm(f => ({ ...f, facilityTemps: next }))}
              onViewPhoto={url => setViewPhotoUrl(url)}
              onUploadError={handleUploadError}
            />

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Catatan Keterangan</label>
              <textarea
                rows={2}
                value={prepForm.notes}
                onChange={e => setPrepForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsPrepModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                Simpan Log Divisi Persiapan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: TAB B (DIVISI PENGOLAHAN)                   */}
      {/* ========================================================= */}
      {isCookingModalOpen && (
        <Modal
          isOpen={isCookingModalOpen}
          onClose={() => {
            setIsCookingModalOpen(false);
            setEditingCookingId(null);
          }}
          title={
            editingCookingId
              ? 'Edit Data Pengolahan, Suhu Item Menu, Ruang & Pendingin'
              : 'Input Data Divisi Pengolahan (Suhu Menu, Ruang & Pendingin)'
          }
          maxWidth="4xl"
        >
          <form onSubmit={handleSaveCooking} className="space-y-5 text-xs">
            {/* Header Info & Pemilihan Menu PLOG */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={cookingForm.date}
                  onChange={e => setCookingForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Waktu Pemeriksaan</label>
                <ClassicTimeInput
                  required
                  value={cookingForm.time}
                  onChange={val => setCookingForm(f => ({ ...f, time: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nama Petugas (Div. Pengolahan)
                </label>
                <select
                  required
                  value={cookingForm.officerName}
                  onChange={e => setCookingForm(f => ({ ...f, officerName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                >
                  {cookingVolunteerOptions.length === 0 && !cookingForm.officerName && (
                    <option value="">-- Belum ada relawan Divisi Pengolahan --</option>
                  )}
                  {cookingVolunteerOptions.map(opt => (
                    <option key={opt.volunteer.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {cookingForm.officerName &&
                    !cookingVolunteerOptions.some(o => o.value === cookingForm.officerName) && (
                      <option value={cookingForm.officerName}>{cookingForm.officerName}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Menu Harian PLOG (Sumber Nama Item)
                </label>
                <select
                  value={
                    cookingForm.menuId ||
                    menuItems.find(m => m.date === cookingForm.date)?.id ||
                    menuItems[0]?.id ||
                    ''
                  }
                  onChange={e => handleCookingMenuChange(e.target.value)}
                  className="w-full px-2.5 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-[11px] font-semibold"
                >
                  {menuItems.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.menuCode}] {m.dayName} ({m.date})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const targetId =
                      cookingForm.menuId ||
                      menuItems.find(m => m.date === cookingForm.date)?.id ||
                      menuItems[0]?.id ||
                      '';
                    if (targetId) handleCookingMenuChange(targetId);
                    addToast('info', 'Sinkronisasi PLOG', 'Nama item menu disinkronkan ulang dari Sub-Menu PLOG.');
                  }}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-sky-400 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sinkron Ulang Item Menu dari PLOG</span>
                </button>
              </div>
            </div>

            {/* BAGIAN 1: INPUT DATA SUHU & FOTO ITEM MENU (NAMA ITEM TERHUBUNG PLOG) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <CookingPot className="w-4 h-4 text-amber-500" />
                    1. Input Data Suhu &amp; Foto Item Menu (Sesi 1–3, Standar Inti ≥ 75°C)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nama item menu otomatis mengikuti item yang diinput oleh PLOG pada menu harian terpilih.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 self-start">
                  Nama Item Sinkron PLOG
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cookingForm.itemEntries.map((entry, idx) => (
                  <div
                    key={`temp-${entry.id}`}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {idx + 1}. {entry.categoryLabel}
                      </span>
                      <span
                        className="text-xs font-bold text-blue-900 dark:text-sky-400 block truncate"
                        title={entry.itemName}
                      >
                        {entry.itemName}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold">Peralatan Masak</label>
                      <input
                        type="text"
                        value={entry.equipment || ''}
                        onChange={e => updateCookingItemEntry(entry.id, { equipment: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-[11px] dark:bg-slate-800 dark:border-slate-700 mt-0.5"
                      />
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        Sesi 1: Suhu (°C) &amp; Foto Item Menu
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={typeof entry.temp === 'number' && Number.isFinite(entry.temp) ? entry.temp : ''}
                        onChange={e =>
                          updateCookingItemEntry(entry.id, {
                            temp: e.target.value === '' ? Number.NaN : Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border rounded font-mono text-xs dark:bg-slate-800 dark:border-slate-700"
                      />
                      <div className="flex items-center gap-2">
                        {entry.photoUrl && (
                          <img
                            src={entry.photoUrl}
                            alt={`Foto ${entry.itemName}`}
                            onClick={() => setViewPhotoUrl(entry.photoUrl || null)}
                            className="w-11 h-11 rounded object-cover border border-slate-300 shrink-0 cursor-pointer"
                          />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e =>
                            handleFileUpload(e, url => updateCookingItemEntry(entry.id, { photoUrl: url }))
                          }
                          className="w-full text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          Sesi 2 (°C)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Opsional"
                          value={
                            typeof entry.session2Temp === 'number' && Number.isFinite(entry.session2Temp)
                              ? entry.session2Temp
                              : ''
                          }
                          onChange={e => {
                            const val = e.target.value;
                            const parsed = Number(val);
                            updateCookingItemEntry(entry.id, {
                              session2Temp:
                                val === '' || !Number.isFinite(parsed) ? undefined : parsed,
                            });
                          }}
                          className="w-full px-2 py-1 border rounded font-mono text-[11px] dark:bg-slate-800 dark:border-slate-700 mt-0.5"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e =>
                            handleFileUpload(e, url => updateCookingItemEntry(entry.id, { session2PhotoUrl: url }))
                          }
                          className="w-full text-[9px] mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          Sesi 3 (°C)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Opsional"
                          value={
                            typeof entry.session3Temp === 'number' && Number.isFinite(entry.session3Temp)
                              ? entry.session3Temp
                              : ''
                          }
                          onChange={e => {
                            const val = e.target.value;
                            const parsed = Number(val);
                            updateCookingItemEntry(entry.id, {
                              session3Temp:
                                val === '' || !Number.isFinite(parsed) ? undefined : parsed,
                            });
                          }}
                          className="w-full px-2 py-1 border rounded font-mono text-[11px] dark:bg-slate-800 dark:border-slate-700 mt-0.5"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e =>
                            handleFileUpload(e, url => updateCookingItemEntry(entry.id, { session3PhotoUrl: url }))
                          }
                          className="w-full text-[9px] mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BAGIAN 2 & 3: INPUT DATA & UPLOAD FOTO SUHU RUANG + FREEZER 1-2 & CHILLER 1-4 (DENGAN KOLOM WAKTU) */}
            <FacilityTempModalGrid
              divisionLabel="Divisi Pengolahan"
              value={cookingForm.facilityTemps}
              fallbackTime={cookingForm.time}
              showTimeFields={true}
              onChange={next => setCookingForm(f => ({ ...f, facilityTemps: next }))}
              onViewPhoto={url => setViewPhotoUrl(url)}
              onUploadError={handleUploadError}
            />

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Catatan Keterangan Pengolahan</label>
              <textarea
                rows={2}
                value={cookingForm.notes}
                onChange={e => setCookingForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                disabled={isSavingCooking}
                onClick={() => {
                  setIsCookingModalOpen(false);
                  setEditingCookingId(null);
                }}
                className="px-4 py-2 border rounded-xl text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingCooking}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold disabled:opacity-60"
              >
                {isSavingCooking
                  ? 'Menyimpan...'
                  : editingCookingId
                  ? 'Simpan Perubahan Data Pengolahan'
                  : 'Simpan Log Divisi Pengolahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: TAB C (DIVISI PEMORSIAN)                    */}
      {/* ========================================================= */}
      {isPortioningModalOpen && (
        <Modal
          isOpen={isPortioningModalOpen}
          onClose={() => {
            setIsPortioningModalOpen(false);
            setEditingPortioningId(null);
          }}
          title={
            editingPortioningId
              ? 'Edit Data Suhu, Ruangan, Pendingin & Foto Divisi Pemorsian'
              : 'Input Data Suhu, Ruangan, Pendingin & Foto Divisi Pemorsian'
          }
          maxWidth="4xl"
        >
          <form onSubmit={handleSavePortioning} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block font-bold mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={portioningForm.date}
                  onChange={e => setPortioningForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Pemeriksaan</label>
                <ClassicTimeInput
                  required
                  value={portioningForm.time}
                  onChange={val => setPortioningForm(f => ({ ...f, time: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Pemorsian</label>
                <ClassicTimeInput
                  required
                  value={portioningForm.portioningTime}
                  onChange={val => setPortioningForm(f => ({ ...f, portioningTime: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Nama Petugas (Div. Pemorsian)</label>
                <select
                  required
                  value={portioningForm.officerName}
                  onChange={e => setPortioningForm(f => ({ ...f, officerName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                >
                  {portioningVolunteerOptions.length === 0 && !portioningForm.officerName && (
                    <option value="">-- Belum ada relawan Divisi Pemorsian --</option>
                  )}
                  {portioningVolunteerOptions.map(opt => (
                    <option key={opt.volunteer.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {portioningForm.officerName &&
                    !portioningVolunteerOptions.some(o => o.value === portioningForm.officerName) && (
                      <option value={portioningForm.officerName}>{portioningForm.officerName}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Menu Harian (Master Menu)</label>
                <select
                  value={
                    portioningForm.menuId ||
                    menuItems.find(m => m.date === portioningForm.date)?.id ||
                    menuItems[0]?.id ||
                    ''
                  }
                  onChange={e => setPortioningForm(f => ({ ...f, menuId: e.target.value }))}
                  className="w-full px-2.5 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold"
                >
                  {menuItems.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.menuCode}] {m.dayName} ({m.date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload Foto Ompreng Porsi Kecil & Porsi Besar (Sinkron Otomatis dengan Flyer Menu) */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-600" />
                  Upload Foto Ompreng Porsi Kecil &amp; Porsi Besar (Sinkron Flyer Menu)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live Camera 0.6x Panduan Ompreng + Flash
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Porsi Kecil */}
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Ompreng Porsi Kecil</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Sinkron Flyer Menu
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPortioningCameraTarget({ portionType: 'small', targetMode: 'form' })}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Buka Live Camera 0.6x (Porsi Kecil)</span>
                  </button>

                  <div className="flex items-center gap-2.5 pt-1">
                    {portioningForm.smallPhoto && (
                      <img
                        src={portioningForm.smallPhoto}
                        alt="Preview Porsi Kecil"
                        onClick={() => setViewPhotoUrl(portioningForm.smallPhoto || null)}
                        className="w-20 h-14 rounded-lg object-cover border border-slate-300 shrink-0 cursor-pointer"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <label className="block text-slate-500 text-[10px]">
                        Atau Upload File / Kamera Bawaan:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => handleFileUpload(e, url => setPortioningForm(f => ({ ...f, smallPhoto: url })))}
                        className="w-full text-[10px]"
                      />
                      {portioningForm.smallPhoto && (
                        <button
                          type="button"
                          onClick={() => setPortioningForm(f => ({ ...f, smallPhoto: '' }))}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          Hapus Foto Porsi Kecil
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Porsi Besar */}
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Ompreng Porsi Besar</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Sinkron Flyer Menu
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPortioningCameraTarget({ portionType: 'large', targetMode: 'form' })}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-800 to-indigo-700 hover:from-blue-900 hover:to-indigo-800 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Buka Live Camera 0.6x (Porsi Besar)</span>
                  </button>

                  <div className="flex items-center gap-2.5 pt-1">
                    {portioningForm.largePhoto && (
                      <img
                        src={portioningForm.largePhoto}
                        alt="Preview Porsi Besar"
                        onClick={() => setViewPhotoUrl(portioningForm.largePhoto || null)}
                        className="w-20 h-14 rounded-lg object-cover border border-slate-300 shrink-0 cursor-pointer"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <label className="block text-slate-500 text-[10px]">
                        Atau Upload File / Kamera Bawaan:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => handleFileUpload(e, url => setPortioningForm(f => ({ ...f, largePhoto: url })))}
                        className="w-full text-[10px]"
                      />
                      {portioningForm.largePhoto && (
                        <button
                          type="button"
                          onClick={() => setPortioningForm(f => ({ ...f, largePhoto: '' }))}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          Hapus Foto Porsi Besar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Suhu & Dokumentasi Sesi 1 per Item Menu */}
            {(() => {
              const selectedMenu =
                (portioningForm.menuId ? menuItems.find(m => m.id === portioningForm.menuId) : undefined) ||
                menuItems.find(m => m.date === portioningForm.date) ||
                menuItems[0];

              const portionCategories = [
                {
                  label: '1. Makanan Pokok (p besar)',
                  menuTitle: selectedMenu?.stapleFood || '-',
                  s1TempKey: 'riceTemp' as const,
                  s1PhotoKey: 'ricePhoto' as const,
                },
                {
                  label: '1b. Makanan Pokok (p kecil)',
                  menuTitle: selectedMenu?.stapleFood || '-',
                  s1TempKey: 'riceSmallS1Temp' as const,
                  s1PhotoKey: 'riceSmallS1Photo' as const,
                },
                {
                  label: '2. Lauk Hewani',
                  menuTitle: selectedMenu?.animalProtein || '-',
                  s1TempKey: 'animalTemp' as const,
                  s1PhotoKey: 'animalPhoto' as const,
                },
                {
                  label: '3. Lauk Nabati',
                  menuTitle: selectedMenu?.plantProtein || '-',
                  s1TempKey: 'plantTemp' as const,
                  s1PhotoKey: 'plantPhoto' as const,
                },
                {
                  label: '4. Sayur',
                  menuTitle: selectedMenu?.vegetable || '-',
                  s1TempKey: 'vegTemp' as const,
                  s1PhotoKey: 'vegPhoto' as const,
                },
                {
                  label: '5. Buah',
                  menuTitle: selectedMenu?.fruit || selectedMenu?.milkOrExtra || '-',
                  s1TempKey: 'fruitTemp' as const,
                  s1PhotoKey: 'fruitPhoto' as const,
                },
              ];

              return (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50/70 dark:bg-slate-800/30">
                  <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                    Input Suhu &amp; Dokumentasi Item Menu Saat Pemorsian (Sesi 1)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {portionCategories.map(pc => {
                      const currentPhoto = portioningForm[pc.s1PhotoKey];
                      return (
                        <div key={pc.label} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                          <div>
                            <label className="block font-bold text-slate-800 dark:text-slate-100">{pc.label}</label>
                            <p className="text-[10px] text-blue-700 dark:text-sky-400 font-medium line-clamp-1" title={pc.menuTitle}>
                              Menu: {pc.menuTitle} • Danger Zone: 60-5°C
                            </p>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                Suhu Pemorsian (°C)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="°C"
                                value={portioningForm[pc.s1TempKey]}
                                onChange={e =>
                                  setPortioningForm(f => ({
                                    ...f,
                                    [pc.s1TempKey]: pc.s1TempKey === 'riceSmallS1Temp' ? e.target.value : Number(e.target.value),
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 border rounded-md font-mono text-xs dark:bg-slate-800 dark:border-slate-700"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {currentPhoto && (
                                <img
                                  src={currentPhoto}
                                  alt={`Foto ${pc.label}`}
                                  onClick={() => setViewPhotoUrl(currentPhoto || null)}
                                  className="w-11 h-11 rounded object-cover border border-slate-300 shrink-0 cursor-pointer"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <label className="block text-[10px] text-slate-500 mb-0.5">Upload Foto Item:</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={e => handleFileUpload(e, url => setPortioningForm(f => ({ ...f, [pc.s1PhotoKey]: url })))}
                                  className="w-full text-[10px]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Input Data & Upload Foto Suhu Ruang (Suhu, Kelembapan, Waktu) + Freezer 1-2 & Chiller 1-4 (Suhu, Waktu) */}
            <FacilityTempModalGrid
              divisionLabel="Divisi Pemorsian"
              value={portioningForm.facilityTemps}
              fallbackTime={portioningForm.time}
              showTimeFields={true}
              showCoolingHumidity={false}
              onChange={next => setPortioningForm(f => ({ ...f, facilityTemps: next }))}
              onViewPhoto={url => setViewPhotoUrl(url)}
              onUploadError={handleUploadError}
            />

            <div>
              <label className="block font-bold mb-1">Catatan Keterangan Pemorsian</label>
              <textarea
                rows={2}
                value={portioningForm.notes}
                onChange={e => setPortioningForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsPortioningModalOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                Simpan Log Pemorsian
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: TAB D (PENGIRIMAN DISTRIBUSI & BAST)         */}
      {/* ========================================================= */}
      {isDeliveryModalOpen && (
        <Modal
          isOpen={isDeliveryModalOpen}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setEditingDeliveryId(null);
          }}
          title={editingDeliveryId ? 'Edit Data Pengiriman & Dokumentasi Foto' : 'Input Data Pengiriman Makanan MBG & BAST'}
          maxWidth="xl"
        >
          <form onSubmit={handleSaveDelivery} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Tanggal Pengiriman</label>
                <input
                  type="date"
                  required
                  value={deliveryForm.date}
                  onChange={e => setDeliveryForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Pilih Lembaga Penerima Manfaat</label>
                <select
                  required
                  value={deliveryForm.institutionId}
                  onChange={e => {
                    const nextInstId = e.target.value;
                    setDeliveryForm(f => ({
                      ...f,
                      institutionId: nextInstId,
                      picName: resolveInstitutionPicName(nextInstId),
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.totalPortions} Porsi • Kecil: {inst.smallPortions}, Besar: {inst.largePortions})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Waktu Keberangkatan</label>
                <ClassicTimeInput
                  required
                  value={deliveryForm.departureTime}
                  onChange={val => setDeliveryForm(f => ({ ...f, departureTime: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Tiba / Serah Terima</label>
                <ClassicTimeInput
                  required
                  value={deliveryForm.arrivalTime}
                  onChange={val => setDeliveryForm(f => ({ ...f, arrivalTime: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Status Pengiriman</label>
                <select
                  value={deliveryForm.status}
                  onChange={e => setDeliveryForm(f => ({ ...f, status: e.target.value as DistributionDeliveryRecord['status'] }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="Dalam Perjalanan">Dalam Perjalanan</option>
                  <option value="Tiba di Lokasi">Tiba di Lokasi</option>
                  <option value="Selesai Serah Terima">Selesai Serah Terima</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Petugas Distribusi (Div. Distribusi)</label>
                <select
                  required
                  value={deliveryForm.driverName}
                  onChange={e => setDeliveryForm(f => ({ ...f, driverName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                >
                  {distVolunteerOptions.length === 0 && !deliveryForm.driverName && (
                    <option value="">-- Belum ada relawan Divisi Distribusi --</option>
                  )}
                  {distVolunteerOptions.map(opt => (
                    <option key={opt.volunteer.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {deliveryForm.driverName &&
                    !distVolunteerOptions.some(o => o.value === deliveryForm.driverName) && (
                      <option value={deliveryForm.driverName}>{deliveryForm.driverName}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Kendaraan / Plat Nomor</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.vehicleNumber}
                  onChange={e => setDeliveryForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                {(() => {
                  const selectedInst = institutions.find(i => i.id === deliveryForm.institutionId);
                  const autoPic = resolveInstitutionPicName(deliveryForm.institutionId);
                  const isSynced = Boolean(autoPic && deliveryForm.picName === autoPic);
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block font-bold">PIC Penerima di Lokasi</label>
                        {autoPic && !isSynced && (
                          <button
                            type="button"
                            onClick={() => setDeliveryForm(f => ({ ...f, picName: autoPic }))}
                            className="text-[10px] font-bold text-blue-800 dark:text-sky-400 hover:underline"
                          >
                            Isi Otomatis PIC
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Otomatis terisi sesuai PIC Lembaga..."
                        value={deliveryForm.picName}
                        onChange={e => setDeliveryForm(f => ({ ...f, picName: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      />
                      {selectedInst && (
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {autoPic
                            ? `PIC Lembaga: ${autoPic}${selectedInst.picPhone ? ` (${selectedInst.picPhone})` : ''}`
                            : 'PIC belum diisi di Master Lembaga Penerima Manfaat.'}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Upload Foto Pengiriman: Uji Organoleptik, Serah Terima, Lokasi (+ Kegiatan Opsional) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                  Dokumentasi Bukti Foto Pengiriman
                </span>
                <span className="text-[11px] text-slate-500">Format JPG/PNG/WebP</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    key: 'picOrganolepticPhoto' as const,
                    title: '1. Upload Foto Uji Organoleptik',
                    icon: ClipboardCheck,
                    val: deliveryForm.picOrganolepticPhoto,
                  },
                  {
                    key: 'handoverPhoto' as const,
                    title: '2. Upload Foto Serah Terima',
                    icon: FileCheck,
                    val: deliveryForm.handoverPhoto,
                  },
                  {
                    key: 'locationPhoto' as const,
                    title: '3. Upload Foto Lokasi',
                    icon: MapPin,
                    val: deliveryForm.locationPhoto,
                  },
                  {
                    key: 'activityPhoto' as const,
                    title: '4. Foto Kegiatan (Opsional)',
                    icon: Truck,
                    val: deliveryForm.activityPhoto,
                  },
                ].map(slot => {
                  const SlotIcon = slot.icon;
                  return (
                    <div key={slot.key} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                      <div>
                        <label className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-[11px] mb-1.5">
                          <SlotIcon className="w-3.5 h-3.5 text-blue-900 dark:text-sky-400 shrink-0" />
                          <span>{slot.title}</span>
                        </label>
                        {slot.val ? (
                          <div className="relative group">
                            <img
                              src={slot.val}
                              alt={slot.title}
                              onClick={() => setViewPhotoUrl(slot.val)}
                              className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => setDeliveryForm(f => ({ ...f, [slot.key]: '' }))}
                              title="Hapus Foto"
                              className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-24 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                            <Upload className="w-4 h-4 mb-1" />
                            <span>Belum ada foto</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e, url => setDeliveryForm(f => ({ ...f, [slot.key]: url })))}
                        className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-sky-300"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Catatan Keterangan</label>
              <textarea
                rows={2}
                value={deliveryForm.notes}
                onChange={e => setDeliveryForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeliveryModalOpen(false);
                  setEditingDeliveryId(null);
                }}
                className="px-4 py-2 border rounded-xl dark:border-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                {editingDeliveryId ? 'Simpan Pembaruan Pengiriman' : 'Simpan Pengiriman & Terbitkan BAST'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: TAB D (PENGEMBALIAN OMPRENG KOSONG)         */}
      {/* ========================================================= */}
      {isReturnModalOpen && (
        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title="Input Data Pengembalian Ompreng Kosong"
          maxWidth="xl"
        >
          <form onSubmit={handleSaveReturn} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Tanggal Pengembalian</label>
                <input
                  type="date"
                  required
                  value={returnForm.date}
                  onChange={e => setReturnForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Pilih Lembaga Asal Ompreng</label>
                <select
                  required
                  value={returnForm.institutionId}
                  onChange={e => {
                    const nextInstId = e.target.value;
                    const inst = institutions.find(i => i.id === nextInstId);
                    setReturnForm(f => ({
                      ...f,
                      institutionId: nextInstId,
                      smallPortions: inst?.smallPortions || 0,
                      largePortions: inst?.largePortions || 0,
                      receivedByOfficer: resolveInstitutionPicName(nextInstId),
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.totalPortions} Ompreng • Kecil: {inst.smallPortions}, Besar: {inst.largePortions})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Ompreng Porsi Kecil Kembali</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={returnForm.smallPortions}
                  onChange={e => setReturnForm(f => ({ ...f, smallPortions: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg font-mono dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Ompreng Porsi Besar Kembali</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={returnForm.largePortions}
                  onChange={e => setReturnForm(f => ({ ...f, largePortions: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg font-mono dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Total Ompreng Kembali</label>
                <div className="w-full px-3 py-2 border rounded-lg bg-slate-100 dark:bg-slate-800/70 dark:border-slate-700 font-mono font-bold text-blue-900 dark:text-sky-400">
                  {Number(returnForm.smallPortions || 0) + Number(returnForm.largePortions || 0)} Ompreng
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1">Waktu Keberangkatan Jemput</label>
                <ClassicTimeInput
                  required
                  value={returnForm.departureTime}
                  onChange={val => setReturnForm(f => ({ ...f, departureTime: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Penerimaan di SPPG</label>
                <ClassicTimeInput
                  required
                  value={returnForm.arrivalTime}
                  onChange={val => setReturnForm(f => ({ ...f, arrivalTime: val }))}
                  format="HH:mm WIB"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Petugas Penjemput (Div. Distribusi)</label>
                <select
                  required
                  value={returnForm.driverName}
                  onChange={e => setReturnForm(f => ({ ...f, driverName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                >
                  {distVolunteerOptions.length === 0 && !returnForm.driverName && (
                    <option value="">-- Belum ada relawan Divisi Distribusi --</option>
                  )}
                  {distVolunteerOptions.map(opt => (
                    <option key={opt.volunteer.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {returnForm.driverName &&
                    !distVolunteerOptions.some(o => o.value === returnForm.driverName) && (
                      <option value={returnForm.driverName}>{returnForm.driverName}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Kendaraan</label>
                <input
                  type="text"
                  required
                  value={returnForm.vehicleNumber}
                  onChange={e => setReturnForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                {(() => {
                  const selectedInst = institutions.find(i => i.id === returnForm.institutionId);
                  const autoPic = resolveInstitutionPicName(returnForm.institutionId);
                  const isSynced = Boolean(autoPic && returnForm.receivedByOfficer === autoPic);
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block font-bold">PIC Lembaga</label>
                        {autoPic && !isSynced && (
                          <button
                            type="button"
                            onClick={() => setReturnForm(f => ({ ...f, receivedByOfficer: autoPic }))}
                            className="text-[10px] font-bold text-blue-800 dark:text-sky-400 hover:underline"
                          >
                            Isi Otomatis PIC
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Otomatis terisi sesuai PIC Lembaga..."
                        value={returnForm.receivedByOfficer}
                        onChange={e => setReturnForm(f => ({ ...f, receivedByOfficer: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      />
                      {selectedInst && (
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {autoPic
                            ? `PIC Lembaga: ${autoPic}${selectedInst.picPhone ? ` (${selectedInst.picPhone})` : ''}`
                            : 'PIC belum diisi di Master Lembaga Penerima Manfaat.'}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div>
                <label className="block font-bold mb-1">Status Fisik Ompreng</label>
                <select
                  value={returnForm.conditionStatus}
                  onChange={e => setReturnForm(f => ({ ...f, conditionStatus: e.target.value as OmprengReturnRecord['conditionStatus'] }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="Lengkap & Utuh">Lengkap &amp; Utuh (Sesuai Jumlah Terkirim)</option>
                  <option value="Ada Selisih">Ada Selisih (Tertinggal di Kelas/Perlu Konfirmasi)</option>
                  <option value="Perlu Perbaikan">Perlu Perbaikan (Karet Silikon Rusak/Penyok)</option>
                </select>
              </div>
            </div>

            {/* Upload Foto Pengembalian & Foto Lokasi */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Dokumentasi Bukti Foto Pengembalian Ompreng &amp; Lokasi
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: 'returnHandoverPhoto' as const,
                    title: '1. Upload Foto Pengembalian',
                    icon: RotateCcw,
                    val: returnForm.returnHandoverPhoto,
                  },
                  {
                    key: 'locationPhoto' as const,
                    title: '2. Upload Foto Lokasi',
                    icon: MapPin,
                    val: returnForm.locationPhoto,
                  },
                  {
                    key: 'activityPhoto' as const,
                    title: '3. Foto Pengambilan (Opsional)',
                    icon: Camera,
                    val: returnForm.activityPhoto,
                  },
                ].map(slot => {
                  const SlotIcon = slot.icon;
                  return (
                    <div key={slot.key} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                      <div>
                        <label className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-[11px] mb-1.5">
                          <SlotIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{slot.title}</span>
                        </label>
                        {slot.val ? (
                          <div className="relative">
                            <img
                              src={slot.val}
                              alt={slot.title}
                              onClick={() => setViewPhotoUrl(slot.val)}
                              className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => setReturnForm(f => ({ ...f, [slot.key]: '' }))}
                              title="Hapus Foto"
                              className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-24 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                            <Upload className="w-4 h-4 mb-1" />
                            <span>Belum ada foto</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e, url => setReturnForm(f => ({ ...f, [slot.key]: url })))}
                        className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 dark:file:bg-slate-800 dark:file:text-emerald-300"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Catatan Kondisi Pengembalian</label>
              <textarea
                rows={2}
                value={returnForm.notes}
                onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 border rounded-xl dark:border-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                Simpan Pengembalian Ompreng
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: TAB D (PENGISIAN BBM ARMADA)                  */}
      {/* ========================================================= */}
      {isFuelModalOpen && (
        <Modal
          isOpen={isFuelModalOpen}
          onClose={() => setIsFuelModalOpen(false)}
          title="Input Data Pengisian BBM Armada SPPG"
          maxWidth="md"
        >
          <form onSubmit={handleSaveFuel} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1">Kendaraan / Plat Nomor</label>
              <input
                type="text"
                required
                value={fuelForm.vehicleNumber}
                onChange={e => setFuelForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Nama Pengemudi (Div. Distribusi)</label>
                <select
                  required
                  value={fuelForm.driverName}
                  onChange={e => setFuelForm(f => ({ ...f, driverName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                >
                  {distVolunteerOptions.length === 0 && !fuelForm.driverName && (
                    <option value="">-- Belum ada relawan Divisi Distribusi --</option>
                  )}
                  {distVolunteerOptions.map(opt => (
                    <option key={opt.volunteer.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {fuelForm.driverName &&
                    !distVolunteerOptions.some(o => o.value === fuelForm.driverName) && (
                      <option value={fuelForm.driverName}>{fuelForm.driverName}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Jenis BBM</label>
                <select
                  value={fuelForm.fuelType}
                  onChange={e => setFuelForm(f => ({ ...f, fuelType: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="Dexlite">Dexlite (Diesel Standar Euro 4)</option>
                  <option value="Solar">Solar / Biosolar B35</option>
                  <option value="Pertamax">Pertamax</option>
                  <option value="Pertalite">Pertalite</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Nominal Biaya BBM (Rp)</label>
                <input
                  type="number"
                  required
                  value={fuelForm.nominalCost}
                  onChange={e => setFuelForm(f => ({ ...f, nominalCost: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Volume (Liter)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={fuelForm.volumeLiters}
                  onChange={e => setFuelForm(f => ({ ...f, volumeLiters: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Odometer (KM)</label>
                <input
                  type="number"
                  value={fuelForm.odometerKm}
                  onChange={e => setFuelForm(f => ({ ...f, odometerKm: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Nama SPBU / Lokasi</label>
                <input
                  type="text"
                  value={fuelForm.gasStationName}
                  onChange={e => setFuelForm(f => ({ ...f, gasStationName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="font-bold text-slate-800 dark:text-white block">Upload Bukti Foto:</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">Foto Kegiatan di SPBU</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setFuelForm(f => ({ ...f, activityPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">Foto Struk Pembayaran</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setFuelForm(f => ({ ...f, receiptPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsFuelModalOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                Simpan Log BBM
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT: TAB E (FOOD WASTE CUCI OMPRENG)             */}
      {/* ========================================================= */}
      {isWasteModalOpen && (
        <Modal
          isOpen={isWasteModalOpen}
          onClose={() => {
            setIsWasteModalOpen(false);
            setIsModalWasteSchemaEdit(false);
          }}
          title="Input Audit Sampah Makanan (Food Waste) Cuci Ompreng"
          maxWidth="xl"
        >
          <form onSubmit={handleSaveWaste} className="space-y-4 text-xs">
            <DynamicFormEditToggleBar
              formId="production_waste_form"
              isEditing={isModalWasteSchemaEdit}
              onToggleEdit={() => setIsModalWasteSchemaEdit(v => !v)}
              compact
            />
            {isModalWasteSchemaEdit && (
              <DynamicFormBuilderPanel
                formId="production_waste_form"
                onClose={() => setIsModalWasteSchemaEdit(false)}
              />
            )}

            <DynamicFormRenderer
              schema={dynamicFormSchemas.production_waste_form}
              values={{
                ...wasteForm,
                ...(wasteForm.customFields || {}),
              }}
              dynamicOptions={{
                officerName: washingVolunteerOptions.map(o => ({
                  value: o.value,
                  label: o.label,
                })),
              }}
              excludeKeys={['notes']}
              onChange={(key, value, field) => {
                if (field.isSystem) {
                  setWasteForm(f => ({ ...f, [key]: value }));
                } else {
                  setWasteForm(f => ({
                    ...f,
                    customFields: {
                      ...(f.customFields || {}),
                      [key]: value,
                    },
                  }));
                }
              }}
              onPreviewPhoto={url => setViewPhotoUrl(url)}
              onUploadError={handleUploadError}
            />

            {/* 5 Kategori Food Waste */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Berat Sampah Sisa Makanan ({wasteForm.unit}) & Upload Foto
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Satuan (Master):
                  </label>
                  <select
                    value={wasteForm.unit}
                    onChange={e => setWasteForm(f => ({ ...f, unit: e.target.value }))}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {masterUnits.map(u => (
                      <option key={u.id} value={u.code}>
                        {u.code} — {u.name}
                      </option>
                    ))}
                    {wasteForm.unit && !masterUnits.some(u => u.code === wasteForm.unit) && (
                      <option value={wasteForm.unit}>{wasteForm.unit}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block font-semibold mb-0.5">1. Sisa Nasi</label>
                  <input
                    type="number"
                    step="0.1"
                    value={wasteForm.wasteRice}
                    onChange={e => setWasteForm(f => ({ ...f, wasteRice: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setWasteForm(f => ({ ...f, ricePhoto: url })))}
                    className="w-full text-[10px] mt-1"
                  />
                  {wasteForm.ricePhoto && (
                    <img src={wasteForm.ricePhoto} alt="Preview Sisa Nasi" className="w-full h-14 object-cover rounded-md mt-1 border border-slate-200 dark:border-slate-700" />
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-0.5">2. Sisa Hewani</label>
                  <input
                    type="number"
                    step="0.1"
                    value={wasteForm.wasteAnimal}
                    onChange={e => setWasteForm(f => ({ ...f, wasteAnimal: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setWasteForm(f => ({ ...f, animalPhoto: url })))}
                    className="w-full text-[10px] mt-1"
                  />
                  {wasteForm.animalPhoto && (
                    <img src={wasteForm.animalPhoto} alt="Preview Sisa Hewani" className="w-full h-14 object-cover rounded-md mt-1 border border-slate-200 dark:border-slate-700" />
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-0.5">3. Sisa Nabati</label>
                  <input
                    type="number"
                    step="0.1"
                    value={wasteForm.wastePlant}
                    onChange={e => setWasteForm(f => ({ ...f, wastePlant: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setWasteForm(f => ({ ...f, plantPhoto: url })))}
                    className="w-full text-[10px] mt-1"
                  />
                  {wasteForm.plantPhoto && (
                    <img src={wasteForm.plantPhoto} alt="Preview Sisa Nabati" className="w-full h-14 object-cover rounded-md mt-1 border border-slate-200 dark:border-slate-700" />
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-0.5">4. Sisa Sayur</label>
                  <input
                    type="number"
                    step="0.1"
                    value={wasteForm.wasteVeg}
                    onChange={e => setWasteForm(f => ({ ...f, wasteVeg: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setWasteForm(f => ({ ...f, vegPhoto: url })))}
                    className="w-full text-[10px] mt-1"
                  />
                  {wasteForm.vegPhoto && (
                    <img src={wasteForm.vegPhoto} alt="Preview Sisa Sayur" className="w-full h-14 object-cover rounded-md mt-1 border border-slate-200 dark:border-slate-700" />
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-0.5">5. Sisa Buah</label>
                  <input
                    type="number"
                    step="0.1"
                    value={wasteForm.wasteFruit}
                    onChange={e => setWasteForm(f => ({ ...f, wasteFruit: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setWasteForm(f => ({ ...f, fruitPhoto: url })))}
                    className="w-full text-[10px] mt-1"
                  />
                  {wasteForm.fruitPhoto && (
                    <img src={wasteForm.fruitPhoto} alt="Preview Sisa Buah" className="w-full h-14 object-cover rounded-md mt-1 border border-slate-200 dark:border-slate-700" />
                  )}
                </div>
              </div>
            </div>

            {dynamicFormSchemas.production_waste_form.fields.some(f => f.key === 'notes') && (
              <div>
                <label className="block font-bold mb-1">
                  {dynamicFormSchemas.production_waste_form.fields.find(f => f.key === 'notes')?.label ||
                    'Catatan Evaluasi / Penyebab Sisa Makanan'}
                </label>
                <textarea
                  rows={2}
                  value={wasteForm.notes}
                  onChange={e => setWasteForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={
                    dynamicFormSchemas.production_waste_form.fields.find(f => f.key === 'notes')?.placeholder || ''
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsWasteModalOpen(false);
                  setIsModalWasteSchemaEdit(false);
                }}
                className="px-4 py-2 border rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                Simpan Audit Food Waste
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PREVIEW & CETAK FORMAT BAST RESMI                              */}
      {/* ===================================================================== */}
      {selectedDeliveryForBast && (
        <Modal
          isOpen={Boolean(selectedDeliveryForBast)}
          onClose={() => setSelectedDeliveryForBast(null)}
          title={`Berita Acara Serah Terima (BAST) & Alat Makan`}
          subtitle={`Lembaga: ${selectedDeliveryForBast.institutionName} • No. ${selectedDeliveryForBast.bastNumber}`}
          maxWidth="4xl"
        >
          {(() => {
            const matchedReturn = omprengReturns.find(
              r => r.institutionId === selectedDeliveryForBast.institutionId && r.date === selectedDeliveryForBast.date
            );
            const matchedAtt = beneficiaryAttendance.find(
              a => a.institutionId === selectedDeliveryForBast.institutionId && a.date === selectedDeliveryForBast.date
            );
            const bastData = resolveBastAutoFields({
              institutions,
              beneficiaryAttendance,
              masterVolunteers,
              distributionLogs,
              sppgConfig,
              institutionId: selectedDeliveryForBast.institutionId,
              institutionName: selectedDeliveryForBast.institutionName,
              date: selectedDeliveryForBast.date,
              bastNumber: selectedDeliveryForBast.bastNumber,
              totalPortions: matchedAtt ? matchedAtt.actualPortions : selectedDeliveryForBast.totalPortions,
              picName: selectedDeliveryForBast.picName,
              distributorName: selectedDeliveryForBast.driverName,
              receiveTime: selectedDeliveryForBast.arrivalTime || selectedDeliveryForBast.departureTime,
              returnTime: matchedReturn?.departureTime || '',
            });

            return (
              <div className="space-y-4">
                <BASTDocumentSheet data={bastData} />

                <div className="print:hidden flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedDeliveryForBast(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => exportBastDocumentPDF(bastData)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF BAST</span>
                  </button>
                  <button
                    type="button"
                    onClick={triggerPrint}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Lembar BAST</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL: LIVE CAMERA DOKUMENTASI OMPRENG (LANDSCAPE TRAY-GUIDED CAMERA) */}
      {/* ===================================================================== */}
      <LandscapeTrayCameraModal
        isOpen={Boolean(portioningCameraTarget)}
        onClose={() => setPortioningCameraTarget(null)}
        onCapture={handlePortioningCameraCapture}
        portionLabel={portioningCameraTarget?.portionType === 'small' ? 'Porsi Kecil' : 'Porsi Besar'}
        locationLabel={sppgConfig.sppgName || 'Dapur SPPG TMG2'}
      />
    </div>
  );
};
