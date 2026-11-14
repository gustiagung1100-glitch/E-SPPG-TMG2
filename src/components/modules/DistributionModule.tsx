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
import { DistributionLog, DynamicFormId } from '../../types';
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
  CheckCircle2,
  Clock,
  MapPin,
  Thermometer,
  Printer,
  ShieldCheck,
  FileCheck,
  Download,
} from 'lucide-react';

export const DistributionModule: React.FC = () => {
  const {
    distributionLogs,
    institutions,
    beneficiaryAttendance,
    masterVolunteers,
    addDistributionLog,
    updateDistributionLog,
    currentUser,
    hasPermission,
    sppgConfig,
    dynamicFormSchemas,
    addToast,
  } = useApp();

  const [selectedLog, setSelectedLog] = useState<DistributionLog | null>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bastReturnTimeInput, setBastReturnTimeInput] = useState('');
  const [isEditingDistSchema, setIsEditingDistSchema] = useState(false);
  const [distBuilderFormId, setDistBuilderFormId] = useState<DynamicFormId>('distribution_dispatch_form');
  const [isDispatchModalEdit, setIsDispatchModalEdit] = useState(false);
  const [isReportModalEdit, setIsReportModalEdit] = useState(false);

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
      {/* Title & Dispatch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Distribusi Pangan & Logistik Armada MBG
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pelacakan Armada, Pemantauan Suhu Wadah Termal & Berita Acara Serah Terima (BAST) Digital
          </p>
        </div>

        {hasPermission('distribution', 'create') && (
          <button
            type="button"
            onClick={() => {
              setDispatchCustomFields(
                getInitialCustomFieldValues(dynamicFormSchemas.distribution_dispatch_form)
              );
              setIsDispatchModalEdit(false);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Pemberangkatan Armada Baru</span>
          </button>
        )}
      </div>

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

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Armada Beroperasi</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            6 Kendaraan
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mobil Boks & Motor Termal</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Selesai Serah Terima</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {distributionLogs.filter(d => d.status === 'Selesai Serah Terima').length} Lembaga
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">BAST Tertandatangani</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Dalam Perjalanan</div>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {distributionLogs.filter(d => d.status === 'Dalam Perjalanan').length} Lembaga
          </div>
          <div className="text-[11px] text-sky-600 font-semibold mt-0.5">Suhu Terjaga &gt; 60°C</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Ompreng Terkirim</div>
          <div className="text-2xl font-black text-blue-900 dark:text-sky-400 mt-1">
            2.850 Boks
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">100% Target Harian</div>
        </div>
      </div>

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
    </div>
  );
};
