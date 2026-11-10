import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { MenuItem, PortioningInspectionRecord, FlyerTemplateId, FlyerSizeId } from '../../types';
import { BGNLogo, SPPGLogo } from '../common/OfficialLogos';
import { formatIndonesianDate } from '../../lib/exportUtils';
import { toPng } from 'html-to-image';
import {
  Download,
  Printer,
  Copy,
  Sparkles,
  Layers,
  Calendar,
  Utensils,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Award,
  Eye,
  RotateCcw,
  Sparkle,
} from 'lucide-react';

export const MenuFlyerModule: React.FC = () => {
  const { menuItems, portioningRecords, sppgConfig } = useApp();
  const flyerRef = useRef<HTMLDivElement>(null);

  // Default selection: take first available menu or default
  const [selectedMenuId, setSelectedMenuId] = useState<string>(
    menuItems.length > 0 ? menuItems[0].id : 'menu-1'
  );
  const [template, setTemplate] = useState<FlyerTemplateId>('modern_bgn');
  const [size, setSize] = useState<FlyerSizeId>('a4');
  const [zoomScale, setZoomScale] = useState<number>(0.85);

  // Interactive controls
  const [smallConsumptionDeadline, setSmallConsumptionDeadline] = useState<string>('Pukul 11:15 WIB');
  const [largeConsumptionDeadline, setLargeConsumptionDeadline] = useState<string>('Pukul 12:30 WIB');
  const [showNutritionFacts, setShowNutritionFacts] = useState<boolean>(true);
  const [showConsumptionDeadline, setShowConsumptionDeadline] = useState<boolean>(true);
  const [showOfficials, setShowOfficials] = useState<boolean>(true);
  const [photoLayoutMode, setPhotoLayoutMode] = useState<'dual_both' | 'small_only' | 'large_only'>('dual_both');
  const [targetAudienceText, setTargetAudienceText] = useState<string>('PAUD/TK, SD/MI, SMP/MTs, SMA/SMK & Santri');
  const [customNote, setCustomNote] = useState<string>(
    'Makanan disajikan dalam ompreng stainless steril bersegel. Habiskan sayur dan buah untuk daya tahan tubuh optimal!'
  );

  const [isDownloading, setIsDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Find active menu
  const activeMenu: MenuItem = useMemo(() => {
    return (
      menuItems.find(m => m.id === selectedMenuId) ||
      menuItems[0] || {
        id: 'menu-1',
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
      }
    );
  }, [menuItems, selectedMenuId]);

  // Find portioning inspection record for this menu date
  const activePortioning: PortioningInspectionRecord | undefined = useMemo(() => {
    return portioningRecords.find(p => p.date === activeMenu.date) || portioningRecords[0];
  }, [portioningRecords, activeMenu.date]);

  // Default fallback high quality ompreng photos
  const defaultSmallPortionPhoto =
    activePortioning?.smallPortionPhoto ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
  const defaultLargePortionPhoto =
    activePortioning?.largePortionPhoto ||
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80';

  // State for the two photos: Porsi Kecil and Porsi Besar
  const [smallPhotoUrl, setSmallPhotoUrl] = useState<string>(defaultSmallPortionPhoto);
  const [largePhotoUrl, setLargePhotoUrl] = useState<string>(defaultLargePortionPhoto);
  const [smallPhotoCaption, setSmallPhotoCaption] = useState<string>('Ompreng Porsi Kecil (PAUD & SD 1-3)');
  const [largePhotoCaption, setLargePhotoCaption] = useState<string>('Ompreng Porsi Besar (SD 4-6, SMP, SMA, Santri)');

  // Sync photos when active menu/portioning changes
  useEffect(() => {
    if (activePortioning?.smallPortionPhoto) {
      setSmallPhotoUrl(activePortioning.smallPortionPhoto);
    }
    if (activePortioning?.largePortionPhoto) {
      setLargePhotoUrl(activePortioning.largePortionPhoto);
    }
  }, [activePortioning, selectedMenuId]);

  // Handle Photo Upload for Porsi Kecil
  const handleUploadSmallPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSmallPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Photo Upload for Porsi Besar
  const handleUploadLargePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLargePhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset photos to original kitchen portioning data
  const handleResetPhotos = () => {
    setSmallPhotoUrl(defaultSmallPortionPhoto);
    setLargePhotoUrl(defaultLargePortionPhoto);
  };

  // Handle Download PNG
  const handleDownloadPNG = async () => {
    if (!flyerRef.current) return;
    try {
      setIsDownloading(true);
      const dataUrl = await toPng(flyerRef.current, {
        quality: 0.98,
        pixelRatio: 2.5, // High resolution output
        cacheBust: true,
      });

      const filename = `Flyer-Menu-MBG-${activeMenu.menuCode}-${activeMenu.date}-${size}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Gagal mengekspor flyer ke PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Native Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Copy Caption Text for WhatsApp / Social Media
  const handleCopyCaption = () => {
    const caption = `🍽️ *MENU MAKAN BERGIZI GRATIS (MBG) HARI INI*
📍 *${sppgConfig.sppgName}* (ID: ${sppgConfig.sppgId})
Yayasan Hafshawaty • Badan Gizi Nasional (BGN) RI

📅 *Hari/Tanggal:* ${activeMenu.dayName}, ${formatIndonesianDate(activeMenu.date)}
🔖 *Kode Menu:* ${activeMenu.menuCode}
🎯 *Sasaran Penerima:* ${targetAudienceText}

🍚 *KOMPOSISI MENU LENGKAP (Isi Piringku MBG):*
• Makanan Pokok: ${activeMenu.stapleFood}
• Lauk Hewani: ${activeMenu.animalProtein}
• Lauk Nabati: ${activeMenu.plantProtein}
• Sayuran Segar: ${activeMenu.vegetable}
• Buah Segar: ${activeMenu.fruit}
• Pelengkap / Susu: ${activeMenu.milkOrExtra}

📸 *DOKUMENTASI FOTO DUA PORSI MBG:*
1. Porsi Kecil (PAUD & SD 1-3): Gramasi ~${activePortioning?.smallPortionWeightGrams || 395}g | ${activeMenu.caloriesSmall || 620} kkal | Protein ${activeMenu.proteinGrams || 28.5}g
2. Porsi Besar (SD 4-6, SMP, SMA, Santri): Gramasi ~${activePortioning?.largePortionWeightGrams || 585}g | ${activeMenu.caloriesLarge || 875} kkal | Protein ${((activeMenu.proteinGrams || 28.5) * 1.25).toFixed(1)}g

⏰ *BATAS KONSUMSI MAKAN (Food Safety):*
• Batas Santap Porsi Kecil: ${smallConsumptionDeadline}
• Batas Santap Porsi Besar: ${largeConsumptionDeadline}
⚠️ _Disajikan segar dalam ompreng stainless steril bersegel. Hindari konsumsi jika telah melewati batas waktu._

Pengawas Gizi: ${sppgConfig.nutritionOfficer}
Kepala SPPG: ${sppgConfig.headOfSppg}
#BadanGiziNasional #MakanBergiziGratis #Hafshawaty #SPPGProbolinggo`;

    navigator.clipboard.writeText(caption);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Size Dimensions Class Mapping for Preview
  const containerDimensions = {
    a4: 'w-[794px] min-h-[1123px]', // Standard A4 Aspect Ratio at 96 DPI
    social_square: 'w-[750px] min-h-[750px] aspect-square', // 1:1 Feed
    social_story: 'w-[600px] min-h-[1066px]', // 9:16 Story / Status WA
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* TOP BAR / ACTION HEADER */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto-Generator Publikasi MBG
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              Input 2 Foto Kategori (Besar & Kecil)
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            Pembuat Flyer Menu Harian MBG Otomatis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Terintegrasi otomatis dengan <strong>Perencanaan Gizi (PLOG)</strong> dan <strong>Dokumentasi Pemorsian Ompreng</strong>. Menampilkan foto dan standar gizi untuk kedua porsi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={handleCopyCaption}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
            title="Salin caption WhatsApp lengkap dengan detail gizi dan batas santap"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copySuccess ? 'Tersalin!' : 'Salin Caption WA'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition shadow-sm"
            title="Cetak langsung atau simpan dokumen PDF"
          >
            <Printer className="w-4 h-4" /> Cetak / PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition shadow-md shadow-blue-900/20 disabled:opacity-60"
            title="Download gambar PNG resolusi tinggi siap diposting dan dicetak"
          >
            {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? 'Memproses...' : 'Download PNG'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN WORKSPACE: CONTROLS (LEFT) & LIVE PREVIEW (RIGHT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CONTROLS & PHOTO INPUTS */}
        <div className="lg:col-span-4 space-y-5 print:hidden">
          {/* Card 1: Menu Selection from PLOG */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Calendar className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Sumber Data Menu PLOG
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Menu & Tanggal:
              </label>
              <select
                value={selectedMenuId}
                onChange={e => setSelectedMenuId(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-900"
              >
                {menuItems.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.dayName}, {formatIndonesianDate(m.date)} — {m.animalProtein.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Menu Summary Loaded */}
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between font-bold text-blue-950 dark:text-sky-300">
                <span>{activeMenu.menuCode}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-sky-200 text-[10px]">
                  {activeMenu.targetPortions} Porsi Target
                </span>
              </div>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Lauk:</strong> {activeMenu.animalProtein} & {activeMenu.plantProtein}
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <strong>Sayur & Buah:</strong> {activeMenu.vegetable}, {activeMenu.fruit}
              </div>
            </div>
          </div>

          {/* Card 2: INPUT DUA FOTO BERDASARKAN KATEGORI PORSI */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  2. Input Dua Foto Porsi (Kecil & Besar)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleResetPhotos}
                className="text-[10px] text-blue-800 dark:text-sky-400 hover:underline flex items-center gap-1 font-bold"
                title="Kembalikan ke foto dokumentasi awal pemorsian dapur"
              >
                <RotateCcw className="w-3 h-3" /> Reset Foto
              </button>
            </div>

            {/* Photo Input A: PORSI KECIL */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    👶 Foto Porsi Kecil (PAUD & SD 1-3)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Standar: ~{activePortioning?.smallPortionWeightGrams || 395}g (Ompreng Kecil)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                  Kategori A
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={smallPhotoUrl}
                  alt="Porsi Kecil"
                  className="w-16 h-16 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-blue-900 dark:text-sky-400" />
                    <span>Upload Foto Porsi Kecil</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSmallPhoto}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={smallPhotoCaption}
                    onChange={e => setSmallPhotoCaption(e.target.value)}
                    placeholder="Label porsi kecil..."
                    className="w-full text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Photo Input B: PORSI BESAR */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    🧑‍🎓 Foto Porsi Besar (SD 4-6, SMP, SMA, Santri)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Standar: ~{activePortioning?.largePortionWeightGrams || 585}g (Ompreng Besar)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  Kategori B
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={largePhotoUrl}
                  alt="Porsi Besar"
                  className="w-16 h-16 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Upload Foto Porsi Besar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLargePhoto}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={largePhotoCaption}
                    onChange={e => setLargePhotoCaption(e.target.value)}
                    placeholder="Label porsi besar..."
                    className="w-full text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Mode Tata Letak Foto di Flyer */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Tata Letak Foto Pada Flyer:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPhotoLayoutMode('dual_both')}
                  className={`p-2 rounded-lg border text-center transition ${
                    photoLayoutMode === 'dual_both'
                      ? 'border-blue-900 bg-blue-50 font-bold dark:bg-blue-950/40 text-blue-900 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Dua Foto (Berdampingan)
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoLayoutMode('small_only')}
                  className={`p-2 rounded-lg border text-center transition ${
                    photoLayoutMode === 'small_only'
                      ? 'border-blue-900 bg-blue-50 font-bold dark:bg-blue-950/40 text-blue-900 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Fokus Porsi Kecil
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoLayoutMode('large_only')}
                  className={`p-2 rounded-lg border text-center transition ${
                    photoLayoutMode === 'large_only'
                      ? 'border-blue-900 bg-blue-50 font-bold dark:bg-blue-950/40 text-blue-900 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Fokus Porsi Besar
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Template & Canvas Size Selection */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                3. Pilihan Template & Ukuran
              </h3>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Pilihan Desain Template:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'modern_bgn', label: 'Modern Official BGN', desc: 'Resmi, Navy & Gold' },
                  { id: 'nutri_infographic', label: 'Infografis Gizi Sehat', desc: 'Visual Nutrisi, Hijau Fresh' },
                  { id: 'nusantara_warm', label: 'Dapur Nusantara', desc: 'Terracotta & Hangat' },
                  { id: 'school_friendly', label: 'Edukasi Ramah Anak', desc: 'Ceria, Edukatif, Ramah Siswa' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id as FlyerTemplateId)}
                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                      template === t.id
                        ? 'border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-sky-300 font-bold ring-2 ring-blue-900/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{t.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Format Dimensi / Media:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'a4', label: 'A4 Cetak', sub: 'Poster Mading' },
                  { id: 'social_square', label: 'Feed 1:1', sub: 'Instagram / WA' },
                  { id: 'social_story', label: 'Story 9:16', sub: 'Status WA / IG' },
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSize(s.id as FlyerSizeId)}
                    className={`p-2 rounded-xl text-center border transition ${
                      size === s.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold ring-2 ring-emerald-600/30'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[9px] text-slate-500">{s.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Consumption Deadline & Food Safety Settings */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Clock className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                4. Batas Konsumsi & Keamanan Pangan
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Batas Porsi Kecil (PAUD/SD 1-3):
                </label>
                <input
                  type="text"
                  value={smallConsumptionDeadline}
                  onChange={e => setSmallConsumptionDeadline(e.target.value)}
                  placeholder="e.g. Pukul 11:15 WIB"
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Batas Porsi Besar (SD 4-6, SMP):
                </label>
                <input
                  type="text"
                  value={largeConsumptionDeadline}
                  onChange={e => setLargeConsumptionDeadline(e.target.value)}
                  placeholder="e.g. Pukul 12:30 WIB"
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Target Audience Text */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Sasaran Siswa Penerima Manfaat:
              </label>
              <input
                type="text"
                value={targetAudienceText}
                onChange={e => setTargetAudienceText(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Catatan Higiene & Edukasi Santap:
              </label>
              <textarea
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white"
              />
            </div>

            {/* Visibility Toggles */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showNutritionFacts}
                  onChange={e => setShowNutritionFacts(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-900"
                />
                Tampilkan Rincian Standar Gizi (AKG BGN)
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showConsumptionDeadline}
                  onChange={e => setShowConsumptionDeadline(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-900"
                />
                Tampilkan Kotak Batas Waktu Konsumsi
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showOfficials}
                  onChange={e => setShowOfficials(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-900"
                />
                Tampilkan Pengawas Gizi & Kepala SPPG
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW CANVAS */}
        <div className="lg:col-span-8 space-y-4">
          {/* Zoom & View Controls */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 print:hidden text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
              <Eye className="w-4 h-4 text-blue-900 dark:text-sky-400" />
              <span>
                Preview Flyer ({size === 'a4' ? 'A4 210×297mm' : size === 'social_square' ? '1:1 Feed' : '9:16 Story'}) — Mode:{' '}
                {photoLayoutMode === 'dual_both' ? 'Dua Foto Porsi' : photoLayoutMode === 'small_only' ? 'Foto Porsi Kecil' : 'Foto Porsi Besar'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Skala:</span>
              <button
                type="button"
                onClick={() => setZoomScale(0.65)}
                className={`px-2 py-0.5 rounded text-xs ${zoomScale === 0.65 ? 'bg-blue-900 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
              >
                65%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(0.85)}
                className={`px-2 py-0.5 rounded text-xs ${zoomScale === 0.85 ? 'bg-blue-900 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
              >
                85%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1.0)}
                className={`px-2 py-0.5 rounded text-xs ${zoomScale === 1.0 ? 'bg-blue-900 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
              >
                100%
              </button>
            </div>
          </div>

          {/* Scaled Preview Frame Container */}
          <div className="overflow-x-auto p-4 sm:p-6 bg-slate-200/80 dark:bg-slate-950 rounded-2xl flex justify-center items-start shadow-inner">
            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
              className="shrink-0"
            >
              {/* THE FLYER CANVAS ITSELF */}
              <div
                ref={flyerRef}
                className={`bg-white text-slate-900 shadow-2xl overflow-hidden relative ${containerDimensions[size]} ${
                  template === 'modern_bgn'
                    ? 'font-sans'
                    : template === 'nutri_infographic'
                    ? 'font-sans'
                    : template === 'nusantara_warm'
                    ? 'font-serif'
                    : 'font-sans'
                }`}
              >
                {/* =================================================================== */}
                {/* HEADER SECTION (Official BGN + SPPG Dual Logo & Identification) */}
                {/* =================================================================== */}
                <div
                  className={`p-6 sm:p-7 relative ${
                    template === 'modern_bgn'
                      ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white'
                      : template === 'nutri_infographic'
                      ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white'
                      : template === 'nusantara_warm'
                      ? 'bg-gradient-to-r from-amber-950 via-orange-950 to-amber-900 text-amber-50'
                      : 'bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white'
                  }`}
                >
                  {/* Decorative subtle background pattern */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    {/* Left: SPPG Logo */}
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 shrink-0">
                        <SPPGLogo size="lg" />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          {sppgConfig.foundationName}
                        </div>
                        <h2 className="text-sm sm:text-base font-black tracking-wide leading-tight">
                          {sppgConfig.sppgName}
                        </h2>
                        <div className="text-[10px] text-white/80 font-mono">
                          ID SPPG: {sppgConfig.sppgId} • Kec. {sppgConfig.district}
                        </div>
                      </div>
                    </div>

                    {/* Right: BGN Logo */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="hidden sm:block text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Program Resmi Pemerintah
                        </div>
                        <h3 className="text-xs sm:text-sm font-black leading-tight">
                          BADAN GIZI NASIONAL
                        </h3>
                        <div className="text-[9px] text-white/80 uppercase tracking-widest font-bold">
                          Republik Indonesia
                        </div>
                      </div>
                      <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 shrink-0">
                        <BGNLogo size="lg" />
                      </div>
                    </div>
                  </div>

                  {/* Program Banner Strip */}
                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      MAKAN BERGIZI GRATIS (MBG) — MENU HARIAN RESMI
                    </span>
                    <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded-full text-white text-[10px]">
                      {activeMenu.menuCode}
                    </span>
                  </div>
                </div>

                {/* DATE & DAY BADGE STRIP */}
                <div
                  className={`px-6 py-2.5 flex items-center justify-between text-xs font-bold ${
                    template === 'modern_bgn'
                      ? 'bg-amber-500 text-blue-950'
                      : template === 'nutri_infographic'
                      ? 'bg-emerald-500 text-white'
                      : template === 'nusantara_warm'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-400 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {activeMenu.dayName}, {formatIndonesianDate(activeMenu.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Siklus Minggu Ke-{activeMenu.cycleWeek}</span>
                    <span>•</span>
                    <span>{targetAudienceText}</span>
                  </div>
                </div>

                {/* =================================================================== */}
                {/* BODY CONTENT: DUA FOTO PORSI (KECIL & BESAR) & INGREDIENTS */}
                {/* =================================================================== */}
                <div className="p-6 sm:p-7 space-y-6">
                  {/* DUA FOTO PORSI SHOWCASE */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-amber-500" />
                        Dokumentasi Dua Kategori Porsi Ompreng MBG:
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Higienis & Terverifikasi
                      </span>
                    </div>

                    {/* PHOTO GRID BASED ON LAYOUT MODE */}
                    {photoLayoutMode === 'dual_both' ? (
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* FOTO 1: PORSI KECIL */}
                        <div className="relative rounded-2xl overflow-hidden shadow-md border-2 border-blue-200 group bg-slate-900">
                          <img
                            src={smallPhotoUrl}
                            alt="Dokumentasi Porsi Kecil"
                            className="w-full h-52 sm:h-56 object-cover object-center group-hover:scale-103 transition duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                          {/* Top Badge */}
                          <div className="absolute top-2.5 left-2.5">
                            <span className="px-2.5 py-1 rounded-full bg-blue-900/90 text-white font-bold text-[10px] shadow-sm backdrop-blur-xs flex items-center gap-1">
                              👶 Porsi Kecil • PAUD & SD 1-3
                            </span>
                          </div>

                          {/* Bottom Info */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-amber-300">
                                ~{activePortioning?.smallPortionWeightGrams || 395} Gram
                              </span>
                              <span className="text-[10px] text-white/90 font-medium">
                                {activeMenu.caloriesSmall || 620} kkal
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-200 truncate mt-0.5">
                              {smallPhotoCaption}
                            </p>
                          </div>
                        </div>

                        {/* FOTO 2: PORSI BESAR */}
                        <div className="relative rounded-2xl overflow-hidden shadow-md border-2 border-emerald-300 group bg-slate-900">
                          <img
                            src={largePhotoUrl}
                            alt="Dokumentasi Porsi Besar"
                            className="w-full h-52 sm:h-56 object-cover object-center group-hover:scale-103 transition duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                          {/* Top Badge */}
                          <div className="absolute top-2.5 left-2.5">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-800/90 text-white font-bold text-[10px] shadow-sm backdrop-blur-xs flex items-center gap-1">
                              🧑‍🎓 Porsi Besar • SD 4-6, SMP, SMA
                            </span>
                          </div>

                          {/* Bottom Info */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-300">
                                ~{activePortioning?.largePortionWeightGrams || 585} Gram
                              </span>
                              <span className="text-[10px] text-white/90 font-medium">
                                {activeMenu.caloriesLarge || 875} kkal
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-200 truncate mt-0.5">
                              {largePhotoCaption}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : photoLayoutMode === 'small_only' ? (
                      /* SINGLE PHOTO: SMALL ONLY */
                      <div className="relative rounded-2xl overflow-hidden shadow-md border-2 border-blue-200 group bg-slate-900">
                        <img
                          src={smallPhotoUrl}
                          alt="Porsi Kecil"
                          className="w-full h-64 object-cover object-center group-hover:scale-102 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 rounded-full bg-blue-900 text-white font-bold text-xs shadow-sm">
                            👶 Porsi Kecil • PAUD & SD Kelas 1-3 (~{activePortioning?.smallPortionWeightGrams || 395}g)
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h2 className="text-lg font-black">{activeMenu.stapleFood} (Porsi Kecil)</h2>
                          <p className="text-xs text-slate-200">{smallPhotoCaption}</p>
                        </div>
                      </div>
                    ) : (
                      /* SINGLE PHOTO: LARGE ONLY */
                      <div className="relative rounded-2xl overflow-hidden shadow-md border-2 border-emerald-300 group bg-slate-900">
                        <img
                          src={largePhotoUrl}
                          alt="Porsi Besar"
                          className="w-full h-64 object-cover object-center group-hover:scale-102 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 rounded-full bg-emerald-800 text-white font-bold text-xs shadow-sm">
                            🧑‍🎓 Porsi Besar • SD 4-6, SMP, SMA & Santri (~{activePortioning?.largePortionWeightGrams || 585}g)
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h2 className="text-lg font-black">{activeMenu.stapleFood} (Porsi Besar)</h2>
                          <p className="text-xs text-slate-200">{largePhotoCaption}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5 ELEMEN GIZI SEIMBANG ("ISI PIRINGKU" BGN) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-blue-900" />
                        Komposisi Sajian Lengkap (Isi Piringku MBG)
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500">
                        Bebas MSG Sintetis • Garam & Minyak Terukur
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {/* 1. Makanan Pokok */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🍚
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Makanan Pokok</div>
                          <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                            {activeMenu.stapleFood}
                          </div>
                        </div>
                      </div>

                      {/* 2. Lauk Hewani */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🍗
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Lauk Hewani (Protein)</div>
                          <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                            {activeMenu.animalProtein}
                          </div>
                        </div>
                      </div>

                      {/* 3. Lauk Nabati */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🥢
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Lauk Nabati</div>
                          <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                            {activeMenu.plantProtein}
                          </div>
                        </div>
                      </div>

                      {/* 4. Sayuran Segar */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🥦
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Sayuran Segar</div>
                          <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                            {activeMenu.vegetable}
                          </div>
                        </div>
                      </div>

                      {/* 5. Buah Segar */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🍌
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Buah Segar</div>
                          <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                            {activeMenu.fruit}
                          </div>
                        </div>
                      </div>

                      {/* 6. Ekstra / Minuman */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🥛
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Pelengkap / Susu</div>
                          <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                            {activeMenu.milkOrExtra}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BATAS KONSUMSI MAKAN (FOOD SAFETY ALERT BOX DUAL CATEGORY) */}
                  {showConsumptionDeadline && (
                    <div className="rounded-2xl p-4 bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-xs">
                      <div className="flex items-center gap-2 mb-2 font-black text-xs uppercase tracking-wider text-amber-900">
                        <ShieldAlert className="w-4 h-4 text-amber-700" />
                        PENTING: BATAS WAKTU KONSUMSI MAKAN (FOOD SAFETY)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">
                            Batas Santap Porsi Kecil (PAUD/SD 1-3)
                          </div>
                          <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                            <Clock className="w-4 h-4" />
                            <span>Maksimal {smallConsumptionDeadline}</span>
                          </div>
                          <div className="text-[10px] text-slate-600">
                            Disarankan dikonsumsi saat jam istirahat pertama sekolah.
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">
                            Batas Santap Porsi Besar (SD 4-6, SMP, SMA, Santri)
                          </div>
                          <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                            <Clock className="w-4 h-4" />
                            <span>Maksimal {largeConsumptionDeadline}</span>
                          </div>
                          <div className="text-[10px] text-slate-600">
                            Disarankan dikonsumsi saat jam istirahat siang sekolah.
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-amber-200 text-[10px] font-medium text-amber-900 flex items-center justify-between">
                        <span>🛡️ Disajikan hangat dalam ompreng stainless steril bersegel.</span>
                        <span className="font-bold">Jangan santap jika telah melewati batas waktu.</span>
                      </div>
                    </div>
                  )}

                  {/* KANDUNGAN GIZI BERDASARKAN KATEGORI PENERIMA MANFAAT */}
                  {showNutritionFacts && (
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-900" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-blue-950">
                            Informasi Nilai Gizi Terverifikasi (AKG BGN)
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                          Sumber: TKPI Kemenkes RI 2020
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {/* Kategori 1: Porsi Kecil */}
                        <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">Porsi Kecil</div>
                              <div className="text-[9px] text-slate-500">PAUD, TK & SD Kelas 1-3</div>
                            </div>
                            <span className="text-xs font-black text-blue-900">
                              ~{activePortioning?.smallPortionWeightGrams || 395}g
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="p-1 rounded bg-slate-50">
                              <div className="text-[9px] text-slate-500">Energi</div>
                              <div className="font-black text-xs text-blue-950">
                                {activeMenu.caloriesSmall || 620} <span className="text-[8px] font-normal">kkal</span>
                              </div>
                            </div>
                            <div className="p-1 rounded bg-slate-50">
                              <div className="text-[9px] text-slate-500">Protein</div>
                              <div className="font-black text-xs text-emerald-700">
                                {activeMenu.proteinGrams || 28.5}g
                              </div>
                            </div>
                            <div className="p-1 rounded bg-slate-50">
                              <div className="text-[9px] text-slate-500">Karbohidrat</div>
                              <div className="font-black text-xs text-slate-800">
                                {activeMenu.carbGrams || 94}g
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                            <span>Lemak: {activeMenu.fatGrams || 20}g</span>
                            <span>Serat: {activeMenu.fiberGrams || 6.8}g</span>
                            <span>Kalsium: {activeMenu.calciumMg || 310}mg</span>
                          </div>
                        </div>

                        {/* Kategori 2: Porsi Besar */}
                        <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">Porsi Besar</div>
                              <div className="text-[9px] text-slate-500">SD 4-6, SMP, SMA & Santri</div>
                            </div>
                            <span className="text-xs font-black text-blue-900">
                              ~{activePortioning?.largePortionWeightGrams || 585}g
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="p-1 rounded bg-slate-50">
                              <div className="text-[9px] text-slate-500">Energi</div>
                              <div className="font-black text-xs text-blue-950">
                                {activeMenu.caloriesLarge || 875} <span className="text-[8px] font-normal">kkal</span>
                              </div>
                            </div>
                            <div className="p-1 rounded bg-slate-50">
                              <div className="text-[9px] text-slate-500">Protein</div>
                              <div className="font-black text-xs text-emerald-700">
                                {((activeMenu.proteinGrams || 28.5) * 1.25).toFixed(1)}g
                              </div>
                            </div>
                            <div className="p-1 rounded bg-slate-50">
                              <div className="text-[9px] text-slate-500">Karbohidrat</div>
                              <div className="font-black text-xs text-slate-800">
                                {((activeMenu.carbGrams || 94) * 1.2).toFixed(1)}g
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                            <span>Lemak: {((activeMenu.fatGrams || 20) * 1.2).toFixed(1)}g</span>
                            <span>Serat: {((activeMenu.fiberGrams || 6.8) * 1.2).toFixed(1)}g</span>
                            <span>Kalsium: {((activeMenu.calciumMg || 310) * 1.25).toFixed(0)}mg</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-blue-900 font-medium italic">
                        * Porsi telah dihitung mencukupi 33% hingga 36% AKG harian anak sekolah sesuai Peraturan Badan Gizi Nasional Republik Indonesia.
                      </div>
                    </div>
                  )}

                  {/* PESAN EDUKASI & HIGIENE */}
                  {customNote && (
                    <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-700 leading-relaxed border-l-4 border-blue-900">
                      <strong>Pesan Higiene & Santap:</strong> {customNote}
                    </div>
                  )}

                  {/* FOOTER & OFFICIAL VERIFICATION */}
                  {showOfficials && (
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                      <div className="text-left">
                        <div className="text-[10px] text-slate-500">Disusun & Dihitung Oleh:</div>
                        <div className="font-bold text-slate-900">{sppgConfig.nutritionOfficer}</div>
                        <div className="text-[10px] text-blue-900 font-semibold">Pengawas Gizi SPPG TMG2</div>
                      </div>

                      <div className="text-center font-mono text-[9px] text-slate-400">
                        <div>ID IDENTITAS SPPG</div>
                        <div className="font-bold text-slate-700">{sppgConfig.sppgId}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">Disahkan Oleh:</div>
                        <div className="font-bold text-slate-900">{sppgConfig.headOfSppg}</div>
                        <div className="text-[10px] text-blue-900 font-semibold">Kepala SPPG TMG2</div>
                      </div>
                    </div>
                  )}

                  {/* BOTTOM BRAND STRIP */}
                  <div className="pt-2 text-center text-[9px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
                    <span>E-SPPG TMG2 • Yayasan Hafshawaty Pesantren Zainul Hasan</span>
                    <span>Badan Gizi Nasional (BGN) RI • Generasi Emas 2045</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
