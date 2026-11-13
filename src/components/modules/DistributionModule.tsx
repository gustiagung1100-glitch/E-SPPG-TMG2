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
import { DistributionLog } from '../../types';
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
  } = useApp();

  const [selectedLog, setSelectedLog] = useState<DistributionLog | null>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bastReturnTimeInput, setBastReturnTimeInput] = useState('');

  // Status Update Form State
  const [newStatus, setNewStatus] = useState<DistributionLog['status']>('Selesai Serah Terima');
  const [newArrivalTime, setNewArrivalTime] = useState('09:45 WIB');
  const [newReceivedBy, setNewReceivedBy] = useState('Drs. Slamet Hariyanto');
  const [newReceiverTitle, setNewReceiverTitle] = useState('Kepala Sekolah');
  const [arrivalTemp, setArrivalTemp] = useState<number>(64.5);
  const [notesInput, setNotesInput] = useState('Diterima utuh tanpa cacat, porsi dihitung bersama tim guru.');

  // Create Form State
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id || '');
  const [vehicleNumber, setVehicleNumber] = useState('N 8921 RA (Armada 1)');
  const [driverName, setDriverName] = useState('Agus Santoso');
  const [departureTime, setDepartureTime] = useState('08:30 WIB');
  const [dispatchTemp, setDispatchTemp] = useState<number>(68.0);

  const handleOpenUpdate = (log: DistributionLog) => {
    const matchedInst = institutions.find(i => i.id === log.institutionId);
    setSelectedLog(log);
    setNewStatus(log.status);
    setNewArrivalTime(log.arrivalTime || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    setNewReceivedBy(log.receivedBy || matchedInst?.picName || matchedInst?.contactPerson || '');
    setNewReceiverTitle(log.receiverTitle || 'PIC Penerima Manfaat / Kepala Sekolah');
    setArrivalTemp(log.foodTempAtArrival || 64.0);
    setNotesInput(log.notes || '');
    setIsUpdateOpen(true);
  };

  const handleOpenDetail = (log: DistributionLog) => {
    setSelectedLog(log);
    setBastReturnTimeInput('');
    setIsDetailOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedLog) return;
    const bastNumber =
      selectedLog.bastNumber ||
      generateBastNumber(191 + (institutions.findIndex(i => i.id === selectedLog.institutionId) + 1 || 1), selectedLog.date);
    await updateDistributionLog(selectedLog.id, {
      status: newStatus,
      arrivalTime: newArrivalTime,
      receivedBy: newReceivedBy,
      receiverTitle: newReceiverTitle,
      foodTempAtArrival: arrivalTemp,
      notes: notesInput,
      bastNumber,
    });
    setIsUpdateOpen(false);
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
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
    });
    setIsCreateOpen(false);
  };

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'Laporan Rekapitulasi Distribusi & Pengiriman MBG',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['Sekolah Sasaran', 'Porsi', 'Armada & Supir', 'Jam Berangkat / Tiba', 'Suhu (°C)', 'Penerima', 'Status'],
      rows: distributionLogs.map(d => [
        d.institutionName,
        `${formatNumber(d.totalPortions)} (${d.smallPortions}K / ${d.largePortions}B)`,
        `${d.vehicleNumber} - ${d.driverName}`,
        `${d.departureTime} / ${d.arrivalTime}`,
        `${d.foodTempAtDispatch}°C -> ${d.foodTempAtArrival || '-'}°C`,
        d.receivedBy || 'Belum Diterima',
        d.status,
      ]),
      fileName: 'Rekap_Distribusi_Armada_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = distributionLogs.map(d => ({
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
    }));
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
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Pemberangkatan Armada Baru</span>
          </button>
        )}
      </div>

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

      {/* Modal: Dispatch New Fleet */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Catat Keberangkatan Armada Distribusi"
        subtitle="Pemberangkatan kloter pengiriman makanan siap saji ke sekolah"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDispatch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Lembaga Tujuan *
            </label>
            <select
              value={institutionId}
              onChange={e => setInstitutionId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({formatNumber(inst.totalPortions)} porsi)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. Kendaraan / Armada *
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Pengemudi *
              </label>
              <input
                type="text"
                required
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jam Keberangkatan *
              </label>
              <input
                type="text"
                required
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Suhu Berangkat (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={dispatchTemp}
                onChange={e => setDispatchTemp(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-emerald-600 font-bold"
              />
            </div>
          </div>

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

      {/* Modal: Update BAST & Arrival Info */}
      <Modal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        title="Konfirmasi Serah Terima (BAST)"
        subtitle={`Sekolah: ${selectedLog?.institutionName}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Status Pengiriman *
            </label>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            >
              <option value="Dalam Perjalanan">Dalam Perjalanan</option>
              <option value="Tiba di Lokasi">Tiba di Lokasi</option>
              <option value="Selesai Serah Terima">Selesai Serah Terima (BAST Ditandatangani)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jam Tiba di Lokasi
              </label>
              <input
                type="text"
                value={newArrivalTime}
                onChange={e => setNewArrivalTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Suhu Saat Tiba (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={arrivalTemp}
                onChange={e => setArrivalTemp(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-emerald-600 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Penerima (Kepsek / Guru)
              </label>
              <input
                type="text"
                placeholder="Drs. Slamet Hariyanto"
                value={newReceivedBy}
                onChange={e => setNewReceivedBy(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jabatan Penerima
              </label>
              <input
                type="text"
                placeholder="Kepala Sekolah / Guru Piket"
                value={newReceiverTitle}
                onChange={e => setNewReceiverTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Kondisi Makanan & Ompreng
            </label>
            <textarea
              rows={2}
              value={notesInput}
              onChange={e => setNotesInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsUpdateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
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
