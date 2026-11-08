import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { exportTableToPDF, exportToExcel, triggerPrint } from '../../lib/exportUtils';
import { OfficialLetter } from '../../types';
import {
  Mail,
  Plus,
  Eye,
  FileText,
  Send,
  Inbox,
  CheckCircle,
  Clock,
  Printer,
} from 'lucide-react';

export const LettersModule: React.FC = () => {
  const {
    officialLetters,
    addLetter,
    updateLetter,
    hasPermission,
    sppgConfig,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<OfficialLetter | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form State
  const [formData, setFormData] = useState<Omit<OfficialLetter, 'id'>>({
    letterNumber: '020/SPPG-TMG2/MBG/XI/2026',
    type: 'Surat Keluar',
    date: new Date().toISOString().slice(0, 10),
    subject: '',
    senderOrReceiver: '',
    category: 'Dinas/BGN',
    status: 'Diproses',
  });

  const handleOpenCreate = (type: OfficialLetter['type'] = 'Surat Keluar') => {
    setSelectedLetter(null);
    setFormData({
      letterNumber: `0${Math.floor(Math.random() * 80) + 20}/SPPG-TMG2/MBG/XI/2026`,
      type,
      date: new Date().toISOString().slice(0, 10),
      subject: '',
      senderOrReceiver: '',
      category: 'Dinas/BGN',
      status: type === 'Surat Masuk' ? 'Diterima' : 'Terkirim',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLetter) {
      await updateLetter(selectedLetter.id, formData);
    } else {
      await addLetter(formData);
    }
    setIsModalOpen(false);
  };

  const filteredLetters = filterType === 'ALL'
    ? officialLetters
    : officialLetters.filter(l => l.type === filterType);

  // Export handlers
  const handleExportPDF = () => {
    exportTableToPDF({
      title: 'Agenda Arsip Tata Persuratan Resmi SPPG',
      subtitle: `Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan Temenggungan 2`,
      headers: ['Nomor Surat', 'Tanggal', 'Jenis', 'Perihal / Subjek', 'Instansi / Pihak', 'Status Disposisi'],
      rows: filteredLetters.map(l => [
        l.letterNumber,
        l.date,
        l.type,
        l.subject,
        l.senderOrReceiver,
        l.status,
      ]),
      fileName: 'Arsip_Tata_Persuratan_SPPG_TMG2',
      sppgConfig,
      signerName: sppgConfig.headOfSppg,
      signerRole: 'Kepala SPPG Temenggungan 2',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredLetters.map(l => ({
      'Nomor Surat': l.letterNumber,
      'Tanggal': l.date,
      'Jenis': l.type,
      'Kategori': l.category,
      'Perihal': l.subject,
      'Pihak Terkait': l.senderOrReceiver,
      'Status': l.status,
    }));
    exportToExcel(dataToExport, 'Tata_Persuratan_SPPG_TMG2', 'Arsip Surat');
  };

  const columns: Column<OfficialLetter>[] = [
    {
      key: 'letterNumber',
      header: 'Nomor Surat & Tanggal',
      render: row => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
            {row.letterNumber}
          </div>
          <div className="text-[11px] text-slate-500">
            Tgl: {row.date} • Kat: {row.category}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Jenis Surat',
      render: row => {
        const badgeColors = {
          'Surat Masuk': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
          'Surat Keluar': 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300',
          'Surat Perintah Kerja (SPK)': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          'Berita Acara (BAST)': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColors[row.type]}`}>
            {row.type}
          </span>
        );
      },
    },
    {
      key: 'subject',
      header: 'Perihal Surat',
      render: row => (
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-sm">
          {row.subject}
        </div>
      ),
    },
    {
      key: 'senderOrReceiver',
      header: 'Pengirim / Ditujukan Kepada',
      render: row => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          {row.senderOrReceiver}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Disposisi',
      render: row => {
        const badgeColors = {
          'Diterima': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          'Diproses': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          'Terkirim': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300',
          'Selesai Disposisi': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColors[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Administrasi & Tata Persuratan SPPG
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Arsip Digital Surat Masuk, Surat Keluar, SPK Rekanan & Disposisi
          </p>
        </div>

        {hasPermission('letters', 'create') && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenCreate('Surat Masuk')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Inbox className="w-4 h-4" />
              <span>Surat Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreate('Surat Keluar')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Send className="w-4 h-4" />
              <span>Surat Keluar / SPK</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Total Arsip Surat</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {officialLetters.length} Dokumen
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tertib Administrasi</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Surat Masuk (Dinas/BGN)</div>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {officialLetters.filter(l => l.type === 'Surat Masuk').length} Surat
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Instruksi & Uji Petik</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">Surat Keluar Resmi</div>
          <div className="text-2xl font-black text-blue-900 dark:text-sky-400 mt-1">
            {officialLetters.filter(l => l.type === 'Surat Keluar').length} Surat
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Laporan ke Pusat & Wilayah</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-bold">SPK & Kontrak Rekanan</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {officialLetters.filter(l => l.type === 'Surat Perintah Kerja (SPK)').length} SPK
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Pasokan Terikat Legal</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-bold uppercase text-[11px] mr-1">Filter:</span>
        {['ALL', 'Surat Masuk', 'Surat Keluar', 'Surat Perintah Kerja (SPK)', 'Berita Acara (BAST)'].map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              filterType === f
                ? 'bg-blue-900 text-white dark:bg-sky-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {f === 'ALL' ? 'Semua Surat' : f}
          </button>
        ))}
      </div>

      {/* Letters Data Table */}
      <DataTable
        title="Buku Agenda Surat Masuk & Keluar SPPG"
        subtitle="Sistem penomoran dan arsip korespondensi resmi Yayasan Hafshawaty"
        data={filteredLetters}
        columns={columns}
        keyExtractor={item => item.id}
        searchPlaceholder="Cari nomor surat, perihal, instansi..."
        searchKeys={['letterNumber', 'subject', 'senderOrReceiver', 'category']}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={triggerPrint}
      />

      {/* Modal: Form Create Letter */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.type === 'Surat Masuk' ? 'Registrasi Surat Masuk Baru' : 'Terbitkan Surat Keluar / SPK'}
        subtitle="Pemberian nomor agenda resmi format SPPG Probolinggo Krejengan Temenggungan 2"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Surat Resmi *
              </label>
              <input
                type="text"
                required
                value={formData.letterNumber}
                onChange={e => setFormData({ ...formData, letterNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Surat *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Dokumen *
              </label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="Surat Masuk">Surat Masuk</option>
                <option value="Surat Keluar">Surat Keluar</option>
                <option value="Surat Perintah Kerja (SPK)">Surat Perintah Kerja (SPK)</option>
                <option value="Berita Acara (BAST)">Berita Acara (BAST)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Instansi *
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Dinas/BGN">Dinas / BGN Pusat & Wilayah</option>
                <option value="Sekolah/Lembaga">Sekolah / Lembaga Penerima</option>
                <option value="Supplier/Vendor">Supplier / Vendor Rekanan</option>
                <option value="Internal SPPG">Internal Yayasan Hafshawaty</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Perihal / Isi Ringkas Surat *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Laporan Realisasi Distribusi Porsi Periode November 2026"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pengirim / Penerima Surat *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Badan Gizi Nasional (BGN) Wilayah Jawa Timur"
              value={formData.senderOrReceiver}
              onChange={e => setFormData({ ...formData, senderOrReceiver: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

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
              Simpan Arsip Surat
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
