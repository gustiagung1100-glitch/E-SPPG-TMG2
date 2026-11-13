import React from 'react';
import { FacilityTemperatures } from '../../types';
import { defaultFacilityTemperatures } from '../../lib/productionData';
import { Thermometer, Upload, Eye, Camera, CheckCircle2, X, Plus } from 'lucide-react';

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
    id: 'portioning-room',
    badge: 'Ruang 1',
    label: 'Ruang Pemorsian',
    shortLabel: 'R. Pemorsian',
    tempKey: 'portioningRoomTemp',
    photoKey: 'portioningRoomPhoto',
    standard: '≤ 24°C',
    isOk: t => t <= 24,
  },
  {
    id: 'cooking-room',
    badge: 'Ruang 2',
    label: 'Ruang Pengolahan',
    shortLabel: 'R. Pengolahan',
    tempKey: 'cookingRoomTemp',
    photoKey: 'cookingRoomPhoto',
    standard: '≤ 28°C',
    isOk: t => t <= 28,
  },
  {
    id: 'wet-warehouse',
    badge: 'Ruang 3',
    label: 'Ruang Gudang Basah',
    shortLabel: 'Gudang Basah',
    tempKey: 'wetWarehouseTemp',
    photoKey: 'wetWarehousePhoto',
    standard: '10 - 16°C',
    isOk: t => t <= 16,
  },
  {
    id: 'dry-warehouse',
    badge: 'Ruang 4',
    label: 'Ruang Gudang Kering',
    shortLabel: 'Gudang Kering',
    tempKey: 'dryWarehouseTemp',
    photoKey: 'dryWarehousePhoto',
    standard: '≤ 25°C',
    isOk: t => t <= 25,
  },
  {
    id: 'freezer-1',
    badge: 'Pendingin 1',
    label: 'Freezer 1 (Daging)',
    shortLabel: 'Freezer 1 Daging',
    tempKey: 'freezer1Temp',
    photoKey: 'freezer1Photo',
    standard: '≤ -18°C',
    isOk: t => t <= -18,
  },
  {
    id: 'freezer-2',
    badge: 'Pendingin 2',
    label: 'Freezer 2 (Ikan)',
    shortLabel: 'Freezer 2 Ikan',
    tempKey: 'freezer2Temp',
    photoKey: 'freezer2Photo',
    standard: '≤ -18°C',
    isOk: t => t <= -18,
  },
  {
    id: 'fridge-1',
    badge: 'Pendingin 3',
    label: 'Kulkas 1 (Telur)',
    shortLabel: 'Kulkas 1 Telur',
    tempKey: 'fridge1Temp',
    photoKey: 'fridge1Photo',
    standard: '4 - 7°C',
    isOk: t => t <= 7,
  },
  {
    id: 'fridge-2',
    badge: 'Pendingin 4',
    label: 'Kulkas 2 (Sayur)',
    shortLabel: 'Kulkas 2 Sayur',
    tempKey: 'fridge2Temp',
    photoKey: 'fridge2Photo',
    standard: '5 - 8°C',
    isOk: t => t <= 8,
  },
  {
    id: 'fridge-3',
    badge: 'Pendingin 5',
    label: 'Kulkas 3 (Buah)',
    shortLabel: 'Kulkas 3 Buah',
    tempKey: 'fridge3Temp',
    photoKey: 'fridge3Photo',
    standard: '5 - 8°C',
    isOk: t => t <= 8,
  },
  {
    id: 'fridge-4',
    badge: 'Pendingin 6',
    label: 'Kulkas 4 (Bumbu)',
    shortLabel: 'Kulkas 4 Bumbu',
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
      try {
        const maxDim = 960;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          onSuccess(compressed);
        } else {
          onSuccess(rawResult);
        }
      } catch {
        onSuccess(rawResult);
      }
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
          try {
            const maxDim = 960;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
              resolve(rawResult);
            }
          } catch {
            resolve(rawResult);
          }
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
  onUploadUnitPhoto: (photoKey: FacilityPhotoKey, dataUrl: string, unitLabel: string) => void;
  onViewPhoto: (url: string) => void;
  onOpenInputModal?: () => void;
  onUploadError?: (msg: string) => void;
}

export const FacilityTempReportPanel: React.FC<FacilityTempReportPanelProps> = ({
  divisionLabel,
  subtitleMeta,
  facilityTemps,
  onUploadUnitPhoto,
  onViewPhoto,
  onOpenInputModal,
  onUploadError,
}) => {
  const temps: FacilityTemperatures = facilityTemps || defaultFacilityTemperatures;
  const documentedCount = FACILITY_TEMP_UNITS.filter(u =>
    Boolean(getFacilityPhotoUrl(temps, u.photoKey))
  ).length;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Thermometer className="w-5 h-5 text-blue-900 dark:text-sky-400 shrink-0" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Laporan Suhu Ruang Pemorsian, Pengolahan, Gudang Basah/Kering & 6 Pendingin — {divisionLabel}
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
            <span>Input Suhu & Upload Foto</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FACILITY_TEMP_UNITS.map(unit => {
          const tempValue = getFacilityTempValue(temps, unit.tempKey);
          const photoUrl = getFacilityPhotoUrl(temps, unit.photoKey);
          const isOk = unit.isOk(tempValue);

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
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight min-h-[2rem]">
                  {unit.label}
                </div>
                <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                  {tempValue}°C
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Target: {unit.standard}</p>
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
        })}
      </div>
    </div>
  );
};

interface FacilityTempModalGridProps {
  divisionLabel: string;
  value: FacilityTemperatures;
  onChange: (next: FacilityTemperatures) => void;
  onViewPhoto?: (url: string) => void;
  onUploadError?: (msg: string) => void;
}

export const FacilityTempModalGrid: React.FC<FacilityTempModalGridProps> = ({
  divisionLabel,
  value,
  onChange,
  onViewPhoto,
  onUploadError,
}) => {
  const documentedCount = FACILITY_TEMP_UNITS.filter(u =>
    Boolean(getFacilityPhotoUrl(value, u.photoKey))
  ).length;

  return (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
          <Thermometer className="w-4 h-4 text-blue-900 dark:text-sky-400" />
          Suhu Ruang Pemorsian, Pengolahan, Gudang & 6 Pendingin — {divisionLabel} (°C) + Upload Foto
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          {documentedCount}/{FACILITY_TEMP_UNITS.length} Foto Terlampir
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {FACILITY_TEMP_UNITS.map(unit => {
          const tempVal = getFacilityTempValue(value, unit.tempKey);
          const photoVal = getFacilityPhotoUrl(value, unit.photoKey);

          return (
            <div
              key={unit.id}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2"
            >
              <div className="flex items-center justify-between gap-1">
                <label className="block text-slate-700 dark:text-slate-200 font-bold text-[11px] truncate">
                  {unit.shortLabel}
                </label>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{unit.standard}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={tempVal}
                  onChange={e =>
                    onChange(applyFacilityTempPatch(value, unit.tempKey, Number(e.target.value)))
                  }
                  className="w-full px-2 py-1 border rounded-md dark:bg-slate-800 dark:border-slate-700 font-mono text-xs"
                />
                <span className="text-[11px] font-mono text-slate-500">°C</span>
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
        })}
      </div>
    </div>
  );
};
