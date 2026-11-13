import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { PrintHeader } from '../common/PrintHeader';
import { Modal } from '../common/Modal';
import { DataTable, Column } from '../common/DataTable';
import {
  BASTDocumentSheet,
  resolveBastAutoFields,
  generateBastNumber,
  exportBastDocumentPDF,
} from '../common/BASTDocumentSheet';
import {
  FacilityTempReportPanel,
  FacilityTempModalGrid,
  FacilityPhotoKey,
  processFacilityImageUpload,
  getFacilityTempValue,
  applyFacilityPhotoPatch,
} from '../common/FacilityTempUploadSection';
import { formatNumber, formatRupiah, formatIndonesianDate, triggerPrint } from '../../lib/exportUtils';
import { monthlyWasteSummary, defaultFacilityTemperatures } from '../../lib/productionData';
import {
  PreparationInspectionRecord,
  CookingInspectionRecord,
  PortioningInspectionRecord,
  DistributionDeliveryRecord,
  OmprengReturnRecord,
  FuelLogRecord,
  WashingWasteRecord,
  FacilityTemperatures,
} from '../../types';
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
    distributionLogs,
    kitchenProgress,
    updateKitchenProgress,
    currentUser,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ProductionTab>('prep');

  // Modals state
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [isCookingModalOpen, setIsCookingModalOpen] = useState(false);
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

  // Direct Upload Foto from Suhu Ruang & 6 Pendingin report cards across all 5 divisions
  const handleDirectFacilityPhotoUpload = async (
    division: ProductionTab,
    photoKey: FacilityPhotoKey,
    dataUrl: string,
    unitLabel: string
  ) => {
    if (division === 'prep' && prepRecords[0]) {
      const nextTemps: FacilityTemperatures = applyFacilityPhotoPatch(
        prepRecords[0].facilityTemps,
        photoKey,
        dataUrl
      );
      await updatePrepRecord(prepRecords[0].id, { facilityTemps: nextTemps });
      addToast('success', 'Foto Terupload', `Foto ${unitLabel} (Divisi Persiapan) berhasil disimpan.`);
      return;
    }
    if (division === 'cooking' && cookingRecords[0]) {
      const nextTemps: FacilityTemperatures = applyFacilityPhotoPatch(
        cookingRecords[0].facilityTemps,
        photoKey,
        dataUrl
      );
      await updateCookingRecord(cookingRecords[0].id, { facilityTemps: nextTemps });
      addToast('success', 'Foto Terupload', `Foto ${unitLabel} (Divisi Pengolahan) berhasil disimpan.`);
      return;
    }
    if (division === 'portioning' && portioningRecords[0]) {
      const nextTemps: FacilityTemperatures = applyFacilityPhotoPatch(
        portioningRecords[0].facilityTemps,
        photoKey,
        dataUrl
      );
      await updatePortioningRecord(portioningRecords[0].id, { facilityTemps: nextTemps });
      addToast('success', 'Foto Terupload', `Foto ${unitLabel} (Divisi Pemorsian) berhasil disimpan.`);
      return;
    }
    if (division === 'distribution' && distributionDeliveries[0]) {
      const currentTemps = distributionDeliveries[0].facilityTemps || defaultFacilityTemperatures;
      const nextTemps: FacilityTemperatures = applyFacilityPhotoPatch(
        currentTemps,
        photoKey,
        dataUrl
      );
      await updateDistributionDelivery(distributionDeliveries[0].id, { facilityTemps: nextTemps });
      addToast('success', 'Foto Terupload', `Foto ${unitLabel} (Divisi Distribusi & Armada) berhasil disimpan.`);
    }
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
    // Suhu Ruang Pemorsian, Pengolahan, Gudang Basah/Kering & 6 Pendingin
    facilityTemps: {
      ...defaultFacilityTemperatures,
      prepRoomTemp: 21.0,
      portioningRoomTemp: 21.0,
      cookingRoomTemp: 25.5,
      wetWarehouseTemp: 14.0,
      dryWarehouseTemp: 22.8,
    } as FacilityTemperatures,
    notes: 'Pembersihan dan sortir bahan segar batch subuh. Suhu seluruh chiller dan freezer dalam batas standar CCP.',
  });

  const handleSavePrep = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPrepRecord({
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
      facilityTemps: {
        ...prepForm.facilityTemps,
      },
      notes: prepForm.notes,
    });
    setIsPrepModalOpen(false);
  };

  // -------------------------------------------------------------
  // TAB B: Form State Divisi Pengolahan
  // -------------------------------------------------------------
  const [cookingForm, setCookingForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '06:15 WIB',
    officerName: 'Chef Wahyu Ramadhan & Tim Pengolahan',
    riceTemp: 84.5,
    ricePhoto: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=500&q=80',
    animalTemp: 82.0,
    animalPhoto: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=80',
    plantTemp: 78.5,
    plantPhoto: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
    vegTemp: 76.2,
    vegPhoto: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=80',
    fruitTemp: 18.0,
    fruitPhoto: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
    // Suhu Ruang & 6 Pendingin
    facilityTemps: {
      ...defaultFacilityTemperatures,
      cookingRoomTemp: 27.0,
      freezer1Temp: -19.2,
      freezer2Temp: -20.0,
      fridge1Temp: 5.0,
      fridge2Temp: 6.0,
      fridge3Temp: 5.2,
      fridge4Temp: 4.1,
    },
    notes: 'Pemasakan inti daging ayam di atas 75°C. Minyak goreng jernih. Organoleptik aroma harum alami tanpa MSG berlebih.',
  });

  const handleSaveCooking = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCookingRecord({
      date: cookingForm.date,
      time: cookingForm.time,
      officerName: cookingForm.officerName,
      cookedFoods: {
        rice: { temp: Number(cookingForm.riceTemp), photoUrl: cookingForm.ricePhoto },
        animalProtein: { temp: Number(cookingForm.animalTemp), photoUrl: cookingForm.animalPhoto },
        plantProtein: { temp: Number(cookingForm.plantTemp), photoUrl: cookingForm.plantPhoto },
        vegetable: { temp: Number(cookingForm.vegTemp), photoUrl: cookingForm.vegPhoto },
        fruit: { temp: Number(cookingForm.fruitTemp), photoUrl: cookingForm.fruitPhoto },
      },
      facilityTemps: {
        ...cookingForm.facilityTemps,
      },
      notes: cookingForm.notes,
    });
    setIsCookingModalOpen(false);
  };

  // -------------------------------------------------------------
  // TAB C: Form State Divisi Pemorsian
  // -------------------------------------------------------------
  const [portioningForm, setPortioningForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '07:00 WIB',
    portioningTime: '06:45 - 07:30 WIB',
    officerName: 'Nurul Hidayah & Tim Pemorsian',
    riceTemp: 72.0,
    animalTemp: 71.5,
    plantTemp: 68.0,
    vegTemp: 67.5,
    fruitTemp: 18.0,
    facilityTemps: {
      ...defaultFacilityTemperatures,
      prepRoomTemp: 22.0,
      portioningRoomTemp: 22.0,
      cookingRoomTemp: 26.5,
      wetWarehouseTemp: 14.2,
      dryWarehouseTemp: 23.2,
    } as FacilityTemperatures,
    smallPortionGrams: 395,
    largePortionGrams: 585,
    smallPhoto: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
    largePhoto: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=500&q=80',
    notes: 'Pemorsian menggunakan ompreng stainless steril bersegel silikon. Gramasi ditimbang teliti sampling per 25 boks.',
  });

  const handleSavePortioning = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPortioningRecord({
      date: portioningForm.date,
      time: portioningForm.time,
      portioningTime: portioningForm.portioningTime,
      officerName: portioningForm.officerName,
      foodTemps: {
        rice: { temp: Number(portioningForm.riceTemp) },
        animalProtein: { temp: Number(portioningForm.animalTemp) },
        plantProtein: { temp: Number(portioningForm.plantTemp) },
        vegetable: { temp: Number(portioningForm.vegTemp) },
        fruit: { temp: Number(portioningForm.fruitTemp) },
      },
      facilityTemps: {
        ...portioningForm.facilityTemps,
      },
      smallPortionWeightGrams: Number(portioningForm.smallPortionGrams),
      largePortionWeightGrams: Number(portioningForm.largePortionGrams),
      smallPortionPhoto: portioningForm.smallPhoto,
      largePortionPhoto: portioningForm.largePhoto,
      notes: portioningForm.notes,
    });
    setIsPortioningModalOpen(false);
  };

  // -------------------------------------------------------------
  // TAB D: Form State Divisi Distribusi & Armada
  // -------------------------------------------------------------
  const [deliveryForm, setDeliveryForm] = useState({
    institutionId: institutions[0]?.id || '',
    departureTime: '08:15 WIB',
    arrivalTime: '08:35 WIB',
    driverName: 'Agus Santoso',
    vehicleNumber: 'N 8921 RA (Armada Box Isothermal 1)',
    activityPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=500&q=80',
    handoverPhoto: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=500&q=80',
    picOrganolepticPhoto: 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?auto=format&fit=crop&w=500&q=80',
    facilityTemps: {
      ...defaultFacilityTemperatures,
    },
    notes: 'Boks termal tersegel rapi, suhu tiba 64.5°C, uji organoleptik PIC disetujui.',
  });

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutions.find(i => i.id === deliveryForm.institutionId) || institutions[0];
    const todayStr = new Date().toISOString().slice(0, 10);
    const bastNumber = generateBastNumber(191 + distributionDeliveries.length + 1, todayStr);
    await addDistributionDelivery({
      date: todayStr,
      institutionId: inst.id,
      institutionName: inst.name,
      smallPortions: inst.smallPortions,
      largePortions: inst.largePortions,
      totalPortions: inst.totalPortions,
      departureTime: deliveryForm.departureTime,
      arrivalTime: deliveryForm.arrivalTime,
      driverName: deliveryForm.driverName,
      vehicleNumber: deliveryForm.vehicleNumber,
      activityPhoto: deliveryForm.activityPhoto,
      handoverPhoto: deliveryForm.handoverPhoto,
      picOrganolepticPhoto: deliveryForm.picOrganolepticPhoto,
      bastNumber,
      picName: inst.picName || 'Kepala Sekolah',
      status: 'Selesai Serah Terima',
      facilityTemps: { ...deliveryForm.facilityTemps },
      notes: deliveryForm.notes,
    });
    setIsDeliveryModalOpen(false);
  };

  const [returnForm, setReturnForm] = useState({
    institutionId: institutions[0]?.id || '',
    departureTime: '12:30 WIB',
    arrivalTime: '13:05 WIB',
    driverName: 'Agus Santoso',
    vehicleNumber: 'N 8921 RA',
    activityPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=500&q=80',
    returnHandoverPhoto: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=500&q=80',
    conditionStatus: 'Lengkap & Utuh' as 'Lengkap & Utuh' | 'Ada Selisih' | 'Perlu Perbaikan',
    notes: 'Seluruh ompreng stainless kembali utuh dan siap disterilisasi.',
  });

  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutions.find(i => i.id === returnForm.institutionId) || institutions[0];
    await addOmprengReturn({
      date: new Date().toISOString().slice(0, 10),
      institutionId: inst.id,
      institutionName: inst.name,
      smallPortions: inst.smallPortions,
      largePortions: inst.largePortions,
      totalPortions: inst.totalPortions,
      departureTime: returnForm.departureTime,
      arrivalTime: returnForm.arrivalTime,
      driverName: returnForm.driverName,
      vehicleNumber: returnForm.vehicleNumber,
      activityPhoto: returnForm.activityPhoto,
      returnHandoverPhoto: returnForm.returnHandoverPhoto,
      receivedByOfficer: 'Fahrur Rozi (Div. Cuci Ompreng)',
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
  });

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
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
    });
    setIsWasteModalOpen(false);
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
      <PrintHeader
        title="LEMBAR KENDALI OPERASIONAL DAN PRODUKSI DAPUR MBG"
        subtitle="Divisi Persiapan, Pengolahan, Pemorsian, Distribusi & Cuci Ompreng (Sanitasi Food Waste)"
        docNumber="BAP-PROD/SPPG-TMG2/2026/XI/009"
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Modul Produksi dan Operasional Dapur
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Satuan Pelayanan Pemenuhan Gizi: <strong>{sppgConfig.sppgName}</strong> (ID: {sppgConfig.sppgId})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={triggerPrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak BAP Operasional</span>
          </button>
        </div>
      </div>

      {/* 5-Division Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('prep')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'prep'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>A. Divisi Persiapan</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {prepRecords.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cooking')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'cooking'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <CookingPot className="w-4 h-4" />
          <span>B. Divisi Pengolahan</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {cookingRecords.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('portioning')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'portioning'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>C. Divisi Pemorsian</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {portioningRecords.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('distribution')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'distribution'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>D. Divisi Distribusi & Armada</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {distributionDeliveries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('washing')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeTab === 'washing'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>E. Divisi Cuci & Food Waste</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {washingWasteRecords.length}
          </span>
        </button>
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
                Standar CCP & Inspeksi Bahan Rusak Divisi Persiapan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan suhu & foto bahan rusak (sayur, lauk hewani, buah) serta suhu Ruang Pemorsian, Pengolahan, Gudang Basah, Gudang Kering & 6 unit pendingin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrepModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Input Data & Foto Persiapan</span>
            </button>
          </div>

          {/* Latest Facility Temps Card (Suhu Ruang & 6 Pendingin + Upload Foto) */}
          {prepRecords[0] && (
            <FacilityTempReportPanel
              divisionLabel="Divisi Persiapan"
              subtitleMeta={`Pemeriksaan Terakhir: ${prepRecords[0].date} ${prepRecords[0].time} • Petugas: ${prepRecords[0].officerName}`}
              facilityTemps={prepRecords[0].facilityTemps}
              onUploadUnitPhoto={(photoKey, url, label) =>
                handleDirectFacilityPhotoUpload('prep', photoKey, url, label)
              }
              onViewPhoto={setViewPhotoUrl}
              onOpenInputModal={() => setIsPrepModalOpen(true)}
              onUploadError={handleUploadError}
            />
          )}

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
                      <div className="font-mono text-[11px] text-blue-900 dark:text-sky-400">
                        R. Pemorsian: {getFacilityTempValue(r.facilityTemps, 'portioningRoomTemp')}°C | G. Basah: {getFacilityTempValue(r.facilityTemps, 'wetWarehouseTemp')}°C | G. Kering: {getFacilityTempValue(r.facilityTemps, 'dryWarehouseTemp')}°C | F1: {r.facilityTemps.freezer1Temp}°C
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
      {activeTab === 'cooking' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CookingPot className="w-4 h-4 text-amber-600" />
                Standar CCP Suhu Matang Masakan & Ruangan Pengolahan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan suhu & foto masakan matang (Nasi, Hewani, Nabati, Sayur, Buah) serta suhu Ruang Pemorsian, Pengolahan, Gudang Basah, Gudang Kering & 6 pendingin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCookingModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Input Data & Foto Pengolahan</span>
            </button>
          </div>

          {/* 5 Cooked Food Temperature Cards with Photos */}
          {cookingRecords[0] && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Rice */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800 dark:text-slate-200">1. Suhu Nasi Matang</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      CCP Aman
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600">
                    {cookingRecords[0].cookedFoods.rice.temp}°C
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Standar BGN: Inti steam &gt; 75°C</p>
                </div>
                {cookingRecords[0].cookedFoods.rice.photoUrl && (
                  <div className="mt-3">
                    <img
                      src={cookingRecords[0].cookedFoods.rice.photoUrl}
                      alt="Suhu Nasi"
                      onClick={() => setViewPhotoUrl(cookingRecords[0].cookedFoods.rice.photoUrl || null)}
                      className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Animal Protein */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800 dark:text-slate-200">2. Lauk Hewani</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      CCP Aman
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600">
                    {cookingRecords[0].cookedFoods.animalProtein.temp}°C
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Ayam Fillet Saus Madu (&gt; 75°C)</p>
                </div>
                {cookingRecords[0].cookedFoods.animalProtein.photoUrl && (
                  <div className="mt-3">
                    <img
                      src={cookingRecords[0].cookedFoods.animalProtein.photoUrl}
                      alt="Suhu Hewani"
                      onClick={() => setViewPhotoUrl(cookingRecords[0].cookedFoods.animalProtein.photoUrl || null)}
                      className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Plant Protein */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800 dark:text-slate-200">3. Lauk Nabati</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      CCP Aman
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600">
                    {cookingRecords[0].cookedFoods.plantProtein.temp}°C
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Tempe Bacem Gurih Karamel</p>
                </div>
                {cookingRecords[0].cookedFoods.plantProtein.photoUrl && (
                  <div className="mt-3">
                    <img
                      src={cookingRecords[0].cookedFoods.plantProtein.photoUrl}
                      alt="Suhu Nabati"
                      onClick={() => setViewPhotoUrl(cookingRecords[0].cookedFoods.plantProtein.photoUrl || null)}
                      className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Vegetable */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800 dark:text-slate-200">4. Sayur Sop</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      CCP Aman
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600">
                    {cookingRecords[0].cookedFoods.vegetable.temp}°C
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Kuah Kaldu Sayur Segar</p>
                </div>
                {cookingRecords[0].cookedFoods.vegetable.photoUrl && (
                  <div className="mt-3">
                    <img
                      src={cookingRecords[0].cookedFoods.vegetable.photoUrl}
                      alt="Suhu Sayur"
                      onClick={() => setViewPhotoUrl(cookingRecords[0].cookedFoods.vegetable.photoUrl || null)}
                      className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Fruit */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800 dark:text-slate-200">5. Suhu Buah</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                      Segar
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-blue-900 dark:text-sky-400">
                    {cookingRecords[0].cookedFoods.fruit.temp}°C
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Pisang Cavendish Standar</p>
                </div>
                {cookingRecords[0].cookedFoods.fruit.photoUrl && (
                  <div className="mt-3">
                    <img
                      src={cookingRecords[0].cookedFoods.fruit.photoUrl}
                      alt="Suhu Buah"
                      onClick={() => setViewPhotoUrl(cookingRecords[0].cookedFoods.fruit.photoUrl || null)}
                      className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Facility Cold & Room Temps in Cooking (Suhu Ruang & 6 Pendingin + Upload Foto) */}
          {cookingRecords[0] && (
            <FacilityTempReportPanel
              divisionLabel="Divisi Pengolahan"
              subtitleMeta={`Waktu: ${cookingRecords[0].date} ${cookingRecords[0].time} • Petugas: ${cookingRecords[0].officerName}`}
              facilityTemps={cookingRecords[0].facilityTemps}
              onUploadUnitPhoto={(photoKey, url, label) =>
                handleDirectFacilityPhotoUpload('cooking', photoKey, url, label)
              }
              onViewPhoto={setViewPhotoUrl}
              onOpenInputModal={() => setIsCookingModalOpen(true)}
              onUploadError={handleUploadError}
            />
          )}
        </div>
      )}

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
                Sampling gramasi porsi kecil vs porsi besar, suhu makanan saat di-seal, dokumentasi foto ompreng lengkap, serta suhu Ruang Pemorsian, Pengolahan, Gudang Basah, Gudang Kering & 6 pendingin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPortioningModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Input Data & Foto Pemorsian</span>
            </button>
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

                {portioningRecords[0].smallPortionPhoto && (
                  <div className="mt-4">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> Foto Ompreng Porsi Kecil:
                    </div>
                    <img
                      src={portioningRecords[0].smallPortionPhoto}
                      alt="Foto Ompreng Porsi Kecil"
                      onClick={() => setViewPhotoUrl(portioningRecords[0].smallPortionPhoto || null)}
                      className="w-full h-44 object-cover rounded-xl cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
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

                {portioningRecords[0].largePortionPhoto && (
                  <div className="mt-4">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> Foto Ompreng Porsi Besar:
                    </div>
                    <img
                      src={portioningRecords[0].largePortionPhoto}
                      alt="Foto Ompreng Porsi Besar"
                      onClick={() => setViewPhotoUrl(portioningRecords[0].largePortionPhoto || null)}
                      className="w-full h-44 object-cover rounded-xl cursor-pointer hover:opacity-90 transition border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Holding & Portioning Temps */}
          {portioningRecords[0] && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Suhu Makanan Saat Masuk Ompreng & Fasilitas Ruangan
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
          )}

          {/* Facility Cold & Room Temps in Portioning (Suhu Ruang & 6 Pendingin + Upload Foto) */}
          {portioningRecords[0] && (
            <FacilityTempReportPanel
              divisionLabel="Divisi Pemorsian"
              subtitleMeta={`Tanggal: ${portioningRecords[0].date} (${portioningRecords[0].time}) • Petugas: ${portioningRecords[0].officerName}`}
              facilityTemps={portioningRecords[0].facilityTemps}
              onUploadUnitPhoto={(photoKey, url, label) =>
                handleDirectFacilityPhotoUpload('portioning', photoKey, url, label)
              }
              onViewPhoto={setViewPhotoUrl}
              onOpenInputModal={() => setIsPortioningModalOpen(true)}
              onUploadError={handleUploadError}
            />
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
                Pengiriman makanan hangat ber-BAST, penjemputan ompreng kotor kembali ke SPPG, dan pembukuan BBM armada.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Kirim Porsi & BAST</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>+ Kembalian Ompreng</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFuelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>+ Log BBM</span>
              </button>
            </div>
          </div>

          {/* Facility Cold & Room Temps in Distribution (Suhu Ruang & 6 Pendingin + Upload Foto) */}
          {distributionDeliveries[0] && (
            <FacilityTempReportPanel
              divisionLabel="Divisi Distribusi & Armada"
              subtitleMeta={`Log Rute Terakhir: ${distributionDeliveries[0].date} • ${distributionDeliveries[0].institutionName} (${distributionDeliveries[0].driverName})`}
              facilityTemps={distributionDeliveries[0].facilityTemps}
              onUploadUnitPhoto={(photoKey, url, label) =>
                handleDirectFacilityPhotoUpload('distribution', photoKey, url, label)
              }
              onViewPhoto={setViewPhotoUrl}
              onOpenInputModal={() => setIsDeliveryModalOpen(true)}
              onUploadError={handleUploadError}
            />
          )}

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

                      <div className="text-xs text-slate-500 flex items-center gap-3">
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

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDeliveryForBast(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-900 dark:text-sky-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 transition"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Lihat / Cetak Format BAST</span>
                        </button>
                      </div>
                    </div>

                    {/* Photos Preview */}
                    <div className="flex items-center gap-2">
                      {d.activityPhoto && (
                        <div className="text-center">
                          <img
                            src={d.activityPhoto}
                            alt="Distribusi"
                            onClick={() => setViewPhotoUrl(d.activityPhoto || null)}
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                          <span className="text-[10px] text-slate-400 block mt-0.5">Kegiatan</span>
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
                          <span className="text-[10px] text-slate-400 block mt-0.5">BAST Fisik</span>
                        </div>
                      )}
                      {d.picOrganolepticPhoto && (
                        <div className="text-center">
                          <img
                            src={d.picOrganolepticPhoto}
                            alt="Organoleptik PIC"
                            onClick={() => setViewPhotoUrl(d.picOrganolepticPhoto || null)}
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                          <span className="text-[10px] text-slate-400 block mt-0.5">Uji PIC</span>
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
                  <div key={ret.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{ret.institutionName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Kembali: <strong>{ret.totalPortions} Ompreng</strong> (Kecil: {ret.smallPortions}, Besar: {ret.largePortions})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Driver: {ret.driverName} • Tiba SPPG: {ret.arrivalTime}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {ret.conditionStatus}
                        </span>
                        {ret.returnHandoverPhoto && (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(ret.returnHandoverPhoto || null)}
                            className="block text-[10px] text-blue-900 dark:text-sky-400 hover:underline mt-2"
                          >
                            Lihat Foto Serah Terima
                          </button>
                        )}
                      </div>
                    </div>
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
              onClick={() => setIsWasteModalOpen(true)}
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

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                <strong>Catatan Evaluasi Sisa:</strong> {washingWasteRecords[0].notes}
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
          onClose={() => setIsPrepModalOpen(false)}
          title="Input Data Inspeksi Bahan Rusak & Suhu Divisi Persiapan"
          maxWidth="xl"
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
                <input
                  type="text"
                  required
                  value={prepForm.time}
                  onChange={e => setPrepForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Nama Petugas Pemeriksa</label>
                <input
                  type="text"
                  required
                  value={prepForm.officerName}
                  onChange={e => setPrepForm(f => ({ ...f, officerName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Bahan Rusak 3 Kategori */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/40">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Data & Foto Bahan Rusak (Sayur, Lauk Hewani, Buah)
              </span>

              {/* Sayur */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
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
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Jumlah Rusak ({prepForm.vegUnit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.vegQty}
                    onChange={e => setPrepForm(f => ({ ...f, vegQty: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
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
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
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
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Jumlah Rusak ({prepForm.animalUnit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.animalQty}
                    onChange={e => setPrepForm(f => ({ ...f, animalQty: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
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
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
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
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-0.5">Jumlah Rusak ({prepForm.fruitUnit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={prepForm.fruitQty}
                    onChange={e => setPrepForm(f => ({ ...f, fruitQty: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono"
                  />
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

            {/* Suhu Ruangan & 6 Pendingin + Upload Foto */}
            <FacilityTempModalGrid
              divisionLabel="Divisi Persiapan"
              value={prepForm.facilityTemps}
              onChange={ft => setPrepForm(f => ({ ...f, facilityTemps: ft }))}
              onViewPhoto={setViewPhotoUrl}
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
          onClose={() => setIsCookingModalOpen(false)}
          title="Input Data Suhu Makanan Matang & Fasilitas Divisi Pengolahan"
          maxWidth="xl"
        >
          <form onSubmit={handleSaveCooking} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <input
                  type="text"
                  required
                  value={cookingForm.time}
                  onChange={e => setCookingForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Nama Petugas Pemeriksa</label>
                <input
                  type="text"
                  required
                  value={cookingForm.officerName}
                  onChange={e => setCookingForm(f => ({ ...f, officerName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Suhu Makanan Matang 5 Jenis */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/40">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <CookingPot className="w-4 h-4 text-amber-500" />
                Input Suhu & Upload Foto Makanan Matang (Standar Inti &gt; 75°C)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {/* Nasi */}
                <div>
                  <label className="block font-semibold mb-1">1. Suhu Nasi (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cookingForm.riceTemp}
                    onChange={e => setCookingForm(f => ({ ...f, riceTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setCookingForm(f => ({ ...f, ricePhoto: url })))}
                    className="w-full text-[10px] mt-1.5"
                  />
                </div>

                {/* Hewani */}
                <div>
                  <label className="block font-semibold mb-1">2. Lauk Hewani (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cookingForm.animalTemp}
                    onChange={e => setCookingForm(f => ({ ...f, animalTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setCookingForm(f => ({ ...f, animalPhoto: url })))}
                    className="w-full text-[10px] mt-1.5"
                  />
                </div>

                {/* Nabati */}
                <div>
                  <label className="block font-semibold mb-1">3. Lauk Nabati (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cookingForm.plantTemp}
                    onChange={e => setCookingForm(f => ({ ...f, plantTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setCookingForm(f => ({ ...f, plantPhoto: url })))}
                    className="w-full text-[10px] mt-1.5"
                  />
                </div>

                {/* Sayur */}
                <div>
                  <label className="block font-semibold mb-1">4. Suhu Sayur (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cookingForm.vegTemp}
                    onChange={e => setCookingForm(f => ({ ...f, vegTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setCookingForm(f => ({ ...f, vegPhoto: url })))}
                    className="w-full text-[10px] mt-1.5"
                  />
                </div>

                {/* Buah */}
                <div>
                  <label className="block font-semibold mb-1">5. Suhu Buah (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cookingForm.fruitTemp}
                    onChange={e => setCookingForm(f => ({ ...f, fruitTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg font-mono dark:bg-slate-800"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setCookingForm(f => ({ ...f, fruitPhoto: url })))}
                    className="w-full text-[10px] mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Suhu Ruang & 6 Pendingin + Upload Foto */}
            <FacilityTempModalGrid
              divisionLabel="Divisi Pengolahan"
              value={cookingForm.facilityTemps}
              onChange={ft => setCookingForm(f => ({ ...f, facilityTemps: ft }))}
              onViewPhoto={setViewPhotoUrl}
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
                onClick={() => setIsCookingModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                Simpan Log Divisi Pengolahan
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
          onClose={() => setIsPortioningModalOpen(false)}
          title="Input Data Gramasi & Suhu Divisi Pemorsian"
          maxWidth="xl"
        >
          <form onSubmit={handleSavePortioning} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                <input
                  type="text"
                  required
                  value={portioningForm.time}
                  onChange={e => setPortioningForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Pemorsian</label>
                <input
                  type="text"
                  required
                  value={portioningForm.portioningTime}
                  onChange={e => setPortioningForm(f => ({ ...f, portioningTime: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Nama Petugas</label>
                <input
                  type="text"
                  required
                  value={portioningForm.officerName}
                  onChange={e => setPortioningForm(f => ({ ...f, officerName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Gramasi & Foto Ompreng */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-600" />
                Penimbangan Sampling Gramasi & Upload Foto Ompreng
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Porsi Kecil */}
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Porsi Kecil (Target 380-410g)</span>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      step="1"
                      value={portioningForm.smallPortionGrams}
                      onChange={e => setPortioningForm(f => ({ ...f, smallPortionGrams: Number(e.target.value) }))}
                      className="w-32 px-2 py-1.5 border rounded font-mono font-bold dark:bg-slate-800"
                    />
                    <span className="text-slate-500 font-bold">gram</span>
                  </div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">Upload Foto Ompreng Porsi Kecil:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setPortioningForm(f => ({ ...f, smallPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>

                {/* Porsi Besar */}
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Porsi Besar (Target 560-600g)</span>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      step="1"
                      value={portioningForm.largePortionGrams}
                      onChange={e => setPortioningForm(f => ({ ...f, largePortionGrams: Number(e.target.value) }))}
                      className="w-32 px-2 py-1.5 border rounded font-mono font-bold dark:bg-slate-800"
                    />
                    <span className="text-slate-500 font-bold">gram</span>
                  </div>
                  <label className="block text-slate-500 text-[11px] mb-0.5">Upload Foto Ompreng Porsi Besar:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setPortioningForm(f => ({ ...f, largePhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
              </div>
            </div>

            {/* Suhu Makanan Saat Pemorsian */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                Suhu Makanan Saat Di-seal Masuk Ompreng (°C)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-slate-500 text-[11px]">Suhu Nasi</label>
                  <input
                    type="number"
                    step="0.1"
                    value={portioningForm.riceTemp}
                    onChange={e => setPortioningForm(f => ({ ...f, riceTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border rounded dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px]">Lauk Hewani</label>
                  <input
                    type="number"
                    step="0.1"
                    value={portioningForm.animalTemp}
                    onChange={e => setPortioningForm(f => ({ ...f, animalTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border rounded dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px]">Lauk Nabati</label>
                  <input
                    type="number"
                    step="0.1"
                    value={portioningForm.plantTemp}
                    onChange={e => setPortioningForm(f => ({ ...f, plantTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border rounded dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px]">Sayur Sop</label>
                  <input
                    type="number"
                    step="0.1"
                    value={portioningForm.vegTemp}
                    onChange={e => setPortioningForm(f => ({ ...f, vegTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border rounded dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px]">Suhu Buah</label>
                  <input
                    type="number"
                    step="0.1"
                    value={portioningForm.fruitTemp}
                    onChange={e => setPortioningForm(f => ({ ...f, fruitTemp: Number(e.target.value) }))}
                    className="w-full px-2 py-1 border rounded dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Suhu Ruang & 6 Pendingin + Upload Foto */}
            <FacilityTempModalGrid
              divisionLabel="Divisi Pemorsian"
              value={portioningForm.facilityTemps}
              onChange={ft => setPortioningForm(f => ({ ...f, facilityTemps: ft }))}
              onViewPhoto={setViewPhotoUrl}
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
          onClose={() => setIsDeliveryModalOpen(false)}
          title="Input Distribusi Pengiriman Makanan MBG & BAST"
          maxWidth="xl"
        >
          <form onSubmit={handleSaveDelivery} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1">Pilih Lembaga Penerima Manfaat</label>
              <select
                required
                value={deliveryForm.institutionId}
                onChange={e => setDeliveryForm(f => ({ ...f, institutionId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.totalPortions} Porsi • Kecil: {inst.smallPortions}, Besar: {inst.largePortions})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Waktu Keberangkatan</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.departureTime}
                  onChange={e => setDeliveryForm(f => ({ ...f, departureTime: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Penerimaan di Sekolah</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.arrivalTime}
                  onChange={e => setDeliveryForm(f => ({ ...f, arrivalTime: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Petugas Distribusi (Driver/Kru)</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.driverName}
                  onChange={e => setDeliveryForm(f => ({ ...f, driverName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Kendaraan / Plat Nomor</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.vehicleNumber}
                  onChange={e => setDeliveryForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Upload 3 Foto: Kegiatan, Serah Terima BAST, Uji Organoleptik PIC */}
            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="font-bold text-slate-800 dark:text-white block">
                Dokumentasi Wajib Foto Lapangan:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">1. Foto Kegiatan Distribusi</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setDeliveryForm(f => ({ ...f, activityPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">2. Foto Serah Terima BAST</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setDeliveryForm(f => ({ ...f, handoverPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">3. Foto Uji Organoleptik PIC</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setDeliveryForm(f => ({ ...f, picOrganolepticPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
              </div>
            </div>

            {/* Suhu Ruang & 6 Pendingin + Upload Foto */}
            <FacilityTempModalGrid
              divisionLabel="Divisi Distribusi & Armada"
              value={deliveryForm.facilityTemps}
              onChange={ft => setDeliveryForm(f => ({ ...f, facilityTemps: ft }))}
              onViewPhoto={setViewPhotoUrl}
              onUploadError={handleUploadError}
            />

            <div>
              <label className="block font-bold mb-1">Catatan Keterangan</label>
              <textarea
                rows={2}
                value={deliveryForm.notes}
                onChange={e => setDeliveryForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                Simpan & Terbitkan BAST
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
          title="Input Pengembalian Ompreng Kosong dari Sekolah"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveReturn} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1">Pilih Lembaga Asal Ompreng</label>
              <select
                required
                value={returnForm.institutionId}
                onChange={e => setReturnForm(f => ({ ...f, institutionId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.totalPortions} Ompreng • Kecil: {inst.smallPortions}, Besar: {inst.largePortions})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Waktu Keberangkatan Jemput</label>
                <input
                  type="text"
                  required
                  value={returnForm.departureTime}
                  onChange={e => setReturnForm(f => ({ ...f, departureTime: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Penerimaan di SPPG</label>
                <input
                  type="text"
                  required
                  value={returnForm.arrivalTime}
                  onChange={e => setReturnForm(f => ({ ...f, arrivalTime: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Petugas Distribusi</label>
                <input
                  type="text"
                  required
                  value={returnForm.driverName}
                  onChange={e => setReturnForm(f => ({ ...f, driverName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Kendaraan</label>
                <input
                  type="text"
                  required
                  value={returnForm.vehicleNumber}
                  onChange={e => setReturnForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="font-bold text-slate-800 dark:text-white block">Dokumentasi Serah Terima Kembali:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">Upload Foto Kegiatan Pengambilan</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setReturnForm(f => ({ ...f, activityPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">Upload Foto Serah Terima Kembali</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, url => setReturnForm(f => ({ ...f, returnHandoverPhoto: url })))}
                    className="w-full text-[10px]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Status Fisik Ompreng</label>
              <select
                value={returnForm.conditionStatus}
                onChange={e => setReturnForm(f => ({ ...f, conditionStatus: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              >
                <option value="Lengkap & Utuh">Lengkap & Utuh (Sesuai Jumlah Terkirim)</option>
                <option value="Ada Selisih">Ada Selisih (Tertinggal di Kelas/Perlu Konfirmasi)</option>
                <option value="Perlu Perbaikan">Perlu Perbaikan (Karet Silikon Rusak/Penyok)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                Simpan Log Pengembalian
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
                <label className="block font-bold mb-1">Nama Pengemudi</label>
                <input
                  type="text"
                  required
                  value={fuelForm.driverName}
                  onChange={e => setFuelForm(f => ({ ...f, driverName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
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
          onClose={() => setIsWasteModalOpen(false)}
          title="Input Audit Sampah Makanan (Food Waste) Cuci Ompreng"
          maxWidth="xl"
        >
          <form onSubmit={handleSaveWaste} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={wasteForm.date}
                  onChange={e => setWasteForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Waktu Pemeriksaan</label>
                <input
                  type="text"
                  required
                  value={wasteForm.time}
                  onChange={e => setWasteForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Petugas Sanitasi</label>
                <input
                  type="text"
                  required
                  value={wasteForm.officerName}
                  onChange={e => setWasteForm(f => ({ ...f, officerName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
            </div>

            {/* 5 Kategori Food Waste */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/40">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Berat Sampah Sisa Makanan ({wasteForm.unit}) & Upload Foto
              </span>

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

            <div>
              <label className="block font-bold mb-1">Catatan Evaluasi / Penyebab Sisa Makanan</label>
              <textarea
                rows={2}
                value={wasteForm.notes}
                onChange={e => setWasteForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsWasteModalOpen(false)}
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
    </div>
  );
};
