import React, { useMemo, useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NumericInput } from '../common/NumericInput';
import { exportTableToPDF, exportToExcel, formatRupiah, formatNumber, triggerPrint } from '../../lib/exportUtils';
import { toNonNegativeNumber } from '../../lib/numberUtils';
import { defaultFoodCompositions } from '../../lib/plogData';
import {
  buildMasterUnitSelectOptions,
  resolveAutoUnitForItem,
} from '../../lib/unitResolver';
import {
  Institution,
  MasterBahan,
  MasterSupplier,
  MasterVolunteer,
  MasterUnit,
  MaterialDimensionConversion,
} from '../../types';
import {
  Database,
  School,
  Apple,
  Truck,
  Users2,
  Scale,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calculator,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';

export const MasterDataModule: React.FC = () => {
  const {
    institutions,
    addInstitution,
    updateInstitution,
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
    hasPermission,
    sppgConfig,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'penerima' | 'bahan' | 'supplier' | 'relawan' | 'satuan'>('penerima');
  const [unitTypeFilter, setUnitTypeFilter] = useState<'ALL' | MasterUnit['type']>('ALL');

  React.useEffect(() => {
    const labels: Record<'penerima' | 'bahan' | 'supplier' | 'relawan' | 'satuan', string> = {
      penerima: 'A. Master Penerima Manfaat',
      bahan: 'B. Master Bahan Pangan',
      supplier: 'C. Master Supplier',
      relawan: 'D. Master Relawan',
      satuan: 'E. Master Satuan & Dimensi Bahan',
    };
    window.dispatchEvent(
      new CustomEvent('sppg-subtab-change', {
        detail: { module: 'master_data', title: labels[activeTab] },
      })
    );
  }, [activeTab]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'penerima' | 'bahan' | 'supplier' | 'relawan' | 'satuan' | 'konversi'>('penerima');
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteData, setDeleteData] = useState<{ id: string; type: string } | null>(null);

  // Form State: Master Penerima
  const [formInst, setFormInst] = useState<Omit<Institution, 'id'>>({
    name: '',
    institutionType: 'KB/PAUD',
    level: 'KB/PAUD',
    address: 'Dusun Krajan, Kec. Krejengan',
    npsn: '',
    contactPerson: '',
    phone: '',
    picName: '',
    picPhone: '',
    bankName: 'Bank Jatim',
    accountNumber: '',
    bankAccountName: '',
    smallPortions: 100,
    largePortions: 150,
    totalPortions: 250,
    deliveryRoute: 'Rute A - Temenggungan',
    deliveryOrder: 1,
    allergiesNote: '',
    isActive: true,
  });

  // Form State: Master Bahan
  const [formBahan, setFormBahan] = useState<Omit<MasterBahan, 'id'>>({
    code: 'BHP-011',
    name: '',
    category: 'Bahan Segar',
    unit: 'kg',
    referencePrice: 20000,
    actualPrice: 19000,
    minimumStock: 50,
    calories100g: 100,
    protein100g: 10,
    fat100g: 2,
    carb100g: 10,
    fiber100g: 2,
    calcium100g: 20,
    iron100g: 1,
    isActive: true,
    notes: '',
  });

  // Form State: Master Supplier
  const [formSupplier, setFormSupplier] = useState<Omit<MasterSupplier, 'id'>>({
    code: 'SUP-007',
    name: '',
    address: 'Kec. Krejengan, Kab. Probolinggo',
    contactPerson: '',
    phone: '',
    email: '',
    suppliedCategories: ['Bahan Segar'],
    bankName: 'Bank BRI',
    accountNumber: '',
    bankAccountName: '',
    isActive: true,
    notes: '',
  });

  // Form State: Master Relawan
  const [formVolunteer, setFormVolunteer] = useState<Omit<MasterVolunteer, 'id'>>({
    code: 'REL-009',
    name: '',
    division: 'Persiapan',
    position: 'Asisten Dapur',
    phone: '',
    address: 'Desa Temenggungan',
    isActive: true,
    joinDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Form State: Master Satuan
  const [formUnit, setFormUnit] = useState<Omit<MasterUnit, 'id'>>({
    code: '',
    name: '',
    type: 'Berat',
    baseUnit: 'gram',
    conversionToBase: 1000,
    isConfigurable: true,
  });

  // Form State: Konversi Dimensi Bahan
  const [formConv, setFormConv] = useState<MaterialDimensionConversion>({
    materialName: '',
    category: 'Buah',
    unit: 'buah',
    gramsPerUnit: 100,
    notes: '',
  });

  // Calculator State for Dimension Conversions
  const [calcMaterial, setCalcMaterial] = useState<string>(materialConversions[0]?.materialName || 'Semangka Merah Manis');
  const [calcInputUnitQty, setCalcInputUnitQty] = useState<number>(3);

  const selectedConv = materialConversions.find(c => c.materialName === calcMaterial) || materialConversions[0];
  const calculatedTotalGrams = selectedConv
    ? toNonNegativeNumber(calcInputUnitQty, 0) * toNonNegativeNumber(selectedConv.gramsPerUnit, 0)
    : 0;
  const calculatedTotalKg = (calculatedTotalGrams / 1000).toFixed(2);
  const [isBahanUnitManual, setIsBahanUnitManual] = useState(false);

  const masterUnitSelectOptions = useMemo(
    () =>
      buildMasterUnitSelectOptions({
        masterUnits,
        materialConversions,
        extraUnits: [formBahan.unit, formConv.unit],
      }),
    [masterUnits, materialConversions, formBahan.unit, formConv.unit]
  );

  // Open Handlers
  const handleOpenAdd = (type: typeof modalType) => {
    setModalType(type);
    setEditItem(null);
    setIsBahanUnitManual(false);
    if (type === 'penerima') {
      setFormInst({
        name: '',
        institutionType: 'KB/PAUD',
        level: 'KB/PAUD',
        address: 'Dusun Krajan, Desa Temenggungan, Kec. Krejengan',
        npsn: `2054${Math.floor(Math.random() * 800) + 100}`,
        contactPerson: '',
        phone: '',
        picName: '',
        picPhone: '',
        bankName: 'Bank Jatim',
        accountNumber: '0132-' + Math.floor(Math.random() * 8000 + 1000),
        bankAccountName: '',
        smallPortions: 120,
        largePortions: 150,
        totalPortions: 270,
        deliveryRoute: 'Rute A - Temenggungan',
        deliveryOrder: institutions.length + 1,
        allergiesNote: '',
        isActive: true,
      });
    } else if (type === 'bahan') {
      setFormBahan({
        code: `BHP-0${Math.floor(Math.random() * 80) + 20}`,
        name: '',
        category: 'Bahan Segar',
        unit: 'kg',
        referencePrice: 20000,
        actualPrice: 18500,
        minimumStock: 40,
        calories100g: 120,
        protein100g: 8.5,
        fat100g: 2.1,
        carb100g: 15.0,
        fiber100g: 1.5,
        calcium100g: 25,
        iron100g: 1.2,
        isActive: true,
        notes: '',
      });
    } else if (type === 'supplier') {
      setFormSupplier({
        code: `SUP-00${masterSuppliers.length + 1}`,
        name: '',
        address: 'Jl. Raya Krejengan, Kab. Probolinggo',
        contactPerson: '',
        phone: '',
        email: '',
        suppliedCategories: ['Bahan Segar'],
        bankName: 'Bank BRI',
        accountNumber: '6321-01-' + Math.floor(Math.random() * 800000 + 100000),
        bankAccountName: '',
        isActive: true,
        notes: '',
      });
    } else if (type === 'relawan') {
      setFormVolunteer({
        code: `REL-00${masterVolunteers.length + 1}`,
        name: '',
        division: 'Persiapan',
        position: 'Asisten Dapur',
        phone: '',
        address: 'Desa Temenggungan, Krejengan',
        isActive: true,
        joinDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    } else if (type === 'satuan') {
      setFormUnit({
        code: '',
        name: '',
        type: 'Berat',
        baseUnit: 'gram',
        conversionToBase: 1000,
        isConfigurable: true,
      });
    } else if (type === 'konversi') {
      setFormConv({
        materialName: '',
        category: 'Buah',
        unit: 'buah',
        gramsPerUnit: 150,
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (type: typeof modalType, item: any) => {
    setModalType(type);
    setEditItem(item);
    setIsBahanUnitManual(false);
    if (type === 'penerima') setFormInst({ ...item });
    else if (type === 'bahan') setFormBahan({ ...item });
    else if (type === 'supplier') setFormSupplier({ ...item });
    else if (type === 'relawan') setFormVolunteer({ ...item });
    else if (type === 'satuan') setFormUnit({ ...item });
    else if (type === 'konversi') setFormConv({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'penerima') {
      const small = toNonNegativeNumber(formInst.smallPortions, 0);
      const large = toNonNegativeNumber(formInst.largePortions, 0);
      const payload = { ...formInst, smallPortions: small, largePortions: large, totalPortions: small + large };
      if (editItem) await updateInstitution(editItem.id, payload);
      else await addInstitution(payload);
    } else if (modalType === 'bahan') {
      const cleanBahan: Omit<MasterBahan, 'id'> = {
        ...formBahan,
        referencePrice: toNonNegativeNumber(formBahan.referencePrice, 0),
        actualPrice: toNonNegativeNumber(formBahan.actualPrice, 0),
        minimumStock: toNonNegativeNumber(formBahan.minimumStock, 0),
        calories100g: toNonNegativeNumber(formBahan.calories100g, 0),
        protein100g: toNonNegativeNumber(formBahan.protein100g, 0),
        fat100g: toNonNegativeNumber(formBahan.fat100g, 0),
        carb100g: toNonNegativeNumber(formBahan.carb100g, 0),
        fiber100g: toNonNegativeNumber(formBahan.fiber100g, 0),
        calcium100g: toNonNegativeNumber(formBahan.calcium100g, 0),
        iron100g: toNonNegativeNumber(formBahan.iron100g, 0),
      };
      if (editItem) await updateMasterBahan(editItem.id, cleanBahan);
      else await addMasterBahan(cleanBahan);
    } else if (modalType === 'supplier') {
      if (editItem) await updateMasterSupplier(editItem.id, formSupplier);
      else await addMasterSupplier(formSupplier);
    } else if (modalType === 'relawan') {
      if (editItem) await updateMasterVolunteer(editItem.id, formVolunteer);
      else await addMasterVolunteer(formVolunteer);
    } else if (modalType === 'satuan') {
      const cleanCode = formUnit.code.trim();
      const cleanUnit: Omit<MasterUnit, 'id'> = {
        ...formUnit,
        code: cleanCode,
        conversionToBase: Math.max(0.0001, toNonNegativeNumber(formUnit.conversionToBase, 1)),
      };
      const duplicate = masterUnits.some(
        u => u.code.trim().toLowerCase() === cleanCode.toLowerCase() && (!editItem || u.id !== editItem.id)
      );
      if (!cleanCode || duplicate) {
        if (editItem) await updateMasterUnit(editItem.id, cleanUnit);
        else await addMasterUnit(cleanUnit);
        return;
      }
      if (editItem) await updateMasterUnit(editItem.id, cleanUnit);
      else await addMasterUnit(cleanUnit);
    } else if (modalType === 'konversi') {
      const cleanConv: MaterialDimensionConversion = {
        ...formConv,
        gramsPerUnit: Math.max(1, toNonNegativeNumber(formConv.gramsPerUnit, 1)),
      };
      if (editItem) await updateMaterialConversion(editItem.materialName, cleanConv);
      else await addMaterialConversion(cleanConv);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteData) return;
    if (deleteData.type === 'penerima') await deleteInstitution(deleteData.id);
    else if (deleteData.type === 'bahan') await deleteMasterBahan(deleteData.id);
    else if (deleteData.type === 'supplier') await deleteMasterSupplier(deleteData.id);
    else if (deleteData.type === 'relawan') await deleteMasterVolunteer(deleteData.id);
    else if (deleteData.type === 'satuan') await deleteMasterUnit(deleteData.id);
    else if (deleteData.type === 'konversi') await deleteMaterialConversion(deleteData.id);
    setDeleteData(null);
  };

  // Columns for Tab A: Penerima Manfaat
  const institutionColumns: Column<Institution>[] = [
    {
      key: 'name',
      header: 'Nama Lembaga & Jenis',
      render: row => (
        <div className="space-y-1 max-w-xs">
          <div className="font-bold text-[13px] text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
            <span>{row.name}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/70 dark:text-sky-300 dark:border-blue-800 rounded-md">
              {row.level}
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">{row.institutionType}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{row.address}</div>
        </div>
      ),
    },
    {
      key: 'contacts',
      header: 'PIC & Kontak',
      render: row => (
        <div className="text-xs space-y-1">
          <div className="font-semibold text-slate-900 dark:text-white">{row.picName || row.contactPerson}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{row.picPhone || row.phone}</div>
        </div>
      ),
    },
    {
      key: 'bank',
      header: 'Nomor Rekening',
      render: row => (
        <div className="text-xs font-mono space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{row.bankName || 'Bank Jatim'}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">{row.accountNumber || '-'}</div>
          {row.bankAccountName && (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">{row.bankAccountName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'portions',
      header: 'Kategori Porsi',
      render: row => (
        <div className="text-xs font-mono space-y-1">
          <div className="font-bold text-slate-900 dark:text-white">
            {formatNumber(row.totalPortions)} <span className="font-normal text-[11px] text-slate-400 font-sans">Total Porsi</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
            Kecil: <span className="font-semibold text-sky-600 dark:text-sky-400 font-mono">{row.smallPortions}</span> · Besar:{' '}
            <span className="font-semibold text-blue-700 dark:text-blue-400 font-mono">{row.largePortions}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70'
              : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70'
          }`}
        >
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit('penerima', row)}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-900/60 rounded-lg transition cursor-pointer"
            title="Edit Lembaga"
            aria-label={`Edit ${row.name}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteData({ id: row.id, type: 'penerima' })}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg transition cursor-pointer"
            title="Hapus Lembaga"
            aria-label={`Hapus ${row.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Columns for Tab B: Master Bahan Pangan
  const bahanColumns: Column<MasterBahan>[] = [
    {
      key: 'code',
      header: 'Kode & Nama Bahan',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{row.name}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
            <span>Kode: {row.code}</span>
            <span>•</span>
            <span className="text-slate-400">{row.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Harga Acuan vs Aktual',
      render: row => {
        const isSaving = row.actualPrice <= row.referencePrice;
        return (
          <div className="text-xs font-mono space-y-0.5">
            <div className="text-slate-500 text-[11px]">
              Acuan: {formatRupiah(row.referencePrice)} / {row.unit}
            </div>
            <div className="font-bold text-slate-900 dark:text-white">
              Aktual: {formatRupiah(row.actualPrice)} / {row.unit}
            </div>
            <div className={`text-[10px] font-sans font-semibold ${isSaving ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isSaving ? '✓ Efisiensi' : '⚠ Di atas Acuan'} ({formatRupiah(Math.abs(row.referencePrice - row.actualPrice))})
            </div>
          </div>
        );
      },
    },
    {
      key: 'nutrition',
      header: 'Gizi per 100 gram',
      render: row => (
        <div className="text-[11px] space-y-0.5">
          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {row.calories100g} kkal
          </div>
          <div className="text-slate-500 flex items-center gap-2">
            <span className="text-emerald-600 font-semibold">P: {row.protein100g}g</span>
            <span className="text-amber-600 font-semibold">L: {row.fat100g}g</span>
            <span className="text-sky-600 font-semibold">K: {row.carb100g}g</span>
            <span>S: {row.fiber100g}g</span>
          </div>
        </div>
      ),
    },
    {
      key: 'minimumStock',
      header: 'Stok Minimum',
      render: row => (
        <div className="text-xs font-mono font-bold text-rose-600">
          {formatNumber(row.minimumStock)} {row.unit}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70'
              : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70'
          }`}
        >
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit('bahan', row)}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-900/60 rounded-lg transition cursor-pointer"
            title="Edit Bahan"
            aria-label={`Edit ${row.name}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteData({ id: row.id, type: 'bahan' })}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg transition cursor-pointer"
            title="Hapus Bahan"
            aria-label={`Hapus ${row.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Columns for Tab C: Master Supplier
  const supplierColumns: Column<MasterSupplier>[] = [
    {
      key: 'name',
      header: 'Nama Supplier & Kode',
      render: row => (
        <div className="space-y-1 max-w-xs">
          <div className="font-bold text-[13px] text-slate-900 dark:text-white">
            {row.name}
          </div>
          <div className="text-xs font-mono text-slate-600 dark:text-slate-300">Kode: {row.code}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{row.address}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'PIC & Kontak',
      render: row => (
        <div className="text-xs space-y-1">
          <div className="font-semibold text-slate-900 dark:text-white">{row.contactPerson}</div>
          <div className="text-[11px] text-slate-500 font-mono">{row.phone}</div>
          {row.email && <div className="text-[11px] text-slate-400">{row.email}</div>}
        </div>
      ),
    },
    {
      key: 'categories',
      header: 'Jenis Pasokan Pangan',
      render: row => (
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {row.suppliedCategories.map((c, idx) => (
            <span key={idx} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/60 dark:text-sky-300 dark:border-blue-800 rounded-md font-medium">
              {c}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'bank',
      header: 'Rekening Pembayaran',
      render: row => (
        <div className="text-xs font-mono space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{row.bankName}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">{row.accountNumber}</div>
          <div className="text-[11px] text-slate-400 font-sans">a.n. {row.bankAccountName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70'
              : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70'
          }`}
        >
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit('supplier', row)}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-900/60 rounded-lg transition cursor-pointer"
            title="Edit Supplier"
            aria-label={`Edit ${row.name}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteData({ id: row.id, type: 'supplier' })}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg transition cursor-pointer"
            title="Hapus Supplier"
            aria-label={`Hapus ${row.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Columns for Tab D: Master Relawan
  const volunteerColumns: Column<MasterVolunteer>[] = [
    {
      key: 'name',
      header: 'Nama Relawan & ID',
      render: row => (
        <div className="space-y-1">
          <div className="font-bold text-[13px] text-slate-900 dark:text-white">{row.name}</div>
          <div className="text-xs font-mono text-slate-500">ID: {row.code}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">{row.address}</div>
        </div>
      ),
    },
    {
      key: 'division',
      header: 'Divisi & Jabatan',
      render: row => (
        <div className="text-xs space-y-1">
          <div className="font-semibold text-blue-700 dark:text-sky-400">Divisi {row.division}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">{row.position}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Kontak / No. HP',
      render: row => <div className="text-xs font-mono text-slate-700 dark:text-slate-300">{row.phone}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70'
              : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70'
          }`}
        >
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit('relawan', row)}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-900/60 rounded-lg transition cursor-pointer"
            title="Edit Relawan"
            aria-label={`Edit ${row.name}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteData({ id: row.id, type: 'relawan' })}
            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] p-2.5 text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg transition cursor-pointer"
            title="Hapus Relawan"
            aria-label={`Hapus ${row.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Compact Module Header */}
      <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200/70 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/70 shrink-0">
              <Database className="w-5 h-5" />
            </span>
            <span>Modul Master Data Sistem E-SPPG</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Data Induk Terpadu: Penerima Manfaat, Bahan Pangan, Supplier, Relawan & Satuan Konversi Dimensi
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAdd(activeTab as any)}
          className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 bg-[#1E3A8A] hover:bg-blue-900 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-200 ease-in-out whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'satuan' ? 'Tambah Master Satuan' : 'Tambah Data Master'}</span>
        </button>
      </div>

      {/* Responsive Pill Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div
          role="tablist"
          aria-label="Kategori Master Data"
          className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          {[
            {
              key: 'penerima' as const,
              label: 'A. Master Penerima Manfaat',
              count: institutions.length,
              icon: <School className="w-4 h-4 shrink-0" />,
            },
            {
              key: 'bahan' as const,
              label: 'B. Master Bahan Pangan',
              count: masterBahan.length,
              icon: <Apple className="w-4 h-4 shrink-0" />,
            },
            {
              key: 'supplier' as const,
              label: 'C. Master Supplier',
              count: masterSuppliers.length,
              icon: <Truck className="w-4 h-4 shrink-0" />,
            },
            {
              key: 'relawan' as const,
              label: 'D. Master Relawan',
              count: masterVolunteers.length,
              icon: <Users2 className="w-4 h-4 shrink-0" />,
            },
            {
              key: 'satuan' as const,
              label: 'E. Master Satuan & Dimensi Bahan',
              count: masterUnits.length,
              icon: <Scale className="w-4 h-4 shrink-0" />,
            },
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white shadow-sm dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-50 text-[#1E3A8A] border border-blue-200/80 dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab A Content: Master Penerima Manfaat */}
      {activeTab === 'penerima' && (
        <div key="penerima" className="animate-fadeIn">
          <DataTable
            title="Master Data Lembaga Penerima Manfaat"
            subtitle="Daftar resmi lembaga sekolah, jenjang, kuota porsi, nomor rekening dan status aktif"
            data={institutions}
            columns={institutionColumns}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari nama lembaga, jenis, PIC, no rekening..."
            searchKeys={['name', 'institutionType', 'npsn', 'picName', 'accountNumber']}
            onExportExcel={() => exportToExcel(institutions, 'Master_Penerima_Manfaat_SPPG', 'Penerima')}
            onPrint={triggerPrint}
            stickyFirstColumn
          />
        </div>
      )}

      {/* Tab B Content: Master Bahan Pangan */}
      {activeTab === 'bahan' && (
        <div key="bahan" className="animate-fadeIn">
          <DataTable
            title="Master Data Bahan Pangan & Nilai Nutrisi"
            subtitle="Spesifikasi bahan, harga acuan BGN vs aktual pasar, stok safety, dan kandungan gizi per 100 gram"
            data={masterBahan}
            columns={bahanColumns}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari kode, nama bahan, kategori..."
            searchKeys={['code', 'name', 'category']}
            onExportExcel={() => exportToExcel(masterBahan, 'Master_Bahan_Pangan_SPPG', 'Bahan Pangan')}
            onPrint={triggerPrint}
            stickyFirstColumn
          />
        </div>
      )}

      {/* Tab C Content: Master Supplier */}
      {activeTab === 'supplier' && (
        <div key="supplier" className="animate-fadeIn">
          <DataTable
            title="Master Data Rekanan & Supplier Bahan Pangan"
            subtitle="Identitas rekanan pengadaan, jenis komoditas pasokan pangan, nomor rekening bank pembayaran"
            data={masterSuppliers}
            columns={supplierColumns}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari nama supplier, PIC, komoditas..."
            searchKeys={['name', 'code', 'contactPerson', 'bankName', 'accountNumber']}
            onExportExcel={() => exportToExcel(masterSuppliers, 'Master_Supplier_SPPG', 'Supplier')}
            onPrint={triggerPrint}
            stickyFirstColumn
          />
        </div>
      )}

      {/* Tab D Content: Master Relawan */}
      {activeTab === 'relawan' && (
        <div key="relawan" className="animate-fadeIn">
          <DataTable
            title="Master Data Relawan Satuan Pelayanan"
            subtitle="Daftar relawan aktif per divisi kerja (Persiapan, Pengolahan, Pemorsian, Distribusi, Cuci Ompreng, Kebersihan, Keamanan)"
            data={masterVolunteers}
            columns={volunteerColumns}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari nama relawan, divisi, jabatan..."
            searchKeys={['name', 'code', 'division', 'position', 'phone']}
            onExportExcel={() => exportToExcel(masterVolunteers, 'Master_Relawan_SPPG', 'Relawan')}
            onPrint={triggerPrint}
            stickyFirstColumn
          />
        </div>
      )}

      {/* Tab E Content: Master Satuan & Konversi Dimensi */}
      {activeTab === 'satuan' && (
        <div key="satuan" className="space-y-6 animate-fadeIn">
          {/* Interactive Calculator Component */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/85 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-blue-600 dark:text-sky-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kalkulator Konversi Satuan Berbasis Dimensi & Spesifikasi Bahan
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-2xl">
              Sistem tidak mengasumsikan 1 buah memiliki berat sama untuk semua bahan. Misalnya: 1 buah semangka (~3.000g) vs 1 butir telur (~60g) vs 1 buah pisang (~120g).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-blue-50/60 dark:bg-slate-800/70 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Pilih Bahan Pangan</label>
                <select
                  value={calcMaterial}
                  onChange={e => setCalcMaterial(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-semibold"
                >
                  {materialConversions.map(c => (
                    <option key={c.materialName} value={c.materialName}>
                      {c.materialName} ({c.gramsPerUnit} gram / {c.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Jumlah Satuan ({selectedConv?.unit || 'unit'})
                </label>
                <NumericInput
                  min={0.1}
                  value={calcInputUnitQty}
                  onValueChange={val => setCalcInputUnitQty(val)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-sky-800 rounded-xl text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Hasil Ekuivalen Berat</span>
                <span className="text-lg font-bold font-mono text-blue-700 dark:text-sky-400">
                  {formatNumber(calculatedTotalGrams)} gram <span className="text-xs font-normal text-slate-500">({calculatedTotalKg} kg)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Info Banner Basis Data Satuan */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-blue-900 dark:text-sky-200">
              <Scale className="w-4 h-4 shrink-0 mt-0.5 text-blue-700 dark:text-sky-400" />
              <div>
                <div className="font-bold">Basis Data Satuan Terpusat E-SPPG</div>
                <p className="text-[11px] text-blue-800/80 dark:text-sky-300/80 mt-0.5">
                  Seluruh satuan di sini (gram, kg, pcs, liter, dll.) otomatis menjadi pilihan satuan resmi pada Master Bahan Pangan, Menu & Food Cost, RAB & QC Pengadaan, Inventaris Gudang, serta Produksi Dapur.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenAdd('satuan')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Satuan
              </button>
            </div>
          </div>

          {/* Table: Master Satuan Konfigurasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Daftar Master Satuan ({masterUnits.length} Satuan)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Referensi kode satuan & faktor konversi ke satuan dasar (gram / ml / satuan)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('satuan')}
                  className="text-xs font-bold text-blue-900 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Satuan
                </button>
              </div>

              {/* Filter Tipe Dimensi */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {(['ALL', 'Berat', 'Volume', 'Satuan Bahan (Pieces/Dimensi)', 'Kemasan'] as const).map(t => {
                  const count =
                    t === 'ALL'
                      ? masterUnits.length
                      : masterUnits.filter(u => u.type === t).length;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setUnitTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        unitTypeFilter === t
                          ? 'bg-blue-900 text-white dark:bg-sky-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {t === 'ALL' ? 'Semua' : t === 'Satuan Bahan (Pieces/Dimensi)' ? 'Pieces / Dimensi' : t} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-2">Kode</th>
                      <th className="p-2">Nama Satuan</th>
                      <th className="p-2">Kategori</th>
                      <th className="p-2 text-right">Ekuivalen Dasar</th>
                      <th className="p-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {masterUnits
                      .filter(u => unitTypeFilter === 'ALL' || u.type === unitTypeFilter)
                      .map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="p-2 font-bold text-blue-900 dark:text-sky-400">{u.code}</td>
                          <td className="p-2 font-sans font-semibold text-slate-800 dark:text-slate-200">{u.name}</td>
                          <td className="p-2 font-sans text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                              {u.type === 'Satuan Bahan (Pieces/Dimensi)' ? 'Pieces/Dimensi' : u.type}
                            </span>
                          </td>
                          <td className="p-2 text-right text-slate-700 dark:text-slate-300">
                            {formatNumber(u.conversionToBase)} {u.baseUnit}
                          </td>
                          <td className="p-2 text-right font-sans">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit('satuan', u)}
                                className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 dark:bg-sky-950/50 dark:text-sky-400 rounded-lg transition cursor-pointer"
                                title="Edit Satuan"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteData({ id: u.id, type: 'satuan' })}
                                className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg transition cursor-pointer"
                                title="Hapus Satuan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table: Konversi Dimensi Spesifik Bahan */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/85 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Spesifikasi Berat per Dimensi Bahan Pangan ({materialConversions.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Konversi berat rata-rata (gram) per satuan non-berat (buah, butir, ikat, papan)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('konversi')}
                  className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Konversi
                </button>
              </div>
              <div className="overflow-x-auto max-h-[465px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-2.5">Komoditas Bahan</th>
                      <th className="p-2.5">Satuan Dimensi</th>
                      <th className="p-2.5 text-right">Berat Rata-rata</th>
                      <th className="p-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {materialConversions.map((c, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                          {c.materialName}
                          {c.notes && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{c.notes}</span>}
                        </td>
                        <td className="p-3 font-sans font-semibold text-blue-700 dark:text-sky-400">{c.unit}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          {formatNumber(c.gramsPerUnit)} g
                        </td>
                        <td className="p-3 text-right font-sans">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit('konversi', c)}
                              className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 dark:bg-sky-950/50 dark:text-sky-400 rounded-lg transition cursor-pointer"
                              title="Edit Konversi"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteData({ id: c.materialName, type: 'konversi' })}
                              className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg transition cursor-pointer"
                              title="Hapus Konversi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Form Modal for Master Data */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'penerima'
            ? editItem ? 'Edit Master Penerima Manfaat' : 'Tambah Master Penerima Manfaat'
            : modalType === 'bahan'
            ? editItem ? 'Edit Master Bahan Pangan' : 'Tambah Master Bahan Pangan'
            : modalType === 'supplier'
            ? editItem ? 'Edit Master Supplier' : 'Tambah Master Supplier'
            : modalType === 'relawan'
            ? editItem ? 'Edit Master Relawan' : 'Tambah Master Relawan'
            : modalType === 'satuan'
            ? 'Tambah / Edit Master Satuan'
            : 'Tambah Konversi Dimensi Spesifik Bahan'
        }
        subtitle="Lengkapi data master secara akurat untuk integritas operasional SPPG"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveModal} className="space-y-4">
          {/* Form Content: Penerima */}
          {modalType === 'penerima' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lembaga *</label>
                  <input
                    type="text"
                    required
                    value={formInst.name}
                    onChange={e => setFormInst({ ...formInst, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Lembaga *</label>
                  <select
                    value={formInst.institutionType}
                    onChange={e =>
                      setFormInst({
                        ...formInst,
                        institutionType: e.target.value,
                        level: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {!['KB/PAUD', 'TK', 'MI', 'MTs', 'MA', 'Posyandu'].includes(formInst.institutionType) &&
                      formInst.institutionType && (
                        <option value={formInst.institutionType}>{formInst.institutionType}</option>
                      )}
                    <option value="KB/PAUD">KB/PAUD</option>
                    <option value="TK">TK</option>
                    <option value="MI">MI</option>
                    <option value="MTs">MTs</option>
                    <option value="MA">MA</option>
                    <option value="Posyandu">Posyandu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formInst.address}
                  onChange={e => setFormInst({ ...formInst, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">PIC Lembaga (Kepsek / Guru MBG) *</label>
                  <input
                    type="text"
                    required
                    value={formInst.picName}
                    onChange={e => setFormInst({ ...formInst, picName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Telepon / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formInst.picPhone}
                    onChange={e => setFormInst({ ...formInst, picPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    value={formInst.bankName || ''}
                    onChange={e => setFormInst({ ...formInst, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={formInst.accountNumber || ''}
                    onChange={e => setFormInst({ ...formInst, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Atas Nama Rekening</label>
                  <input
                    type="text"
                    value={formInst.bankAccountName || ''}
                    onChange={e => setFormInst({ ...formInst, bankAccountName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Porsi Kecil (PAUD/SD 1-3)</label>
                  <NumericInput
                    min={0}
                    value={formInst.smallPortions}
                    onValueChange={val => setFormInst({ ...formInst, smallPortions: val })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Porsi Besar (SD 4-6, SMP, SMA)</label>
                  <NumericInput
                    min={0}
                    value={formInst.largePortions}
                    onValueChange={val => setFormInst({ ...formInst, largePortions: val })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Porsi (Otomatis)</label>
                  <input
                    type="text"
                    disabled
                    value={toNonNegativeNumber(formInst.smallPortions, 0) + toNonNegativeNumber(formInst.largePortions, 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 dark:bg-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formInst.isActive}
                    onChange={e => setFormInst({ ...formInst, isActive: e.target.checked })}
                    className="w-4 h-4 rounded-sm accent-blue-900"
                  />
                  <span>Status Lembaga Aktif Menerima MBG</span>
                </label>
              </div>
            </div>
          )}

          {/* Form Content: Bahan */}
          {modalType === 'bahan' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Bahan *</label>
                  <input
                    type="text"
                    required
                    value={formBahan.code}
                    onChange={e => setFormBahan({ ...formBahan, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Bahan Pangan *</label>
                  <input
                    type="text"
                    required
                    value={formBahan.name}
                    onChange={e => {
                      const nextName = e.target.value;
                      if (!nextName.trim()) {
                        setIsBahanUnitManual(false);
                      }
                      const auto =
                        !editItem && !isBahanUnitManual && nextName.trim()
                          ? resolveAutoUnitForItem({
                              itemName: nextName,
                              categoryHint:
                                formBahan.category === 'Kemasan & Higiene' ||
                                formBahan.category === 'Pelengkap'
                                  ? 'operasional'
                                  : 'bahan',
                              masterUnits,
                              materialConversions,
                              masterBahan,
                              foodCompositions: defaultFoodCompositions,
                            })
                          : null;
                      setFormBahan({
                        ...formBahan,
                        name: nextName,
                        ...(auto ? { unit: auto.unit } : {}),
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori *</label>
                  <select
                    value={formBahan.category}
                    onChange={e => setFormBahan({ ...formBahan, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {['Bahan Segar', 'Bahan Kering', 'Bumbu & Rempah', 'Kemasan & Higiene', 'Pelengkap'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan Dasar (Master Satuan &amp; Dimensi Bahan) *
                  </label>
                  <select
                    required
                    value={formBahan.unit}
                    onChange={e => {
                      setIsBahanUnitManual(true);
                      setFormBahan({ ...formBahan, unit: e.target.value });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {masterUnitSelectOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Harga Acuan (Rp) *</label>
                  <NumericInput
                    min={0}
                    value={formBahan.referencePrice}
                    onValueChange={val => setFormBahan({ ...formBahan, referencePrice: val })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Harga Aktual Pasar (Rp) *</label>
                  <NumericInput
                    min={0}
                    value={formBahan.actualPrice}
                    onValueChange={val => setFormBahan({ ...formBahan, actualPrice: val })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Stok Minimum *</label>
                  <NumericInput
                    min={0}
                    value={formBahan.minimumStock}
                    onValueChange={val => setFormBahan({ ...formBahan, minimumStock: val })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-rose-600 font-bold"
                  />
                </div>
              </div>

              {/* Nutrition per 100g */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Informasi Gizi per 100 gram</span>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Kalori (kkal)</label>
                    <NumericInput
                      min={0}
                      value={formBahan.calories100g}
                      onValueChange={val => setFormBahan({ ...formBahan, calories100g: val })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Protein (g)</label>
                    <NumericInput
                      min={0}
                      value={formBahan.protein100g}
                      onValueChange={val => setFormBahan({ ...formBahan, protein100g: val })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Lemak (g)</label>
                    <NumericInput
                      min={0}
                      value={formBahan.fat100g}
                      onValueChange={val => setFormBahan({ ...formBahan, fat100g: val })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Karbo (g)</label>
                    <NumericInput
                      min={0}
                      value={formBahan.carb100g}
                      onValueChange={val => setFormBahan({ ...formBahan, carb100g: val })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Serat (g)</label>
                    <NumericInput
                      min={0}
                      value={formBahan.fiber100g}
                      onValueChange={val => setFormBahan({ ...formBahan, fiber100g: val })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Content: Supplier */}
          {modalType === 'supplier' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Supplier *</label>
                  <input
                    type="text"
                    required
                    value={formSupplier.code}
                    onChange={e => setFormSupplier({ ...formSupplier, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Supplier / Badan Usaha *</label>
                  <input
                    type="text"
                    required
                    value={formSupplier.name}
                    onChange={e => setFormSupplier({ ...formSupplier, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Gudang / Kantor *</label>
                <input
                  type="text"
                  required
                  value={formSupplier.address}
                  onChange={e => setFormSupplier({ ...formSupplier, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kontak Person (PIC) *</label>
                  <input
                    type="text"
                    required
                    value={formSupplier.contactPerson}
                    onChange={e => setFormSupplier({ ...formSupplier, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Telepon / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formSupplier.phone}
                    onChange={e => setFormSupplier({ ...formSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bank</label>
                  <input
                    type="text"
                    value={formSupplier.bankName}
                    onChange={e => setFormSupplier({ ...formSupplier, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={formSupplier.accountNumber}
                    onChange={e => setFormSupplier({ ...formSupplier, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Atas Nama Rekening</label>
                  <input
                    type="text"
                    value={formSupplier.bankAccountName}
                    onChange={e => setFormSupplier({ ...formSupplier, bankAccountName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Content: Relawan */}
          {modalType === 'relawan' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Relawan *</label>
                  <input
                    type="text"
                    required
                    value={formVolunteer.code}
                    onChange={e => setFormVolunteer({ ...formVolunteer, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formVolunteer.name}
                    onChange={e => setFormVolunteer({ ...formVolunteer, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Divisi Penugasan *</label>
                  <select
                    value={formVolunteer.division}
                    onChange={e => setFormVolunteer({ ...formVolunteer, division: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {['Persiapan', 'Pengolahan', 'Pemorsian', 'Distribusi', 'Cuci Ompreng', 'Kebersihan', 'Keamanan'].map(d => (
                      <option key={d} value={d}>Divisi {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Jabatan Relawan *</label>
                  <input
                    type="text"
                    required
                    value={formVolunteer.position}
                    onChange={e => setFormVolunteer({ ...formVolunteer, position: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No. HP / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formVolunteer.phone}
                    onChange={e => setFormVolunteer({ ...formVolunteer, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Tempat Tinggal</label>
                  <input
                    type="text"
                    value={formVolunteer.address}
                    onChange={e => setFormVolunteer({ ...formVolunteer, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Content: Master Satuan */}
          {modalType === 'satuan' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: kg / gram / pcs / liter"
                    value={formUnit.code}
                    onChange={e => setFormUnit({ ...formUnit, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pieces / Satuan Unit, Kilogram, Liter"
                    value={formUnit.name}
                    onChange={e => setFormUnit({ ...formUnit, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe / Kategori Dimensi *
                  </label>
                  <select
                    value={formUnit.type}
                    onChange={e => {
                      const nextType = e.target.value as MasterUnit['type'];
                      const suggestedBase: MasterUnit['baseUnit'] =
                        nextType === 'Berat' ? 'gram' : nextType === 'Volume' ? 'ml' : 'satuan';
                      setFormUnit({
                        ...formUnit,
                        type: nextType,
                        baseUnit: suggestedBase,
                        conversionToBase: suggestedBase === 'satuan' ? 1 : formUnit.conversionToBase,
                        isConfigurable: nextType === 'Satuan Bahan (Pieces/Dimensi)' || nextType === 'Kemasan',
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Berat">Berat (Massa)</option>
                    <option value="Volume">Volume (Cair)</option>
                    <option value="Satuan Bahan (Pieces/Dimensi)">Satuan Bahan (Pieces/Dimensi)</option>
                    <option value="Kemasan">Kemasan / Packing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan Dasar Acuan *
                  </label>
                  <select
                    value={formUnit.baseUnit}
                    onChange={e =>
                      setFormUnit({ ...formUnit, baseUnit: e.target.value as MasterUnit['baseUnit'] })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  >
                    <option value="gram">gram (Berat)</option>
                    <option value="ml">ml (Volume)</option>
                    <option value="satuan">satuan (Unit/Pieces)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Konversi ke {formUnit.baseUnit} *
                  </label>
                  <NumericInput
                    min={0.0001}
                    required
                    value={formUnit.conversionToBase}
                    onValueChange={val =>
                      setFormUnit({ ...formUnit, conversionToBase: val })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formUnit.isConfigurable}
                    onChange={e => setFormUnit({ ...formUnit, isConfigurable: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-900"
                  />
                  <span>Satuan berdimensi / kemasan (bisa dipetakan berat per komoditas)</span>
                </label>
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-sky-300 font-mono font-bold">
                  1 {formUnit.code.trim() || '?'} = {formatNumber(toNonNegativeNumber(formUnit.conversionToBase, 0))} {formUnit.baseUnit}
                </span>
              </div>
            </div>
          )}

          {/* Form Content: Konversi Dimensi */}
          {modalType === 'konversi' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Komoditas Bahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Semangka Merah Manis"
                  value={formConv.materialName}
                  onChange={e => setFormConv({ ...formConv, materialName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan Dimensi Fisik (Master Satuan &amp; Dimensi Bahan) *
                  </label>
                  <select
                    required
                    value={formConv.unit}
                    onChange={e => setFormConv({ ...formConv, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {masterUnitSelectOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ekuivalen Berat (gram per unit) *</label>
                  <NumericInput
                    min={1}
                    required
                    value={formConv.gramsPerUnit}
                    onValueChange={val => setFormConv({ ...formConv, gramsPerUnit: val })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Spesifikasi Dimensi</label>
                <input
                  type="text"
                  placeholder="Contoh: Berat rata-rata ukuran sedang di pasar lokal"
                  value={formConv.notes || ''}
                  onChange={e => setFormConv({ ...formConv, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 rounded-lg shadow-sm transition"
            >
              Simpan Data Master
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog: Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteData)}
        onClose={() => setDeleteData(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Master"
        message="Apakah Anda yakin ingin menghapus data master ini? Tindakan ini akan tercatat dalam audit log sistem."
        isDestructive={true}
      />
    </div>
  );
};
