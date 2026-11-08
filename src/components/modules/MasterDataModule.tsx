import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportTableToPDF, exportToExcel, formatRupiah, formatNumber, triggerPrint } from '../../lib/exportUtils';
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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'penerima' | 'bahan' | 'supplier' | 'relawan' | 'satuan' | 'konversi'>('penerima');
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteData, setDeleteData] = useState<{ id: string; type: string } | null>(null);

  // Form State: Master Penerima
  const [formInst, setFormInst] = useState<Omit<Institution, 'id'>>({
    name: '',
    institutionType: 'Sekolah Dasar (SD)',
    level: 'SD',
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
  const calculatedTotalGrams = selectedConv ? calcInputUnitQty * selectedConv.gramsPerUnit : 0;
  const calculatedTotalKg = (calculatedTotalGrams / 1000).toFixed(2);

  // Open Handlers
  const handleOpenAdd = (type: typeof modalType) => {
    setModalType(type);
    setEditItem(null);
    if (type === 'penerima') {
      setFormInst({
        name: '',
        institutionType: 'Sekolah Dasar (SD)',
        level: 'SD',
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
      const small = Number(formInst.smallPortions);
      const large = Number(formInst.largePortions);
      const payload = { ...formInst, smallPortions: small, largePortions: large, totalPortions: small + large };
      if (editItem) await updateInstitution(editItem.id, payload);
      else await addInstitution(payload);
    } else if (modalType === 'bahan') {
      if (editItem) await updateMasterBahan(editItem.id, formBahan);
      else await addMasterBahan(formBahan);
    } else if (modalType === 'supplier') {
      if (editItem) await updateMasterSupplier(editItem.id, formSupplier);
      else await addMasterSupplier(formSupplier);
    } else if (modalType === 'relawan') {
      if (editItem) await updateMasterVolunteer(editItem.id, formVolunteer);
      else await addMasterVolunteer(formVolunteer);
    } else if (modalType === 'satuan') {
      if (editItem) await updateMasterUnit(editItem.id, formUnit);
      else await addMasterUnit(formUnit);
    } else if (modalType === 'konversi') {
      if (editItem) await updateMaterialConversion(editItem.materialName, formConv);
      else await addMaterialConversion(formConv);
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
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{row.name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300 rounded-xs">
              {row.level}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">{row.institutionType}</div>
          <div className="text-[10px] text-slate-400 truncate max-w-xs">{row.address}</div>
        </div>
      ),
    },
    {
      key: 'contacts',
      header: 'PIC & Kontak',
      render: row => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-white">{row.picName || row.contactPerson}</div>
          <div className="text-[11px] text-slate-500 font-mono">{row.picPhone || row.phone}</div>
        </div>
      ),
    },
    {
      key: 'bank',
      header: 'Nomor Rekening',
      render: row => (
        <div className="text-xs font-mono">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{row.bankName || 'Bank Jatim'}</div>
          <div className="text-[11px] text-slate-500">{row.accountNumber || '-'}</div>
          <div className="text-[10px] text-slate-400 font-sans">{row.bankAccountName}</div>
        </div>
      ),
    },
    {
      key: 'portions',
      header: 'Kategori Porsi',
      render: row => (
        <div className="text-xs font-mono">
          <div className="font-bold text-slate-900 dark:text-white">
            {formatNumber(row.totalPortions)} <span className="font-normal text-[10px] text-slate-400">Total</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Kecil: <span className="font-semibold text-sky-600">{row.smallPortions}</span> • Besar:{' '}
            <span className="font-semibold text-blue-900 dark:text-sky-400">{row.largePortions}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
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
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit('penerima', row)}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-sky-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition"
            title="Edit Lembaga"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteData({ id: row.id, type: 'penerima' })}
            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 transition"
            title="Hapus Lembaga"
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
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
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
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit('bahan', row)}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-sky-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition"
            title="Edit Bahan"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteData({ id: row.id, type: 'bahan' })}
            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 transition"
            title="Hapus Bahan"
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
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{row.name}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">Kode: {row.code}</div>
          <div className="text-[10px] text-slate-400 truncate max-w-xs">{row.address}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'PIC & Kontak',
      render: row => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-white">{row.contactPerson}</div>
          <div className="text-[11px] text-slate-500 font-mono">{row.phone}</div>
          {row.email && <div className="text-[10px] text-slate-400">{row.email}</div>}
        </div>
      ),
    },
    {
      key: 'categories',
      header: 'Jenis Pasokan Pangan',
      render: row => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.suppliedCategories.map((c, idx) => (
            <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-sky-300 rounded-xs font-semibold">
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
        <div className="text-xs font-mono">
          <div className="font-bold text-slate-800 dark:text-slate-200">{row.bankName}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">{row.accountNumber}</div>
          <div className="text-[10px] text-slate-400 font-sans">a.n. {row.bankAccountName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
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
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit('supplier', row)}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-sky-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition"
            title="Edit Supplier"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteData({ id: row.id, type: 'supplier' })}
            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 transition"
            title="Hapus Supplier"
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
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{row.name}</div>
          <div className="text-[11px] font-mono text-slate-500">ID: {row.code}</div>
          <div className="text-[10px] text-slate-400">{row.address}</div>
        </div>
      ),
    },
    {
      key: 'division',
      header: 'Divisi & Jabatan',
      render: row => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-blue-900 dark:text-sky-400">Divisi {row.division}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">{row.position}</div>
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
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
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
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit('relawan', row)}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-sky-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition"
            title="Edit Relawan"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteData({ id: row.id, type: 'relawan' })}
            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 transition"
            title="Hapus Relawan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Modul Master Data Sistem E-SPPG
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data Induk Terpadu: Penerima Manfaat, Bahan Pangan, Supplier, Relawan & Satuan Konversi Dimensi
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAdd(activeTab === 'satuan' ? 'konversi' : (activeTab as any))}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Data Master</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 text-xs font-bold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('penerima')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === 'penerima'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          <span>A. Master Penerima Manfaat ({institutions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bahan')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === 'bahan'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Apple className="w-4 h-4" />
          <span>B. Master Bahan Pangan ({masterBahan.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('supplier')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === 'supplier'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>C. Master Supplier ({masterSuppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('relawan')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === 'relawan'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>D. Master Relawan ({masterVolunteers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('satuan')}
          className={`pb-3 flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === 'satuan'
              ? 'border-blue-900 dark:border-sky-500 text-blue-900 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>E. Master Satuan & Dimensi Bahan ({materialConversions.length})</span>
        </button>
      </div>

      {/* Tab A Content: Master Penerima Manfaat */}
      {activeTab === 'penerima' && (
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
        />
      )}

      {/* Tab B Content: Master Bahan Pangan */}
      {activeTab === 'bahan' && (
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
        />
      )}

      {/* Tab C Content: Master Supplier */}
      {activeTab === 'supplier' && (
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
        />
      )}

      {/* Tab D Content: Master Relawan */}
      {activeTab === 'relawan' && (
        <DataTable
          title="Master Data Relawan Satuan Pelayanan"
          subtitle="Daftar 28 relawan aktif per divisi kerja (Persiapan, Pengolahan, Pemorsian, Distribusi, Cuci Ompreng)"
          data={masterVolunteers}
          columns={volunteerColumns}
          keyExtractor={item => item.id}
          searchPlaceholder="Cari nama relawan, divisi, jabatan..."
          searchKeys={['name', 'code', 'division', 'position', 'phone']}
          onExportExcel={() => exportToExcel(masterVolunteers, 'Master_Relawan_SPPG', 'Relawan')}
          onPrint={triggerPrint}
        />
      )}

      {/* Tab E Content: Master Satuan & Konversi Dimensi */}
      {activeTab === 'satuan' && (
        <div className="space-y-6">
          {/* Interactive Calculator Component */}
          <div className="bg-linear-to-r from-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-blue-900">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-sky-300">
                Kalkulator Konversi Satuan Berbasis Dimensi & Spesifikasi Bahan
              </h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 max-w-2xl">
              Sistem tidak mengasumsikan 1 buah memiliki berat sama untuk semua bahan. Misalnya: 1 buah semangka (~3.000g) vs 1 butir telur (~60g) vs 1 buah pisang (~120g).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-white/10 p-4 rounded-xl backdrop-blur-xs">
              <div>
                <label className="block text-xs font-bold text-sky-200 mb-1">Pilih Bahan Pangan</label>
                <select
                  value={calcMaterial}
                  onChange={e => setCalcMaterial(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-900 text-white font-bold"
                >
                  {materialConversions.map(c => (
                    <option key={c.materialName} value={c.materialName}>
                      {c.materialName} ({c.gramsPerUnit} gram / {c.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-200 mb-1">
                  Jumlah Satuan ({selectedConv?.unit || 'unit'})
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={calcInputUnitQty}
                  onChange={e => setCalcInputUnitQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-900 text-white font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-sky-500/20 border border-sky-400/40 rounded-xl text-center">
                <span className="text-[10px] text-sky-200 uppercase font-bold block">Hasil Ekuivalen Berat:</span>
                <span className="text-xl font-black font-mono text-white">
                  {formatNumber(calculatedTotalGrams)} gram <span className="text-xs font-normal">({calculatedTotalKg} kg)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Table: Master Satuan Konfigurasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Daftar Master Satuan Dasar (10 Satuan)
                </h4>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('satuan')}
                  className="text-xs font-bold text-blue-900 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Satuan
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-2">Kode</th>
                      <th className="p-2">Nama Satuan</th>
                      <th className="p-2">Tipe Dimensi</th>
                      <th className="p-2 text-right">Ekuivalen Dasar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {masterUnits.map(u => (
                      <tr key={u.id}>
                        <td className="p-2 font-bold text-blue-900 dark:text-sky-400">{u.code}</td>
                        <td className="p-2 font-sans">{u.name}</td>
                        <td className="p-2 font-sans text-slate-500">{u.type}</td>
                        <td className="p-2 text-right">
                          {u.conversionToBase} {u.baseUnit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table: Konversi Dimensi Spesifik Bahan */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Spesifikasi Berat per Dimensi Bahan Pangan
                </h4>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('konversi')}
                  className="text-xs font-bold text-blue-900 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Konversi
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-2">Komoditas Bahan</th>
                      <th className="p-2">Satuan Dimensi</th>
                      <th className="p-2 text-right">Berat Rata-rata (gram)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {materialConversions.map((c, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-sans font-semibold text-slate-900 dark:text-white">
                          {c.materialName}
                          {c.notes && <span className="block text-[10px] text-slate-400 font-normal">{c.notes}</span>}
                        </td>
                        <td className="p-2 font-sans">{c.unit}</td>
                        <td className="p-2 text-right font-bold text-emerald-600">
                          {formatNumber(c.gramsPerUnit)} g
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
                    onChange={e => setFormInst({ ...formInst, institutionType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Sekolah Dasar (SD)">Sekolah Dasar (SD)</option>
                    <option value="Madrasah Ibtidaiyah (MI)">Madrasah Ibtidaiyah (MI)</option>
                    <option value="SMP">SMP</option>
                    <option value="MTs">MTs</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                    <option value="PAUD/TK">PAUD/TK</option>
                    <option value="Pondok Pesantren">Pondok Pesantren</option>
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
                  <input
                    type="number"
                    min="0"
                    value={formInst.smallPortions}
                    onChange={e => setFormInst({ ...formInst, smallPortions: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Porsi Besar (SD 4-6, SMP, SMA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formInst.largePortions}
                    onChange={e => setFormInst({ ...formInst, largePortions: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Porsi (Otomatis)</label>
                  <input
                    type="text"
                    disabled
                    value={Number(formInst.smallPortions) + Number(formInst.largePortions)}
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
                    onChange={e => setFormBahan({ ...formBahan, name: e.target.value })}
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Satuan Dasar *</label>
                  <input
                    type="text"
                    required
                    value={formBahan.unit}
                    onChange={e => setFormBahan({ ...formBahan, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Harga Acuan (Rp) *</label>
                  <input
                    type="number"
                    value={formBahan.referencePrice}
                    onChange={e => setFormBahan({ ...formBahan, referencePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Harga Aktual Pasar (Rp) *</label>
                  <input
                    type="number"
                    value={formBahan.actualPrice}
                    onChange={e => setFormBahan({ ...formBahan, actualPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Stok Minimum *</label>
                  <input
                    type="number"
                    value={formBahan.minimumStock}
                    onChange={e => setFormBahan({ ...formBahan, minimumStock: Number(e.target.value) })}
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
                    <input
                      type="number"
                      value={formBahan.calories100g}
                      onChange={e => setFormBahan({ ...formBahan, calories100g: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formBahan.protein100g}
                      onChange={e => setFormBahan({ ...formBahan, protein100g: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Lemak (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formBahan.fat100g}
                      onChange={e => setFormBahan({ ...formBahan, fat100g: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Karbo (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formBahan.carb100g}
                      onChange={e => setFormBahan({ ...formBahan, carb100g: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Serat (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formBahan.fiber100g}
                      onChange={e => setFormBahan({ ...formBahan, fiber100g: Number(e.target.value) })}
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
                    {['Persiapan', 'Pengolahan', 'Pemorsian', 'Distribusi', 'Cuci Ompreng', 'Kebersihan'].map(d => (
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Satuan Dimensi Fisik *</label>
                  <input
                    type="text"
                    required
                    placeholder="buah / butir / ikat / papan"
                    value={formConv.unit}
                    onChange={e => setFormConv({ ...formConv, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ekuivalen Berat (gram per unit) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formConv.gramsPerUnit}
                    onChange={e => setFormConv({ ...formConv, gramsPerUnit: Number(e.target.value) })}
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
