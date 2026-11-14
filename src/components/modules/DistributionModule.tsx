import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import {
  BASTDocumentSheet,
  resolveBastAutoFields,
  generateBastNumber,
  exportBastDocumentPDF,
} from '../common/BASTDocumentSheet';
import { exportTableToPDF, exportToExcel, formatNumber, triggerPrint } from '../../lib/exportUtils';
import { DistributionDeliveryRecord, DistributionLog, DynamicFormId, OmprengReturnRecord } from '../../types';
import { processFacilityImageUpload } from '../common/FacilityTempUploadSection';
import {
  DynamicFormEditToggleBar,
  DynamicFormBuilderPanel,
  DynamicFormRenderer,
  validateDynamicFormFields,
} from '../common/DynamicFormBuilder';
import {
  appendDynamicExcelFields,
  appendDynamicExportColumns,
  buildDynamicTableColumns,
  getInitialCustomFieldValues,
} from '../../lib/dynamicFormSchemas';
import {
  Truck,
  Plus,
  Eye,
  Clock,
  MapPin,
  Printer,
  FileCheck,
  Download,
  RotateCcw,
  Camera,
  Upload,
  X,
  ClipboardCheck,
  Building2,
} from 'lucide-react';

export const DistributionModule: React.FC = () => {
  const {
    distributionLogs,
    distributionDeliveries,
    omprengReturns,
    institutions,
    beneficiaryAttendance,
    masterVolunteers,
    addDistributionLog,
    updateDistributionLog,
    addDistributionDelivery,
    updateDistributionDelivery,
    addOmprengReturn,
    updateOmprengReturn,
    currentUser,
    hasPermission,
    sppgConfig,
    dynamicFormSchemas,
    addToast,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'pengiriman' | 'pengembalian' | 'armada'>('pengiriman');
  const [selectedLog, setSelectedLog] = useState<DistributionLog | null>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bastReturnTimeInput, setBastReturnTimeInput] = useState('');
  const [isEditingDistSchema, setIsEditingDistSchema] = useState(false);
  const [distBuilderFormId, setDistBuilderFormId] = useState<DynamicFormId>('distribution_dispatch_form');
  const [isDispatchModalEdit, setIsDispatchModalEdit] = useState(false);
  const [isReportModalEdit, setIsReportModalEdit] = useState(false);

  // Lightbox & Delivery/Return Modal States
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [selectedDeliveryForBast, setSelectedDeliveryForBast] = useState<DistributionDeliveryRecord | null>(null);
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [isReturnFormOpen, setIsReturnFormOpen] = useState(false);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);

  const [deliveryForm, setDeliveryForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    institutionId: institutions[0]?.id || '',
    departureTime: '08:15 WIB',
    arrivalTime: '08:35 WIB',
    driverName: 'Agus Santoso',
    vehicleNumber: 'N 8921 RA (Armada Box Isothermal 1)',
    picName: institutions[0]?.picName || 'Kepala Sekolah',
    status: 'Selesai Serah Terima' as DistributionDeliveryRecord['status'],
    picOrganolepticPhoto: '',
    handoverPhoto: '',
    locationPhoto: '',
    activityPhoto: '',
    notes: 'Boks termal tersegel rapi, uji organoleptik PIC disetujui, dan serah terima selesai di lokasi.',
  });

  const [returnForm, setReturnForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    institutionId: institutions[0]?.id || '',
    smallPortions: institutions[0]?.smallPortions || 0,
    largePortions: institutions[0]?.largePortions || 0,
    departureTime: '12:30 WIB',
    arrivalTime: '13:05 WIB',
    driverName: 'Agus Santoso',
    vehicleNumber: 'N 8921 RA',
    receivedByOfficer: currentUser.name || 'Fahrur Rozi (Div. Cuci Ompreng)',
    conditionStatus: 'Lengkap & Utuh' as OmprengReturnRecord['conditionStatus'],
    returnHandoverPhoto: '',
    locationPhoto: '',
    activityPhoto: '',
    notes: 'Seluruh ompreng stainless kembali utuh dan siap disterilisasi.',
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    processFacilityImageUpload(e, callback, msg => addToast('error', 'Upload Foto Gagal', msg));
  };

  const openNewDeliveryModal = () => {
    const defaultInst = institutions[0];
    setEditingDeliveryId(null);
    setDeliveryForm({
      date: new Date().toISOString().slice(0, 10),
      institutionId: defaultInst?.id || '',
      departureTime: '08:15 WIB',
      arrivalTime: '08:35 WIB',
      driverName: 'Agus Santoso',
      vehicleNumber: 'N 8921 RA (Armada Box Isothermal 1)',
      picName: defaultInst?.picName || defaultInst?.contactPerson || 'Kepala Sekolah',
      status: 'Selesai Serah Terima',
      picOrganolepticPhoto: '',
      handoverPhoto: '',
      locationPhoto: '',
      activityPhoto: '',
      notes: 'Boks termal tersegel rapi, uji organoleptik PIC disetujui, dan serah terima selesai di lokasi.',
    });
    setIsDeliveryFormOpen(true);
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
      picName: rec.picName,
      status: rec.status,
      picOrganolepticPhoto: rec.picOrganolepticPhoto || '',
      handoverPhoto: rec.handoverPhoto || '',
      locationPhoto: rec.locationPhoto || '',
      activityPhoto: rec.activityPhoto || '',
      notes: rec.notes || '',
    });
    setIsDeliveryFormOpen(true);
  };

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
        picOrganolepticPhoto: deliveryForm.picOrganolepticPhoto || undefined,
        handoverPhoto: deliveryForm.handoverPhoto || undefined,
        locationPhoto: deliveryForm.locationPhoto || undefined,
        activityPhoto: deliveryForm.activityPhoto || undefined,
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
        picOrganolepticPhoto: deliveryForm.picOrganolepticPhoto || undefined,
        handoverPhoto: deliveryForm.handoverPhoto || undefined,
        locationPhoto: deliveryForm.locationPhoto || undefined,
        activityPhoto: deliveryForm.activityPhoto || undefined,
        bastNumber,
        picName: deliveryForm.picName || inst.picName || 'Kepala Sekolah',
        status: deliveryForm.status,
        notes: deliveryForm.notes,
      });
    }
    setIsDeliveryFormOpen(false);
    setEditingDeliveryId(null);
  };

  const openNewReturnModal = () => {
    const defaultInst = institutions[0];
    setEditingReturnId(null);
    setReturnForm({
      date: new Date().toISOString().slice(0, 10),
      institutionId: defaultInst?.id || '',
      smallPortions: defaultInst?.smallPortions || 0,
      largePortions: defaultInst?.largePortions || 0,
      departureTime: '12:30 WIB',
      arrivalTime: '13:05 WIB',
      driverName: 'Agus Santoso',
      vehicleNumber: 'N 8921 RA',
      receivedByOfficer: currentUser.name || 'Fahrur Rozi (Div. Cuci Ompreng)',
      conditionStatus: 'Lengkap & Utuh',
      returnHandoverPhoto: '',
      locationPhoto: '',
      activityPhoto: '',
      notes: 'Seluruh ompreng stainless kembali utuh dan siap disterilisasi.',
    });
    setIsReturnFormOpen(true);
  };

  const openEditReturnModal = (ret: OmprengReturnRecord) => {
    setEditingReturnId(ret.id);
    setReturnForm({
      date: ret.date,
      institutionId: ret.institutionId,
      smallPortions: ret.smallPortions,
      largePortions: ret.largePortions,
      departureTime: ret.departureTime,
      arrivalTime: ret.arrivalTime,
      driverName: ret.driverName,
      vehicleNumber: ret.vehicleNumber,
      receivedByOfficer: ret.receivedByOfficer,
      conditionStatus: ret.conditionStatus,
      returnHandoverPhoto: ret.returnHandoverPhoto || '',
      locationPhoto: ret.locationPhoto || '',
      activityPhoto: ret.activityPhoto || '',
      notes: ret.notes || '',
    });
    setIsReturnFormOpen(true);
  };

  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutions.find(i => i.id === returnForm.institutionId) || institutions[0];
    if (!inst) return;
    const smallQty = Number(returnForm.smallPortions) || 0;
    const largeQty = Number(returnForm.largePortions) || 0;
    if (editingReturnId) {
      await updateOmprengReturn(editingReturnId, {
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
        receivedByOfficer: returnForm.receivedByOfficer || 'Fahrur Rozi (Div. Cuci Ompreng)',
        conditionStatus: returnForm.conditionStatus,
        returnHandoverPhoto: returnForm.returnHandoverPhoto || undefined,
        locationPhoto: returnForm.locationPhoto || undefined,
        activityPhoto: returnForm.activityPhoto || undefined,
        notes: returnForm.notes,
      });
    } else {
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
        receivedByOfficer: returnForm.receivedByOfficer || 'Fahrur Rozi (Div. Cuci Ompreng)',
        conditionStatus: returnForm.conditionStatus,
        returnHandoverPhoto: returnForm.returnHandoverPhoto || undefined,
        locationPhoto: returnForm.locationPhoto || undefined,
        activityPhoto: returnForm.activityPhoto || undefined,
        notes: returnForm.notes,
      });
    }
    setIsReturnFormOpen(false);
    setEditingReturnId(null);
  };

  // Status Update Form State
  const [newStatus, setNewStatus] = useState<DistributionLog['status']>('Selesai Serah Terima');
  const [newArrivalTime, setNewArrivalTime] = useState('09:45 WIB');
  const [newReceivedBy, setNewReceivedBy] = useState('Drs. Slamet Hariyanto');
  const [newReceiverTitle, setNewReceiverTitle] = useState('Kepala Sekolah');
  const [arrivalTemp, setArrivalTemp] = useState<number>(64.5);
  const [photoEvidenceUrl, setPhotoEvidenceUrl] = useState<string>('');
  const [notesInput, setNotesInput] = useState('Diterima utuh tanpa cacat, porsi dihitung bersama tim guru.');
  const [reportCustomFields, setReportCustomFields] = useState<Record<string, any>>({});

  // Create Form State
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id || '');
  const [vehicleNumber, setVehicleNumber] = useState('N 8921 RA (Armada 1)');
  const [driverName, setDriverName] = useState('Agus Santoso');
  const [departureTime, setDepartureTime] = useState('08:30 WIB');
  const [dispatchTemp, setDispatchTemp] = useState<number>(68.0);
  const [dispatchCustomFields, setDispatchCustomFields] = useState<Record<string, any>>(
    getInitialCustomFieldValues(dynamicFormSchemas.distribution_dispatch_form)
  );

  const handleOpenUpdate = (log: DistributionLog) => {
    const matchedInst = institutions.find(i => i.id === log.institutionId);
    setSelectedLog(log);
    setNewStatus(log.status);
    setNewArrivalTime(log.arrivalTime || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    setNewReceivedBy(log.receivedBy || matchedInst?.picName || matchedInst?.contactPerson || '');
    setNewReceiverTitle(log.receiverTitle || 'PIC Penerima Manfaat / Kepala Sekolah');
    setArrivalTemp(log.foodTempAtArrival || 64.0);
    setPhotoEvidenceUrl(log.photoEvidenceUrl || '');
    setNotesInput(log.notes || '');
    setReportCustomFields(
      getInitialCustomFieldValues(dynamicFormSchemas.distribution_report_form, log.customFields)
    );
    setIsReportModalEdit(false);
    setIsUpdateOpen(true);
  };

  const handleOpenDetail = (log: DistributionLog) => {
    setSelectedLog(log);
    setBastReturnTimeInput('');
    setIsDetailOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedLog) return;
    const err = validateDynamicFormFields(dynamicFormSchemas.distribution_report_form, {
      status: newStatus,
      arrivalTime: newArrivalTime,
      foodTempAtArrival: arrivalTemp,
      receivedBy: newReceivedBy,
      receiverTitle: newReceiverTitle,
      photoEvidenceUrl,
      notes: notesInput,
      ...reportCustomFields,
    });
    if (err) {
      addToast('error', 'Validasi Laporan Distribusi', err);
      return;
    }

    const bastNumber =
      selectedLog.bastNumber ||
      generateBastNumber(191 + (institutions.findIndex(i => i.id === selectedLog.institutionId) + 1 || 1), selectedLog.date);
    await updateDistributionLog(selectedLog.id, {
      status: newStatus,
      arrivalTime: newArrivalTime,
      receivedBy: newReceivedBy,
      receiverTitle: newReceiverTitle,
      foodTempAtArrival: arrivalTemp,
      photoEvidenceUrl: photoEvidenceUrl || undefined,
      notes: notesInput,
      bastNumber,
      customFields: {
        ...(selectedLog.customFields || {}),
        ...reportCustomFields,
      },
    });
    setIsUpdateOpen(false);
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateDynamicFormFields(dynamicFormSchemas.distribution_dispatch_form, {
      institutionId,
      vehicleNumber,
      driverName,
      departureTime,
      foodTempAtDispatch: dispatchTemp,
      ...dispatchCustomFields,
    });
    if (err) {
      addToast('error', 'Validasi Keberangkatan Armada', err);
      return;
    }

    const inst = institutions.find(i => i.id === institutionId) || institutions[0];
    await addDistributionLog({
      date: new Date().toISOString().slice(0, 10),
      institutionId: inst.id,
      institutionName: inst.name,
      smallPortions: inst.smallPortions,
      largePortions: inst.largePortions,
      totalPortions: inst.totalPortions,
      vehicleNumber,
      driverName,
      departureTime,
      arrivalTime: '-',
      foodTempAtDispatch: dispatchTemp,
      status: 'Dalam Perjalanan',
      notes: 'Boks termal tersegel rapi.',
      customFields: dispatchCustomFields,
    });
    setDispatchCustomFields(
      getInitialCustomFieldValues(dynamicFormSchemas.distribution_dispatch_form)
    );
    setIsCreateOpen(false);
  };

  // Export handlers (Auto-synced with custom fields from both distribution forms)
  const mergedDistCustomSchema = {
    ...dynamicFormSchemas.distribution_report_form,
    fields: [
      ...dynamicFormSchemas.distribution_dispatch_form.fields.filter(f => !f.isSystem),
      ...dynamicFormSchemas.distribution_report_form.fields,
    ],
  };

  const handleExportPDF = () => {
    const baseHeaders = ['Sekolah Sasaran', 'Porsi', 'Armada & Supir', 'Jam Berangkat / Tiba', 'Suhu (°C)', 'Penerima', 'Status'];
    const baseRows = distributionLogs.map(d => [
      d.institutionName,
      `${formatNumber(d.totalPortions)} (${d.smallPortions}K / ${d.largePortions}B)`,
      `${d.vehicleNumber} - ${d.driverName}`,
      `${d.departureTime} / ${d.arrivalTime}`,
      `${d.foodTempAtDispatch}°C -> ${d.foodTempAtArrival || '-'}°C`,
      d.receivedBy || 'Belum Diterima',
      d.status,
    ]);
    const { headers, rows } = appendDynamicExportColumns(
      mergedDistCustomSchema,
      baseHeaders,
      baseRows,
      distributionLogs
    );
    exportTableToPDF({
      title: 'Laporan Rekapitulasi Distribusi & Pengiriman MBG',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers,
      rows,
      fileName: 'Rekap_Distribusi_Armada_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = distributionLogs.map(d =>
      appendDynamicExcelFields(
        mergedDistCustomSchema,
        {
          'Tanggal': d.date,
          'Nama Sekolah': d.institutionName,
          'Porsi Kecil': d.smallPortions,
          'Porsi Besar': d.largePortions,
          'Total Porsi': d.totalPortions,
          'Armada Kendaraan': d.vehicleNumber,
          'Nama Pengemudi': d.driverName,
          'Waktu Berangkat': d.departureTime,
          'Waktu Tiba': d.arrivalTime,
          'Suhu Keberangkatan (°C)': d.foodTempAtDispatch,
          'Suhu Tiba (°C)': d.foodTempAtArrival || '-',
          'Nama Penerima': d.receivedBy || '-',
          'Jabatan Penerima': d.receiverTitle || '-',
          'Nomor BAST': d.bastNumber || '-',
          'Status': d.status,
        },
        d
      )
    );
    exportToExcel(dataToExport, 'Distribusi_MBG_SPPG_TMG2', 'Data Distribusi');
  };

  const columns: Column<DistributionLog>[] = [
    {
      key: 'institutionName',
      header: 'Lembaga Sekolah Sasaran',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">
            {row.institutionName}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {formatNumber(row.totalPortions)} Porsi ({row.smallPortions} Kecil / {row.largePortions} Besar)
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Armada & Pengemudi',
      render: row => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-sky-600" />
            <span>{row.vehicleNumber}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Supir: {row.driverName}
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Waktu Perjalanan',
      render: row => (
        <div className="text-xs font-mono">
          <div className="text-slate-700 dark:text-slate-300">
            Kirim: {row.departureTime}
          </div>
          <div className="text-[11px] text-slate-500">
            Tiba: {row.arrivalTime}
          </div>
        </div>
      ),
    },
    {
      key: 'temp',
      header: 'Suhu Wadah Termal',
      render: row => (
        <div className="text-xs font-mono">
          <div className="text-emerald-600 font-bold">
            Berangkat: {row.foodTempAtDispatch}°C
          </div>
          <div className="text-[11px] text-slate-500">
            Tiba: {row.foodTempAtArrival ? `${row.foodTempAtArrival}°C` : '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Pengiriman',
      render: row => {
        const badgeColors = {
          'Dijadwalkan': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          'Dalam Perjalanan': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 animate-pulse',
          'Tiba di Lokasi': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          'Selesai Serah Terima': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        };
        return (
          <div className="space-y-0.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColors[row.status]}`}>
              {row.status}
            </span>
            {row.receivedBy && (
              <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                Oleh: {row.receivedBy}
              </div>
            )}
          </div>
        );
      },
    },
    ...buildDynamicTableColumns<DistributionLog>(mergedDistCustomSchema),
    {
      key: 'actions',
      header: 'Aksi & Surat Jalan',
      align: 'right',
      render: row => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenDetail(row)}
            className="p-1.5 text-slate-600 hover:text-blue-900 dark:text-slate-400 dark:hover:text-sky-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Lihat BAST & Surat Jalan"
          >
            <Eye className="w-4 h-4" />
          </button>

          {hasPermission('distribution', 'edit') && (
            <button
              onClick={() => handleOpenUpdate(row)}
              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded-md text-[11px] font-bold transition flex items-center gap-1"
              title="Perbarui Status Serah Terima"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Update BAST</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Distribusi Pangan, Pengembalian Ompreng &amp; Armada MBG
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Input data pengiriman (foto uji organoleptik, serah terima &amp; lokasi), pengembalian ompreng (foto pengembalian &amp; lokasi), dan BAST digital armada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('distribution', 'create') && (
            <>
              <button
                type="button"
                onClick={openNewDeliveryModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Input Data Pengiriman</span>
              </button>
              <button
                type="button"
                onClick={openNewReturnModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Input Pengembalian Ompreng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDispatchCustomFields(
                    getInitialCustomFieldValues(dynamicFormSchemas.distribution_dispatch_form)
                  );
                  setIsDispatchModalEdit(false);
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition"
              >
                <Truck className="w-4 h-4" />
                <span>Keberangkatan Armada</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('pengiriman')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeSubTab === 'pengiriman'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Pengiriman &amp; Bukti Foto (Organoleptik, Serah Terima, Lokasi)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {distributionDeliveries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pengembalian')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeSubTab === 'pengembalian'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Pengembalian Ompreng &amp; Foto Lokasi</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {omprengReturns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('armada')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap border-b-2 ${
            activeSubTab === 'armada'
              ? 'border-blue-900 text-blue-900 dark:border-sky-400 dark:text-sky-400 bg-blue-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Log Armada &amp; BAST Digital</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
            {distributionLogs.length}
          </span>
        </button>
      </div>

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Pengiriman Tercatat</div>
          <div className="text-2xl font-black text-blue-900 dark:text-sky-400 mt-1 tabular-nums">
            {distributionDeliveries.length} Rute
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Terhubung BAST &amp; Organoleptik</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Pengembalian Ompreng</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
            {omprengReturns.length} Lembaga
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {formatNumber(omprengReturns.reduce((s, r) => s + r.totalPortions, 0))} Ompreng Kembali
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Kelengkapan 3 Foto Kirim</div>
          <div className="text-2xl font-black text-sky-600 mt-1 tabular-nums">
            {distributionDeliveries.filter(d => d.picOrganolepticPhoto && d.handoverPhoto && d.locationPhoto).length}/{distributionDeliveries.length}
          </div>
          <div className="text-[11px] text-sky-600 font-semibold mt-0.5">Organoleptik, Serah Terima, Lokasi</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Ompreng Terkirim</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(distributionDeliveries.reduce((s, d) => s + d.totalPortions, 0))} Boks
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Siap Audit Harian</div>
        </div>
      </div>

      {/* TAB 1: PENGIRIMAN & BUKTI FOTO (UJI ORGANOLEPTIK, SERAH TERIMA, LOKASI) */}
      {activeSubTab === 'pengiriman' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-900 dark:text-sky-400" />
                <span>Daftar Pengiriman Makanan MBG &amp; Dokumentasi 3 Foto Lapangan</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mencakup Foto Uji Organoleptik, Foto Serah Terima, dan Foto Lokasi untuk setiap sekolah penerima manfaat.
              </p>
            </div>
            {hasPermission('distribution', 'create') && (
              <button
                type="button"
                onClick={openNewDeliveryModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Data Pengiriman</span>
              </button>
            )}
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
                      <span className="text-[11px] font-mono text-slate-400">{d.date}</span>
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
                        <span>Lihat / Cetak BAST</span>
                      </button>
                      {hasPermission('distribution', 'edit') && (
                        <button
                          type="button"
                          onClick={() => openEditDeliveryModal(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Edit / Upload Foto</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3 Required Photo Slots + Optional Activity */}
                  <div className="grid grid-cols-3 gap-2.5 shrink-0">
                    {[
                      { label: 'Uji Organoleptik', url: d.picOrganolepticPhoto },
                      { label: 'Serah Terima', url: d.handoverPhoto },
                      { label: 'Foto Lokasi', url: d.locationPhoto },
                    ].map(ph => (
                      <div key={ph.label} className="text-center w-20">
                        {ph.url ? (
                          <img
                            src={ph.url}
                            alt={ph.label}
                            onClick={() => setViewPhotoUrl(ph.url || null)}
                            className="w-20 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditDeliveryModal(d)}
                            className="w-20 h-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-400 hover:border-blue-500 hover:text-blue-600 transition"
                          >
                            <Upload className="w-3.5 h-3.5 mb-0.5" />
                            <span>Upload</span>
                          </button>
                        )}
                        <span className="text-[10px] font-medium text-slate-500 block mt-1 leading-tight">{ph.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PENGEMBALIAN OMPRENG & FOTO LOKASI */}
      {activeSubTab === 'pengembalian' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                <span>Daftar Pengembalian Ompreng Kosong &amp; Dokumentasi Foto</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan jumlah ompreng kembali disertai Upload Foto Pengembalian dan Upload Foto Lokasi penjemputan.
              </p>
            </div>
            {hasPermission('distribution', 'create') && (
              <button
                type="button"
                onClick={openNewReturnModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pengembalian Ompreng</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {omprengReturns.map(ret => (
              <div key={ret.id} className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-slate-900 dark:text-white">{ret.institutionName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {ret.conditionStatus}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{ret.date}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                      <span>Kecil: <strong>{ret.smallPortions}</strong></span>
                      <span>•</span>
                      <span>Besar: <strong>{ret.largePortions}</strong></span>
                      <span>•</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">Total Kembali: {ret.totalPortions} Ompreng</span>
                      <span>•</span>
                      <span>Armada: <strong>{ret.vehicleNumber}</strong> ({ret.driverName})</span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Jemput: {ret.departureTime} → Tiba SPPG: {ret.arrivalTime}
                      </span>
                      <span>•</span>
                      <span>Diterima oleh: <strong>{ret.receivedByOfficer}</strong></span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1">
                      "{ret.notes}"
                    </p>

                    {hasPermission('distribution', 'edit') && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => openEditReturnModal(ret)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Edit / Upload Foto</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2 Required Photo Slots: Pengembalian & Lokasi */}
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    {[
                      { label: 'Foto Pengembalian', url: ret.returnHandoverPhoto },
                      { label: 'Foto Lokasi', url: ret.locationPhoto },
                    ].map(ph => (
                      <div key={ph.label} className="text-center w-24">
                        {ph.url ? (
                          <img
                            src={ph.url}
                            alt={ph.label}
                            onClick={() => setViewPhotoUrl(ph.url || null)}
                            className="w-24 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditReturnModal(ret)}
                            className="w-24 h-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-400 hover:border-emerald-500 hover:text-emerald-600 transition"
                          >
                            <Upload className="w-3.5 h-3.5 mb-0.5" />
                            <span>Upload</span>
                          </button>
                        )}
                        <span className="text-[10px] font-medium text-slate-500 block mt-1">{ph.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LOG ARMADA & BAST DIGITAL (EXISTING) */}
      {activeSubTab === 'armada' && (
        <div className="space-y-6">
          {/* Dynamic & Editable Form Toggle Bar (Admin/Superuser Only) */}
          <DynamicFormEditToggleBar
            formId={distBuilderFormId}
            isEditing={isEditingDistSchema}
            onToggleEdit={() => setIsEditingDistSchema(v => !v)}
            extraSelector={
              <select
                value={distBuilderFormId}
                onChange={e => setDistBuilderFormId(e.target.value as DynamicFormId)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="distribution_dispatch_form">Form Keberangkatan Armada</option>
                <option value="distribution_report_form">Form Laporan Serah Terima</option>
              </select>
            }
          />

          {isEditingDistSchema && (
            <DynamicFormBuilderPanel
              formId={distBuilderFormId}
              onClose={() => setIsEditingDistSchema(false)}
            />
          )}

          {/* Distribution Data Table */}
          <DataTable
            title="Daftar Log Pengiriman & Surat Jalan Armada SPPG"
            subtitle="Riwayat keberangkatan armada, suhu wadah, dan tanda terima sekolah"
            data={distributionLogs}
            columns={columns}
            keyExtractor={item => item.id}
            searchPlaceholder="Cari sekolah, nomor kendaraan, atau supir..."
            searchKeys={['institutionName', 'vehicleNumber', 'driverName', 'receivedBy', 'status']}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onPrint={triggerPrint}
          />
        </div>
      )}

      {/* Modal: Dispatch New Fleet (Dynamic & Editable Form) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Catat Keberangkatan Armada Distribusi"
        subtitle="Pemberangkatan kloter pengiriman makanan siap saji ke sekolah"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateDispatch} className="space-y-4">
          <DynamicFormEditToggleBar
            formId="distribution_dispatch_form"
            isEditing={isDispatchModalEdit}
            onToggleEdit={() => setIsDispatchModalEdit(v => !v)}
            compact
          />
          {isDispatchModalEdit && (
            <DynamicFormBuilderPanel
              formId="distribution_dispatch_form"
              onClose={() => setIsDispatchModalEdit(false)}
            />
          )}

          <DynamicFormRenderer
            schema={dynamicFormSchemas.distribution_dispatch_form}
            values={{
              institutionId,
              vehicleNumber,
              driverName,
              departureTime,
              foodTempAtDispatch: dispatchTemp,
              ...dispatchCustomFields,
            }}
            dynamicOptions={{
              institutionId: institutions.map(inst => ({
                value: inst.id,
                label: `${inst.name} (${formatNumber(inst.totalPortions)} porsi)`,
              })),
            }}
            onChange={(key, value, field) => {
              if (!field.isSystem) {
                setDispatchCustomFields(prev => ({ ...prev, [key]: value }));
              } else if (key === 'institutionId') setInstitutionId(value);
              else if (key === 'vehicleNumber') setVehicleNumber(value);
              else if (key === 'driverName') setDriverName(value);
              else if (key === 'departureTime') setDepartureTime(value);
              else if (key === 'foodTempAtDispatch') setDispatchTemp(Number(value));
            }}
            onUploadError={msg => addToast('error', 'Gagal Unggah Foto', msg)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 rounded-lg shadow-sm transition"
            >
              Lepas Keberangkatan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update BAST & Arrival Info (Dynamic & Editable Form) */}
      <Modal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        title="Konfirmasi Serah Terima (BAST)"
        subtitle={`Sekolah: ${selectedLog?.institutionName}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <DynamicFormEditToggleBar
            formId="distribution_report_form"
            isEditing={isReportModalEdit}
            onToggleEdit={() => setIsReportModalEdit(v => !v)}
            compact
          />
          {isReportModalEdit && (
            <DynamicFormBuilderPanel
              formId="distribution_report_form"
              onClose={() => setIsReportModalEdit(false)}
            />
          )}

          <DynamicFormRenderer
            schema={dynamicFormSchemas.distribution_report_form}
            values={{
              status: newStatus,
              arrivalTime: newArrivalTime,
              foodTempAtArrival: arrivalTemp,
              receivedBy: newReceivedBy,
              receiverTitle: newReceiverTitle,
              photoEvidenceUrl,
              notes: notesInput,
              ...reportCustomFields,
            }}
            onChange={(key, value, field) => {
              if (!field.isSystem) {
                setReportCustomFields(prev => ({ ...prev, [key]: value }));
              } else if (key === 'status') setNewStatus(value);
              else if (key === 'arrivalTime') setNewArrivalTime(value);
              else if (key === 'foodTempAtArrival') setArrivalTemp(Number(value));
              else if (key === 'receivedBy') setNewReceivedBy(value);
              else if (key === 'receiverTitle') setNewReceiverTitle(value);
              else if (key === 'photoEvidenceUrl') setPhotoEvidenceUrl(value);
              else if (key === 'notes') setNotesInput(value);
            }}
            onUploadError={msg => addToast('error', 'Gagal Unggah Foto', msg)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsUpdateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveStatus}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
            >
              Simpan BAST Digital
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: View & Print Surat Jalan & BAST */}
      {selectedLog && isDetailOpen && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Berita Acara Serah Terima (BAST) & Alat Makan`}
          subtitle={`No. BAST: ${
            selectedLog.bastNumber ||
            generateBastNumber(
              191 + (institutions.findIndex(i => i.id === selectedLog.institutionId) + 1 || 1),
              selectedLog.date
            )
          }`}
          maxWidth="4xl"
        >
          {(() => {
            const instIndex = institutions.findIndex(i => i.id === selectedLog.institutionId);
            const fallbackNum = generateBastNumber(191 + (instIndex >= 0 ? instIndex + 1 : 1), selectedLog.date);
            const matchedAtt = beneficiaryAttendance.find(
              a => a.institutionId === selectedLog.institutionId && a.date === selectedLog.date
            );
            const bastData = resolveBastAutoFields({
              institutions,
              beneficiaryAttendance,
              masterVolunteers,
              distributionLogs,
              sppgConfig,
              institutionId: selectedLog.institutionId,
              institutionName: selectedLog.institutionName,
              date: selectedLog.date,
              bastNumber: selectedLog.bastNumber || fallbackNum,
              totalPortions: matchedAtt ? matchedAtt.actualPortions : selectedLog.totalPortions,
              picName: selectedLog.receivedBy || undefined,
              distributorName: selectedLog.driverName,
              receiveTime: selectedLog.arrivalTime !== '-' ? selectedLog.arrivalTime : selectedLog.departureTime,
              returnTime: bastReturnTimeInput,
            });

            return (
              <div className="space-y-4 print-section">
                {/* Info Armada & Jam Kembali (Hidden on Print) */}
                <div className="print:hidden p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <div className="text-[10px] text-slate-500">Armada / Pengemudi</div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {selectedLog.vehicleNumber} ({selectedLog.driverName})
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Suhu Wadah & Rincian Porsi</div>
                    <div className="font-mono font-bold text-emerald-600">
                      {selectedLog.foodTempAtArrival || selectedLog.foodTempAtDispatch}°C • {selectedLog.smallPortions}K / {selectedLog.largePortions}B
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Jam Penyerahan Alat Makan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Kosongkan untuk ........ WIB"
                      value={bastReturnTimeInput}
                      onChange={e => setBastReturnTimeInput(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>

                {/* Official BAST Sheet */}
                <BASTDocumentSheet data={bastData} />

                <div className="print:hidden flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => exportBastDocumentPDF(bastData)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF BAST</span>
                  </button>
                  <button
                    onClick={triggerPrint}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Lembar BAST</span>
                  </button>
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Modal: Input / Edit Data Pengiriman (Uji Organoleptik, Serah Terima, Lokasi) */}
      <Modal
        isOpen={isDeliveryFormOpen}
        onClose={() => {
          setIsDeliveryFormOpen(false);
          setEditingDeliveryId(null);
        }}
        title={editingDeliveryId ? 'Edit Data Pengiriman & Bukti Foto' : 'Input Data Pengiriman Makanan MBG'}
        subtitle="Dilengkapi upload foto uji organoleptik, foto serah terima, dan foto lokasi"
        maxWidth="3xl"
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
              <label className="block font-bold mb-1">Lembaga Penerima Manfaat</label>
              <select
                required
                value={deliveryForm.institutionId}
                onChange={e => {
                  const inst = institutions.find(i => i.id === e.target.value);
                  setDeliveryForm(f => ({
                    ...f,
                    institutionId: e.target.value,
                    picName: inst?.picName || inst?.contactPerson || f.picName,
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
              <label className="block font-bold mb-1">Waktu Berangkat</label>
              <input
                type="text"
                required
                value={deliveryForm.departureTime}
                onChange={e => setDeliveryForm(f => ({ ...f, departureTime: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Waktu Tiba / Serah Terima</label>
              <input
                type="text"
                required
                value={deliveryForm.arrivalTime}
                onChange={e => setDeliveryForm(f => ({ ...f, arrivalTime: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
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
              <label className="block font-bold mb-1">Petugas Pengirim / Driver</label>
              <input
                type="text"
                required
                value={deliveryForm.driverName}
                onChange={e => setDeliveryForm(f => ({ ...f, driverName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Armada / Plat Nomor</label>
              <input
                type="text"
                required
                value={deliveryForm.vehicleNumber}
                onChange={e => setDeliveryForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">PIC Penerima di Lokasi</label>
              <input
                type="text"
                required
                value={deliveryForm.picName}
                onChange={e => setDeliveryForm(f => ({ ...f, picName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              Upload Bukti Foto Pengiriman
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'picOrganolepticPhoto' as const, title: '1. Upload Foto Uji Organoleptik', icon: ClipboardCheck, val: deliveryForm.picOrganolepticPhoto },
                { key: 'handoverPhoto' as const, title: '2. Upload Foto Serah Terima', icon: FileCheck, val: deliveryForm.handoverPhoto },
                { key: 'locationPhoto' as const, title: '3. Upload Foto Lokasi', icon: MapPin, val: deliveryForm.locationPhoto },
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
                        <div className="relative">
                          <img
                            src={slot.val}
                            alt={slot.title}
                            onClick={() => setViewPhotoUrl(slot.val)}
                            className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setDeliveryForm(f => ({ ...f, [slot.key]: '' }))}
                            className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
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
                      onChange={e => handlePhotoUpload(e, url => setDeliveryForm(f => ({ ...f, [slot.key]: url })))}
                      className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-sky-300"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Catatan Pengiriman</label>
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
                setIsDeliveryFormOpen(false);
                setEditingDeliveryId(null);
              }}
              className="px-4 py-2 border rounded-xl dark:border-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
            >
              {editingDeliveryId ? 'Simpan Pembaruan Pengiriman' : 'Simpan Data Pengiriman'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Input / Edit Data Pengembalian Ompreng (Pengembalian & Lokasi) */}
      <Modal
        isOpen={isReturnFormOpen}
        onClose={() => {
          setIsReturnFormOpen(false);
          setEditingReturnId(null);
        }}
        title={editingReturnId ? 'Edit Data Pengembalian Ompreng & Foto' : 'Input Data Pengembalian Ompreng'}
        subtitle="Dilengkapi upload foto pengembalian dan upload foto lokasi penjemputan"
        maxWidth="3xl"
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
              <label className="block font-bold mb-1">Lembaga Asal Ompreng</label>
              <select
                required
                value={returnForm.institutionId}
                onChange={e => {
                  const inst = institutions.find(i => i.id === e.target.value);
                  setReturnForm(f => ({
                    ...f,
                    institutionId: e.target.value,
                    smallPortions: inst?.smallPortions || 0,
                    largePortions: inst?.largePortions || 0,
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
              <label className="block font-bold mb-1">Ompreng Porsi Kecil</label>
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
              <label className="block font-bold mb-1">Ompreng Porsi Besar</label>
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
              <div className="w-full px-3 py-2 border rounded-lg bg-slate-100 dark:bg-slate-800/70 dark:border-slate-700 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {Number(returnForm.smallPortions || 0) + Number(returnForm.largePortions || 0)} Ompreng
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold mb-1">Waktu Jemput</label>
              <input
                type="text"
                required
                value={returnForm.departureTime}
                onChange={e => setReturnForm(f => ({ ...f, departureTime: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Waktu Tiba di SPPG</label>
              <input
                type="text"
                required
                value={returnForm.arrivalTime}
                onChange={e => setReturnForm(f => ({ ...f, arrivalTime: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Petugas Penjemput</label>
              <input
                type="text"
                required
                value={returnForm.driverName}
                onChange={e => setReturnForm(f => ({ ...f, driverName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
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
              <label className="block font-bold mb-1">Petugas Penerima di SPPG</label>
              <input
                type="text"
                required
                value={returnForm.receivedByOfficer}
                onChange={e => setReturnForm(f => ({ ...f, receivedByOfficer: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Status Fisik Ompreng</label>
              <select
                value={returnForm.conditionStatus}
                onChange={e => setReturnForm(f => ({ ...f, conditionStatus: e.target.value as OmprengReturnRecord['conditionStatus'] }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="Lengkap & Utuh">Lengkap &amp; Utuh</option>
                <option value="Ada Selisih">Ada Selisih</option>
                <option value="Perlu Perbaikan">Perlu Perbaikan</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-600" />
              Upload Bukti Foto Pengembalian Ompreng &amp; Lokasi
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'returnHandoverPhoto' as const, title: '1. Upload Foto Pengembalian', icon: RotateCcw, val: returnForm.returnHandoverPhoto },
                { key: 'locationPhoto' as const, title: '2. Upload Foto Lokasi', icon: MapPin, val: returnForm.locationPhoto },
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
                            className="w-full h-28 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setReturnForm(f => ({ ...f, [slot.key]: '' }))}
                            className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-28 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                          <Upload className="w-4 h-4 mb-1" />
                          <span>Belum ada foto</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePhotoUpload(e, url => setReturnForm(f => ({ ...f, [slot.key]: url })))}
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
              onClick={() => {
                setIsReturnFormOpen(false);
                setEditingReturnId(null);
              }}
              className="px-4 py-2 border rounded-xl dark:border-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
            >
              {editingReturnId ? 'Simpan Pembaruan Pengembalian' : 'Simpan Pengembalian Ompreng'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Preview & Cetak Format BAST untuk Delivery */}
      {selectedDeliveryForBast && (
        <Modal
          isOpen={Boolean(selectedDeliveryForBast)}
          onClose={() => setSelectedDeliveryForBast(null)}
          title="Berita Acara Serah Terima (BAST) & Alat Makan"
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

      {/* Photo Lightbox */}
      {viewPhotoUrl && (
        <Modal
          isOpen={Boolean(viewPhotoUrl)}
          onClose={() => setViewPhotoUrl(null)}
          title="Pratinjau Dokumentasi Foto"
          maxWidth="2xl"
        >
          <div className="flex flex-col items-center gap-3">
            <img
              src={viewPhotoUrl}
              alt="Dokumentasi"
              className="max-h-[70vh] w-auto rounded-xl object-contain border border-slate-200 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setViewPhotoUrl(null)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
