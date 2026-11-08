import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { PrintHeader } from '../common/PrintHeader';
import { formatNumber, triggerPrint } from '../../lib/exportUtils';
import {
  Flame,
  ChefHat,
  Scissors,
  CookingPot,
  Scale,
  Sparkles,
  CheckCircle2,
  Clock,
  Thermometer,
  ShieldAlert,
  Printer,
  Sliders,
} from 'lucide-react';

export const ProductionModule: React.FC = () => {
  const {
    kitchenProgress,
    updateKitchenProgress,
    menuItems,
    sppgConfig,
    currentUser,
    hasPermission,
  } = useApp();

  const menuToday = menuItems[0];

  const [batch1Status, setBatch1Status] = useState<'Selesai Dimasak' | 'Proses' | 'Terjadwal'>('Selesai Dimasak');
  const [batch2Status, setBatch2Status] = useState<'Selesai Dimasak' | 'Proses' | 'Terjadwal'>('Proses');
  const [coreTemp, setCoreTemp] = useState<number>(78.5); // Core cooking temp (°C)
  const [oilTemp, setOilTemp] = useState<number>(165); // Frying oil temp (°C)
  const [tasteNotes, setTasteNotes] = useState('Rasa seimbang, keasinan pas < 1.5g per porsi, ayam matang sempurna dan empuk.');

  const handleUpdateSlider = (field: keyof typeof kitchenProgress, val: number) => {
    updateKitchenProgress({ [field]: val });
  };

  const handleToggleTaste = () => {
    updateKitchenProgress({ tasteCheckDone: !kitchenProgress.tasteCheckDone });
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-blue-900 dark:text-sky-400" />
            Manajemen Dapur & Produksi Masak MBG
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Standar Sanitasi Higiene Dapur, Jadwal Batch Masak, CCP Suhu & Uji Organoleptik
          </p>
        </div>

        <button
          type="button"
          onClick={triggerPrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Lembar Produksi (SPK Dapur)</span>
        </button>
      </div>

      {/* Production Batch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batch 1: Subuh */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Batch 1 • 04:30 - 07:30 WIB
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                Porsi PAUD/TK & SD (1.120 Porsi)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sasaran: SDN Temenggungan 1 & 2, MIS Hafshawaty, PAUD Al-Hafsh
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {batch1Status}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <div>• Nasi: 180 kg beras pulen matang pukul 06:15 WIB</div>
            <div>• Ayam Fillet Saus Mentega Madu: Selesai goreng suhu 82°C</div>
            <div>• Sop Sayur: Pematangan terkontrol suhu 79°C</div>
            <div>• Ompreng Disegel: 1.120 boks siap muat armada kloter pagi</div>
          </div>
        </div>

        {/* Batch 2: Pagi */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-sky-500">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                Batch 2 • 07:30 - 10:30 WIB
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                Porsi SMP, SMA & Pesantren (1.730 Porsi)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sasaran: MTs & MA Hafshawaty, SMPN 1 Krejengan, SMKN 1 Krejengan
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              {batch2Status}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <div>• Nasi: 280 kg beras pulen dalam tahap pemasakan steam boiler</div>
            <div>• Lauk Hewani & Nabati: Dalam proses penirisan dan bumbu glaze</div>
            <div>• Sop Sayur: Perebusan kaldu tulang sapi segar</div>
            <div>• Target Selesai Muat: Pukul 10:45 WIB armada kloter siang</div>
          </div>
        </div>
      </div>

      {/* Progress & Sliders for Division Tasks */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-900 dark:text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kontrol Real-time Progres Tugas 5 Divisi Dapur
              </h3>
              <p className="text-xs text-slate-500">
                Perbarui persentase penyelesaian tahapan produksi langsung dari workstation dapur
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-900 dark:text-sky-400">
            Aktif Beroperasi
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Divisi 1: Persiapan */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-sky-600" />
                1. Divisi Persiapan (Mise en Place)
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {kitchenProgress.preparation}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={kitchenProgress.preparation}
              onChange={e => handleUpdateSlider('preparation', Number(e.target.value))}
              className="w-full accent-blue-900 dark:accent-sky-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Pencucian sayur air mengalir 3x, pengupasan wortel & buncis, pemotongan ayam seragam.
            </p>
          </div>

          {/* Divisi 2: Pengolahan */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CookingPot className="w-4 h-4 text-amber-600" />
                2. Divisi Pengolahan (Memasak)
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {kitchenProgress.cooking}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={kitchenProgress.cooking}
              onChange={e => handleUpdateSlider('cooking', Number(e.target.value))}
              className="w-full accent-blue-900 dark:accent-sky-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Memasak ayam bumbu madu, bacem tempe, dan sop sayur kaldu gurih non-MSG.
            </p>
          </div>

          {/* Divisi 3: Pemorsian */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                3. Divisi Pemorsian (Penimbangan & Seal)
              </span>
              <span className="font-mono font-bold text-blue-900 dark:text-sky-400">
                {kitchenProgress.portioning}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={kitchenProgress.portioning}
              onChange={e => handleUpdateSlider('portioning', Number(e.target.value))}
              className="w-full accent-blue-900 dark:accent-sky-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Timbangan porsi kecil 380g & besar 580g, ompreng stainless steril & segel barcode.
            </p>
          </div>

          {/* Divisi 4: Cuci Ompreng */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                4. Divisi Cuci Ompreng (Sterilisasi)
              </span>
              <span className="font-mono font-bold text-cyan-600">
                {kitchenProgress.washing}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={kitchenProgress.washing}
              onChange={e => handleUpdateSlider('washing', Number(e.target.value))}
              className="w-full accent-blue-900 dark:accent-sky-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Pencucian 3 bak air panas 80°C, sabun food grade, pengeringan rak UV sanitasi.
            </p>
          </div>
        </div>
      </div>

      {/* Food Safety & Organoleptic Quality Log */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CCP Core Temp */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-2">
            <Thermometer className="w-4 h-4 text-rose-600" />
            <span>CCP 1: Suhu Matang Masakan</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {coreTemp}°C
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Standar BGN: Inti daging ayam minimal 75°C. Suhu saat ini 78.5°C (Lolos Aman).
          </p>
        </div>

        {/* Frying Oil Quality */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>CCP 2: Kualitas Minyak Goreng</span>
          </div>
          <div className="text-2xl font-black font-mono text-blue-900 dark:text-sky-400">
            {oilTemp}°C / TPM &lt; 15%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Minyak kemasan baru, diganti maksimal 2x siklus pemakaian, bebas asap pekat.
          </p>
        </div>

        {/* Taste Check Approval */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-red-600" />
                <span>Uji Rasa (Organoleptik)</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kitchenProgress.tasteCheckDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {kitchenProgress.tasteCheckDone ? 'Lolos Uji Rasa' : 'Menunggu Uji'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {tasteNotes}
            </p>
          </div>

          <div className="mt-3 pt-2">
            <button
              type="button"
              onClick={handleToggleTaste}
              className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                kitchenProgress.tasteCheckDone
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-blue-900 text-white hover:bg-blue-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{kitchenProgress.tasteCheckDone ? 'Uji Organoleptik Terverifikasi' : 'Tandai Selesai Uji Rasa'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
