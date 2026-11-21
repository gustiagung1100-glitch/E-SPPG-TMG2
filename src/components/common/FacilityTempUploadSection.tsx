import React from 'react';
import { FacilityTemperatures } from '../../types';
import { defaultFacilityTemperatures } from '../../lib/productionData';
import { Thermometer, Upload, Eye, Camera, CheckCircle2, X, Plus, Clock } from 'lucide-react';
import { ClassicTimeInput } from './ClassicTimeInput';

export type FacilityTempKey =
  | 'portioningRoomTemp'
  | 'cookingRoomTemp'
  | 'wetWarehouseTemp'
  | 'dryWarehouseTemp'
  | 'freezer1Temp'
  | 'freezer2Temp'
  | 'fridge1Temp'
  | 'fridge2Temp'
  | 'fridge3Temp'
  | 'fridge4Temp';

export type FacilityPhotoKey =
  | 'portioningRoomPhoto'
  | 'cookingRoomPhoto'
  | 'wetWarehousePhoto'
  | 'dryWarehousePhoto'
  | 'freezer1Photo'
  | 'freezer2Photo'
  | 'fridge1Photo'
  | 'fridge2Photo'
  | 'fridge3Photo'
  | 'fridge4Photo';

export interface FacilityTempUnitConfig {
  id: string;
  group: 'room' | 'cooling';
  badge: string;
  label: string;
  shortLabel: string;
  tempKey: FacilityTempKey;
  photoKey: FacilityPhotoKey;
  standard: string;
  isOk: (temp: number) => boolean;
}

export const FACILITY_TEMP_UNITS: FacilityTempUnitConfig[] = [
  {
    id: 'cooking-room',
    group: 'room',
    badge: 'Ruang 1',
    label: 'Ruang Pengolahan',
    shortLabel: 'Ruang Pengolahan',
    tempKey: 'cookingRoomTemp',
    photoKey: 'cookingRoomPhoto',
    standard: '≤ 28°C',
    isOk: t => t <= 28,
  },
  {
    id: 'portioning-room',
    group: 'room',
    badge: 'Ruang 2',
    label: 'Ruang Pemorsian',
    shortLabel: 'Ruang Pemorsian',
    tempKey: 'portioningRoomTemp',
    photoKey: 'portioningRoomPhoto',
    standard: '≤ 24°C',
    isOk: t => t <= 24,
  },
  {
    id: 'wet-warehouse',
    group: 'room',
    badge: 'Ruang 3',
    label: 'Gudang Basah',
    shortLabel: 'Gudang Basah',
    tempKey: 'wetWarehouseTemp',
    photoKey: 'wetWarehousePhoto',
    standard: '10 - 16°C',
    isOk: t => t <= 16,
  },
  {
    id: 'dry-warehouse',
    group: 'room',
    badge: 'Ruang 4',
    label: 'Gudang Kering',
    shortLabel: 'Gudang Kering',
    tempKey: 'dryWarehouseTemp',
    photoKey: 'dryWarehousePhoto',
    standard: '≤ 25°C',
    isOk: t => t <= 25,
  },
  {
    id: 'freezer-1',
    group: 'cooling',
    badge: 'Pendingin 1',
    label: 'Freezer 1 (Daging)',
    shortLabel: 'Freezer 1',
    tempKey: 'freezer1Temp',
    photoKey: 'freezer1Photo',
    standard: '≤ -18°C',
    isOk: t => t <= -18,
  },
  {
    id: 'freezer-2',
    group: 'cooling',
    badge: 'Pendingin 2',
    label: 'Freezer 2 (Ikan)',
    shortLabel: 'Freezer 2',
    tempKey: 'freezer2Temp',
    photoKey: 'freezer2Photo',
    standard: '≤ -18°C',
    isOk: t => t <= -18,
  },
  {
    id: 'fridge-1',
    group: 'cooling',
    badge: 'Pendingin 3',
    label: 'Chiller 1 (Telur)',
    shortLabel: 'Chiller 1',
    tempKey: 'fridge1Temp',
    photoKey: 'fridge1Photo',
    standard: '4 - 7°C',
    isOk: t => t <= 7,
  },
  {
    id: 'fridge-2',
    group: 'cooling',
    badge: 'Pendingin 4',
    label: 'Chiller 2 (Sayur)',
    shortLabel: 'Chiller 2',
    tempKey: 'fridge2Temp',
    photoKey: 'fridge2Photo',
    standard: '5 - 8°C',
    isOk: t => t <= 8,
  },
  {
    id: 'fridge-3',
    group: 'cooling',
    badge: 'Pendingin 5',
    label: 'Chiller 3 (Buah)',
    shortLabel: 'Chiller 3',
    tempKey: 'fridge3Temp',
    photoKey: 'fridge3Photo',
    standard: '5 - 8°C',
    isOk: t => t <= 8,
  },
  {
    id: 'fridge-4',
    group: 'cooling',
    badge: 'Pendingin 6',
    label: 'Chiller 4 (Bumbu)',
    shortLabel: 'Chiller 4',
    tempKey: 'fridge4Temp',
    photoKey: 'fridge4Photo',
    standard: '4 - 6°C',
    isOk: t => t <= 6,
  },
];

export function getFacilityTempValue(
  temps: Partial<FacilityTemperatures> | undefined,
  tempKey: FacilityTempKey
): number {
  const safeTemps = temps || defaultFacilityTemperatures;
  if (tempKey === 'portioningRoomTemp') {
    return (
      safeTemps.portioningRoomTemp ??
      safeTemps.prepRoomTemp ??
      defaultFacilityTemperatures.portioningRoomTemp ??
      21.5
    );
  }
  const value = safeTemps[tempKey];
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  const fallback = defaultFacilityTemperatures[tempKey];
  return typeof fallback === 'number' ? fallback : 0;
}

export function getFacilityPhotoUrl(
  temps: Partial<FacilityTemperatures> | undefined,
  photoKey: FacilityPhotoKey
): string | undefined {
  const safeTemps = temps || defaultFacilityTemperatures;
  if (photoKey === 'portioningRoomPhoto') {
    return safeTemps.portioningRoomPhoto || safeTemps.prepRoomPhoto;
  }
  return safeTemps[photoKey];
}

export function applyFacilityTempPatch(
  current: FacilityTemperatures,
  tempKey: FacilityTempKey,
  nextTemp: number
): FacilityTemperatures {
  if (tempKey === 'portioningRoomTemp') {
    return {
      ...current,
      portioningRoomTemp: nextTemp,
      prepRoomTemp: nextTemp,
    };
  }
  return {
    ...current,
    [tempKey]: nextTemp,
  };
}

export function applyFacilityPhotoPatch(
  current: FacilityTemperatures,
  photoKey: FacilityPhotoKey,
  dataUrl: string | undefined
): FacilityTemperatures {
  if (photoKey === 'portioningRoomPhoto') {
    return {
      ...current,
      portioningRoomPhoto: dataUrl,
      prepRoomPhoto: dataUrl,
    };
  }
  return {
    ...current,
    [photoKey]: dataUrl,
  };
}

export const DEFAULT_FACILITY_HUMIDITY: Record<FacilityTempKey, number> = {
  portioningRoomTemp: 55,
  cookingRoomTemp: 58,
  wetWarehouseTemp: 56,
  dryWarehouseTemp: 52,
  freezer1Temp: 45,
  freezer2Temp: 44,
  fridge1Temp: 54,
  fridge2Temp: 58,
  fridge3Temp: 57,
  fridge4Temp: 53,
};

export function getFacilityHumidityValue(
  temps: Partial<FacilityTemperatures> | undefined,
  tempKey: FacilityTempKey
): number {
  const mapped = temps?.humidityMap?.[tempKey];
  if (typeof mapped === 'number' && !Number.isNaN(mapped)) {
    return mapped;
  }
  return DEFAULT_FACILITY_HUMIDITY[tempKey] ?? 55;
}

export function applyFacilityHumidityPatch(
  current: FacilityTemperatures,
  tempKey: FacilityTempKey,
  nextHumidity: number
): FacilityTemperatures {
  return {
    ...current,
    humidityMap: {
      ...(current.humidityMap || {}),
      [tempKey]: nextHumidity,
    },
  };
}

export function normalizeFacilityTimeString(rawTime?: string): string {
  if (!rawTime) return '07:00';
  const match = rawTime.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '07:00';
}

export function getFacilityTimeValue(
  temps: Partial<FacilityTemperatures> | undefined,
  tempKey: FacilityTempKey,
  fallbackTime?: string
): string {
  const mapped = temps?.timeMap?.[tempKey];
  if (typeof mapped === 'string' && mapped.trim() !== '') {
    return normalizeFacilityTimeString(mapped);
  }
  return normalizeFacilityTimeString(fallbackTime);
}

export function formatFacilityTimeLabel(timeStr: string): string {
  const normalized = normalizeFacilityTimeString(timeStr);
  return `${normalized} WIB`;
}

export function applyFacilityTimePatch(
  current: FacilityTemperatures,
  tempKey: FacilityTempKey,
  nextTime: string
): FacilityTemperatures {
  return {
    ...current,
    timeMap: {
      ...(current.timeMap || {}),
      [tempKey]: nextTime,
    },
  };
}

function compressImageToDataUrl(img: HTMLImageElement, rawResult: string): string {
  try {
    const drawResized = (maxDim: number, quality: number) => {
      let width = img.width || 640;
      let height = img.height || 480;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return rawResult;
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', quality);
    };

    let compressed = drawResized(720, 0.72);
    if (compressed.length > 140000) {
      compressed = drawResized(540, 0.56);
    }
    return compressed;
  } catch {
    return rawResult;
  }
}

export function processFacilityImageUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  onSuccess: (dataUrl: string) => void,
  onError?: (message: string) => void
) {
  const input = e.target;
  const file = input.files?.[0];
  if (!file) return;

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    onError?.(`Ukuran foto (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 5 MB.`);
    input.value = '';
    return;
  }

  if (!file.type.startsWith('image/')) {
    onError?.('Format berkas tidak valid. Harap unggah berkas gambar (JPG, PNG, WebP).');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rawResult = reader.result as string;
    const img = new Image();
    img.onload = () => {
      onSuccess(compressImageToDataUrl(img, rawResult));
      input.value = '';
    };
    img.onerror = () => {
      onSuccess(rawResult);
      input.value = '';
    };
    img.src = rawResult;
  };
  reader.onerror = () => {
    onError?.('Gagal membaca berkas gambar. Silakan coba lagi.');
    input.value = '';
  };
  reader.readAsDataURL(file);
}

export async function processMultipleImageUploads(
  e: React.ChangeEvent<HTMLInputElement>,
  onSuccess: (dataUrls: string[]) => void,
  onError?: (message: string) => void
) {
  const input = e.target;
  const files = Array.from(input.files || []);
  if (files.length === 0) return;

  const maxBytes = 5 * 1024 * 1024;
  const errors: string[] = [];
  const validFiles: File[] = [];

  for (const file of files) {
    if (file.size > maxBytes) {
      errors.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 5 MB.`);
      continue;
    }
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name} bukan berkas gambar (JPG, PNG, WebP).`);
      continue;
    }
    validFiles.push(file);
  }

  const compressOne = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawResult = reader.result as string;
        const img = new Image();
        img.onload = () => {
          resolve(compressImageToDataUrl(img, rawResult));
        };
        img.onerror = () => resolve(rawResult);
        img.src = rawResult;
      };
      reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
      reader.readAsDataURL(file);
    });

  const results: string[] = [];
  for (const file of validFiles) {
    try {
      const url = await compressOne(file);
      results.push(url);
    } catch {
      errors.push(`Gagal memproses ${file.name}.`);
    }
  }

  input.value = '';

  if (errors.length > 0) {
    onError?.(errors.join(' '));
  }
  if (results.length > 0) {
    onSuccess(results);
  }
}

interface FacilityTempReportPanelProps {
  divisionLabel: string;
  subtitleMeta?: string;
  facilityTemps?: FacilityTemperatures;
  fallbackTime?: string;
  showTimeFields?: boolean;
  showCoolingHumidity?: boolean;
  onUploadUnitPhoto: (photoKey: FacilityPhotoKey, dataUrl: string, unitLabel: string) => void;
  onViewPhoto: (url: string) => void;
  onOpenInputModal?: () => void;
  onUploadError?: (msg: string) => void;
}

export const FacilityTempReportPanel: React.FC<FacilityTempReportPanelProps> = ({
  divisionLabel,
  subtitleMeta,
  facilityTemps,
  fallbackTime,
  showTimeFields = false,
  showCoolingHumidity = true,
  onUploadUnitPhoto,
  onViewPhoto,
  onOpenInputModal,
  onUploadError,
}) => {
  const temps: FacilityTemperatures = facilityTemps || defaultFacilityTemperatures;
  const documentedCount = FACILITY_TEMP_UNITS.filter(u =>
    Boolean(getFacilityPhotoUrl(temps, u.photoKey))
  ).length;
  const roomUnits = FACILITY_TEMP_UNITS.filter(u => u.group === 'room');
  const coolingUnits = FACILITY_TEMP_UNITS.filter(u => u.group === 'cooling');

  const renderUnitCard = (unit: FacilityTempUnitConfig) => {
    const tempValue = getFacilityTempValue(temps, unit.tempKey);
    const humValue = getFacilityHumidityValue(temps, unit.tempKey);
    const timeValue = getFacilityTimeValue(temps, unit.tempKey, fallbackTime);
    const photoUrl = getFacilityPhotoUrl(temps, unit.photoKey);
    const isOk = unit.isOk(tempValue);
    const displayHumidity = unit.group === 'room' || showCoolingHumidity;

    return (
      <div
        key={unit.id}
        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between gap-2"
      >
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {unit.badge}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isOk
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {isOk ? 'Standar' : 'Perhatian'}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight min-h-[1.75rem]">
            {unit.label}
          </div>
          <div className="flex items-baseline justify-between gap-1 mt-1">
            <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
              {tempValue}°C
            </span>
            {displayHumidity && (
              <span className="text-[10px] font-mono text-slate-500">RH {humValue}%</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5 flex-wrap">
            <p className="text-[10px] text-slate-500">Target: {unit.standard}</p>
            {(showTimeFields || Boolean(temps.timeMap?.[unit.tempKey])) && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-blue-800 dark:text-sky-300">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                {formatFacilityTimeLabel(timeValue)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {photoUrl ? (
            <div className="relative group">
              <img
                src={photoUrl}
                alt={`Foto ${unit.label}`}
                onClick={() => onViewPhoto(photoUrl)}
                className="w-full h-16 object-cover rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 hover:opacity-90 transition"
              />
              <button
                type="button"
                onClick={() => onViewPhoto(photoUrl)}
                title="Lihat Bukti Foto"
                className="print:hidden absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[9px] font-bold inline-flex items-center gap-0.5 hover:bg-slate-900"
              >
                <Eye className="w-2.5 h-2.5" />
                <span>Lihat</span>
              </button>
            </div>
          ) : (
            <div className="w-full h-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 text-[10px]">
              <Camera className="w-3.5 h-3.5 mb-0.5" />
              <span>Belum ada foto</span>
            </div>
          )}

          <label className="print:hidden w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 active:scale-[0.98] text-white text-[10px] font-bold cursor-pointer transition shadow-2xs">
            <Upload className="w-3 h-3 shrink-0" />
            <span>{photoUrl ? 'Upload Ulang' : 'Upload Foto'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e =>
                processFacilityImageUpload(
                  e,
                  url => onUploadUnitPhoto(unit.photoKey, url, unit.label),
                  onUploadError
                )
              }
            />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Thermometer className="w-5 h-5 text-blue-900 dark:text-sky-400 shrink-0" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Suhu Ruang, Freezer &amp; Chiller — {divisionLabel}
            </h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              {documentedCount}/{FACILITY_TEMP_UNITS.length} Foto Terupload
            </span>
          </div>
          {subtitleMeta && (
            <p className="text-xs text-slate-500 font-mono mt-1">{subtitleMeta}</p>
          )}
        </div>

        {onOpenInputModal && (
          <button
            type="button"
            onClick={onOpenInputModal}
            className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-900 dark:text-sky-300 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Suhu &amp; Upload Foto</span>
          </button>
        )}
      </div>

      {/* Kelompok 1: Suhu Ruang */}
      <div className="space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Suhu Ruang (Ruang Pengolahan, Ruang Pemorsian, Gudang Basah &amp; Gudang Kering)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {roomUnits.map(renderUnitCard)}
        </div>
      </div>

      {/* Kelompok 2: Suhu Freezer 1-2 & Chiller 1-4 */}
      <div className="space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Suhu Pendingin (Freezer 1–2 &amp; Chiller 1–4)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {coolingUnits.map(renderUnitCard)}
        </div>
      </div>
    </div>
  );
};

interface FacilityTempModalGridProps {
  divisionLabel: string;
  value: FacilityTemperatures;
  fallbackTime?: string;
  showTimeFields?: boolean;
  showCoolingHumidity?: boolean;
  onChange: (next: FacilityTemperatures) => void;
  onViewPhoto?: (url: string) => void;
  onUploadError?: (msg: string) => void;
}

export const FacilityTempModalGrid: React.FC<FacilityTempModalGridProps> = ({
  divisionLabel,
  value,
  fallbackTime,
  showTimeFields = false,
  showCoolingHumidity = true,
  onChange,
  onViewPhoto,
  onUploadError,
}) => {
  const documentedCount = FACILITY_TEMP_UNITS.filter(u =>
    Boolean(getFacilityPhotoUrl(value, u.photoKey))
  ).length;
  const roomUnits = FACILITY_TEMP_UNITS.filter(u => u.group === 'room');
  const coolingUnits = FACILITY_TEMP_UNITS.filter(u => u.group === 'cooling');

  const renderInputCard = (unit: FacilityTempUnitConfig) => {
    const tempVal = getFacilityTempValue(value, unit.tempKey);
    const timeVal = getFacilityTimeValue(value, unit.tempKey, fallbackTime);
    const photoVal = getFacilityPhotoUrl(value, unit.photoKey);
    const showHumidityInput = unit.group === 'room' || showCoolingHumidity;

    const columnCount =
      (showHumidityInput ? 1 : 0) + (showTimeFields ? 1 : 0) + 1;
    const gridColsClass =
      columnCount === 3 ? 'grid-cols-3' : columnCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

    return (
      <div
        key={unit.id}
        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2"
      >
        <div className="flex items-center justify-between gap-1">
          <label className="block text-slate-800 dark:text-slate-100 font-bold text-[11px] truncate" title={unit.label}>
            {unit.shortLabel}
          </label>
          <span className="text-[10px] font-mono text-slate-400 shrink-0">{unit.standard}</span>
        </div>

        <div className={`grid ${gridColsClass} gap-1.5`}>
          <div>
            <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Suhu (°C)</label>
            <input
              type="number"
              step="0.1"
              value={Number.isFinite(tempVal) ? tempVal : ''}
              onChange={e => {
                const parsed = Number(e.target.value);
                onChange(
                  applyFacilityTempPatch(
                    value,
                    unit.tempKey,
                    Number.isFinite(parsed) ? parsed : 0
                  )
                );
              }}
              title="Suhu (°C)"
              className="w-full px-1.5 py-1 border rounded-md dark:bg-slate-800 dark:border-slate-700 font-mono text-xs"
            />
          </div>

          {showHumidityInput && (
            <div>
              <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Kelembapan (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={getFacilityHumidityValue(value, unit.tempKey)}
                onChange={e => {
                  const parsed = Number(e.target.value);
                  onChange(
                    applyFacilityHumidityPatch(
                      value,
                      unit.tempKey,
                      Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0
                    )
                  );
                }}
                title="Kelembapan (%)"
                className="w-full px-1.5 py-1 border rounded-md dark:bg-slate-800 dark:border-slate-700 font-mono text-xs"
              />
            </div>
          )}

          {showTimeFields && (
            <div>
              <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Waktu</label>
              <ClassicTimeInput
                value={timeVal}
                format="HH:mm"
                compact
                onChange={val => onChange(applyFacilityTimePatch(value, unit.tempKey, val))}
                title="Waktu Pencatatan (Classic Dual Wheel)"
                className="w-full pl-1.5 py-1 border rounded-md dark:bg-slate-800 dark:border-slate-700 font-mono text-[11px]"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {photoVal && (
            <img
              src={photoVal}
              alt={unit.label}
              onClick={() => onViewPhoto?.(photoVal)}
              className="w-9 h-9 rounded object-cover border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
            />
          )}
          <label className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-blue-900 dark:text-sky-300 border border-blue-200 dark:border-sky-800 text-[10px] font-bold cursor-pointer transition">
            <Upload className="w-3 h-3 shrink-0" />
            <span>{photoVal ? 'Ganti Foto' : 'Upload Foto'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e =>
                processFacilityImageUpload(
                  e,
                  url => onChange(applyFacilityPhotoPatch(value, unit.photoKey, url)),
                  onUploadError
                )
              }
            />
          </label>
          {photoVal && (
            <button
              type="button"
              title="Hapus Foto"
              onClick={() =>
                onChange(applyFacilityPhotoPatch(value, unit.photoKey, undefined))
              }
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Bagian 2: Input Data & Upload Foto Suhu Ruang */}
      <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-amber-600" />
            Input Data &amp; Upload Foto Suhu Ruang — {divisionLabel} (Ruang Pengolahan, Ruang Pemorsian, Gudang Basah, Gudang Kering)
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {roomUnits.filter(u => Boolean(getFacilityPhotoUrl(value, u.photoKey))).length}/{roomUnits.length} Foto Ruang
          </span>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showTimeFields ? '' : 'lg:grid-cols-4'} gap-2.5`}>
          {roomUnits.map(renderInputCard)}
        </div>
      </div>

      {/* Bagian 3: Input Data & Upload Foto Suhu Freezer 1-2 & Chiller 1-4 */}
      <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-sky-600" />
            Input Data &amp; Upload Foto Suhu Freezer &amp; Chiller — {divisionLabel} (Freezer 1–2 &amp; Chiller 1–4)
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {coolingUnits.filter(u => Boolean(getFacilityPhotoUrl(value, u.photoKey))).length}/{coolingUnits.length} Foto Pendingin • Total {documentedCount}/{FACILITY_TEMP_UNITS.length}
          </span>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showTimeFields && showCoolingHumidity ? '' : 'lg:grid-cols-3'} gap-2.5`}>
          {coolingUnits.map(renderInputCard)}
        </div>
      </div>
    </div>
  );
};
