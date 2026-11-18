import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Upload,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';

export interface LandscapeTrayCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  portionLabel: string; // e.g., "Porsi Kecil" | "Porsi Besar"
  locationLabel: string; // e.g., Nama Sekolah / Lokasi Dapur SPPG
}

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 800; // 16:10 Landscape Tray Aspect Ratio
const JPEG_QUALITY = 0.85;

function formatRealtimeWatermarkTimestamp(now: Date): { dateStr: string; timeStr: string } {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return {
    dateStr: `${dd}/${mm}/${yyyy}`,
    timeStr: `${hh}:${min}:${ss} WIB`,
  };
}

function drawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  locationLabel: string,
  portionLabel: string
) {
  const { dateStr, timeStr } = formatRealtimeWatermarkTimestamp(new Date());
  const line1 = `${dateStr} • ${timeStr} • ${portionLabel}`;
  const line2 = locationLabel || 'Dapur SPPG';

  const fontSizeMain = Math.max(15, Math.round(width * 0.0155));
  const fontSizeSub = Math.max(13, Math.round(width * 0.0135));
  const padX = Math.round(width * 0.016);
  const padY = Math.round(height * 0.014);
  const margin = Math.round(width * 0.02);

  ctx.save();
  ctx.font = `700 ${fontSizeMain}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  const w1 = ctx.measureText(line1).width;
  ctx.font = `600 ${fontSizeSub}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const w2 = ctx.measureText(line2).width;

  const boxWidth = Math.min(width - margin * 2, Math.max(w1, w2) + padX * 2);
  const boxHeight = fontSizeMain + fontSizeSub + padY * 2 + 8;
  const boxX = margin;
  const boxY = height - margin - boxHeight;

  // Rounded dark backdrop
  const r = 10;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.74)';
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxWidth - r, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - r, boxY + boxHeight);
  ctx.lineTo(boxX + r, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();

  // Emerald left accent bar
  ctx.fillStyle = '#10B981';
  ctx.fillRect(boxX + 6, boxY + 8, 4, boxHeight - 16);

  // Text lines
  ctx.fillStyle = '#ECFDF5';
  ctx.font = `700 ${fontSizeMain}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.fillText(line1, boxX + padX + 4, boxY + padY + fontSizeMain - 2, boxWidth - padX * 2 - 4);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = `600 ${fontSizeSub}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(line2, boxX + padX + 4, boxY + padY + fontSizeMain + fontSizeSub + 5, boxWidth - padX * 2 - 4);
  ctx.restore();
}

export const LandscapeTrayCameraModal: React.FC<LandscapeTrayCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  portionLabel,
  locationLabel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const guideBoxRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCameraStream();
    setCameraStatus('loading');
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('error');
      setErrorMessage(
        'Browser atau perangkat ini tidak mendukung akses kamera langsung (getUserMedia). Gunakan tombol kamera bawaan atau unggah dari galeri di bawah.'
      );
      return;
    }

    const constraintCandidates: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: 'environment' },
          aspectRatio: { ideal: 16 / 9 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'environment' },
          aspectRatio: { ideal: 4 / 3 },
        },
        audio: false,
      },
      {
        video: { facingMode: 'environment' },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let acquiredStream: MediaStream | null = null;
    let lastErr: unknown = null;

    for (const constraints of constraintCandidates) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastErr = err;
        // If user explicitly denied permission, do not keep retrying
        if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
          break;
        }
      }
    }

    if (!acquiredStream) {
      const errName = lastErr instanceof DOMException ? lastErr.name : '';
      let msg = 'Kamera tidak dapat diakses pada perangkat ini.';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        msg =
          'Izin akses kamera ditolak oleh browser. Aktifkan izin kamera pada pengaturan browser, atau gunakan kamera bawaan / galeri di bawah.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        msg = 'Perangkat kamera tidak ditemukan. Anda tetap dapat mengunggah foto dari galeri atau kamera bawaan.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
      }
      setCameraStatus('error');
      setErrorMessage(msg);
      return;
    }

    streamRef.current = acquiredStream;
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.srcObject = acquiredStream;
      try {
        await videoEl.play();
      } catch {
        // Auto-play handle via onLoadedMetadata
      }
    }

    // Check Torch / Flash support
    const videoTrack = acquiredStream.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
      try {
        const caps = videoTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(Boolean(caps?.torch));
      } catch {
        setTorchSupported(false);
      }
    }

    setCameraStatus('ready');
  }, [stopCameraStream]);

  // Orientation & screen lock watcher
  useEffect(() => {
    if (!isOpen) return;

    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Try locking landscape orientation on supported mobile browsers
    const orientationApi = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (orientation: string) => Promise<void>; unlock?: () => void })
      | undefined;
    if (orientationApi && typeof orientationApi.lock === 'function') {
      orientationApi.lock('landscape').catch(() => {
        // Ignore gracefully when browser requires fullscreen or disallows lock
      });
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (orientationApi && typeof orientationApi.unlock === 'function') {
        try {
          orientationApi.unlock();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  // Manage lifecycle when opened / closed
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      startCamera();
    } else {
      stopCameraStream();
      setCapturedPreview(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCamera, stopCameraStream]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleToggleTorch = async () => {
    const stream = streamRef.current;
    if (!stream || !torchSupported) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const nextTorch = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setTorchOn(nextTorch);
    } catch {
      setTorchSupported(false);
    }
  };

  // Capture & auto-crop from live video to 16:10 landscape tray guide
  const handleShutterCapture = () => {
    const video = videoRef.current;
    const guideBox = guideBoxRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsCapturing(true);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 180);

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const vRect = video.getBoundingClientRect();
      const gRect = guideBox?.getBoundingClientRect();

      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;

      if (gRect && vRect.width > 0 && vRect.height > 0) {
        // Account for object-cover scaling & centering of the <video>
        const coverScale = Math.max(vRect.width / vw, vRect.height / vh);
        const renderedWidth = vw * coverScale;
        const renderedHeight = vh * coverScale;
        const offsetX = (renderedWidth - vRect.width) / 2;
        const offsetY = (renderedHeight - vRect.height) / 2;

        const relLeft = gRect.left - vRect.left;
        const relTop = gRect.top - vRect.top;

        sx = Math.max(0, (relLeft + offsetX) / coverScale);
        sy = Math.max(0, (relTop + offsetY) / coverScale);
        sw = Math.min(vw - sx, gRect.width / coverScale);
        sh = Math.min(vh - sy, gRect.height / coverScale);
      } else {
        // Fallback centered 16:10 landscape crop
        const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
        const videoRatio = vw / vh;
        if (videoRatio > targetRatio) {
          sh = vh * 0.8;
          sw = sh * targetRatio;
        } else {
          sw = vw * 0.8;
          sh = sw / targetRatio;
        }
        sx = (vw - sw) / 2;
        sy = (vh - sh) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      drawWatermarkOnCanvas(ctx, TARGET_WIDTH, TARGET_HEIGHT, locationLabel, portionLabel);

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      setCapturedPreview(dataUrl);
      stopCameraStream();
    } finally {
      setIsCapturing(false);
    }
  };

  // Fallback file upload (capture="environment" or gallery) normalized to 16:10 landscape + watermark
  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // If user uploaded a tall portrait image via fallback camera, auto-rotate 90deg to landscape
        const sourceCanvas = document.createElement('canvas');
        let srcW = img.width;
        let srcH = img.height;
        if (img.height > img.width * 1.05) {
          sourceCanvas.width = img.height;
          sourceCanvas.height = img.width;
          const sctx = sourceCanvas.getContext('2d');
          if (sctx) {
            sctx.translate(sourceCanvas.width / 2, sourceCanvas.height / 2);
            sctx.rotate(-Math.PI / 2);
            sctx.drawImage(img, -img.width / 2, -img.height / 2);
            srcW = sourceCanvas.width;
            srcH = sourceCanvas.height;
          }
        } else {
          sourceCanvas.width = img.width;
          sourceCanvas.height = img.height;
          const sctx = sourceCanvas.getContext('2d');
          if (sctx) sctx.drawImage(img, 0, 0);
        }

        // Center-crop to 16:10 landscape
        const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
        const srcRatio = srcW / srcH;
        let sx = 0;
        let sy = 0;
        let sw = srcW;
        let sh = srcH;
        if (srcRatio > targetRatio) {
          sw = srcH * targetRatio;
          sx = (srcW - sw) / 2;
        } else {
          sh = srcW / targetRatio;
          sy = (srcH - sh) / 2;
        }

        ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        drawWatermarkOnCanvas(ctx, TARGET_WIDTH, TARGET_HEIGHT, locationLabel, portionLabel);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        setCapturedPreview(dataUrl);
        stopCameraStream();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    startCamera();
  };

  const handleUsePhoto = () => {
    if (!capturedPreview) return;
    onCapture(capturedPreview);
    stopCameraStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black text-white flex flex-row overflow-hidden select-none">
      {/* Hidden Fallback Inputs (Camera & Gallery) */}
      <input
        ref={fallbackCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFallbackFileChange}
        className="hidden"
      />

      {/* MAIN VIEWPORT: LIVE CAMERA OR CROP PREVIEW */}
      <div className="relative flex-1 h-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {capturedPreview ? (
          /* ============================================================= */
          /* 4. PRATINJAU HASIL CROP LANDSCAPE                             */
          /* ============================================================= */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Pratinjau Hasil Crop Ompreng Landscape (16:10) • {portionLabel}</span>
            </div>

            <div className="relative w-full max-w-4xl max-h-[68vh] aspect-[16/10] rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-2xl bg-black">
              <img
                src={capturedPreview}
                alt={`Hasil Foto Ompreng ${portionLabel}`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs sm:text-sm font-bold transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Foto Ulang</span>
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/50 transition"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Foto Ini</span>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================= */
          /* 1 & 2. LIVE VIEWFINDER + LANDSCAPE TRAY SVG STENCIL OVERLAY   */
          /* ============================================================= */
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setCameraStatus('ready')}
              className={`w-full h-full object-cover ${cameraStatus === 'error' ? 'hidden' : 'block'}`}
            />

            {/* Shutter Flash Feedback */}
            {flashEffect && <div className="absolute inset-0 bg-white/80 pointer-events-none z-30" />}

            {/* SVG Stencil Dark Surround + Cutout + 5-Compartment Ompreng Guidelines */}
            {cameraStatus !== 'error' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Dark Semi-Transparent Surround with Centered Transparent Tray Window */}
                <div
                  ref={guideBoxRef}
                  className="relative w-[76%] max-w-[780px] max-h-[76%] aspect-[16/10] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.52)]"
                >
                  <svg
                    viewBox="0 0 800 500"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                    aria-hidden="true"
                  >
                    {/* Outer Dashed Guide (White base + Emerald dash overlay) */}
                    <rect
                      x="3"
                      y="3"
                      width="794"
                      height="494"
                      rx="22"
                      ry="22"
                      fill="none"
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth="3"
                      strokeDasharray="14 10"
                    />
                    <rect
                      x="3"
                      y="3"
                      width="794"
                      height="494"
                      rx="22"
                      ry="22"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeDasharray="14 10"
                      strokeDashoffset="12"
                    />

                    {/* 5 Horizontal Tray Compartment Dividers */}
                    {/* Horizontal divider separating Top 3 compartments (40%) and Bottom 2 compartments (60%) */}
                    <line
                      x1="14"
                      y1="205"
                      x2="786"
                      y2="205"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="2.5"
                      strokeDasharray="8 7"
                    />
                    <line
                      x1="14"
                      y1="205"
                      x2="786"
                      y2="205"
                      stroke="#34D399"
                      strokeWidth="2.5"
                      strokeDasharray="8 7"
                      strokeDashoffset="7"
                    />

                    {/* Top Row: 3 smaller compartments (Lauk Utama, Buah, Susu) */}
                    <line
                      x1="272"
                      y1="14"
                      x2="272"
                      y2="205"
                      stroke="rgba(255,255,255,0.75)"
                      strokeWidth="2"
                      strokeDasharray="7 7"
                    />
                    <line
                      x1="534"
                      y1="14"
                      x2="534"
                      y2="205"
                      stroke="rgba(255,255,255,0.75)"
                      strokeWidth="2"
                      strokeDasharray="7 7"
                    />

                    {/* Bottom Row: 2 larger compartments (Nasi & Sayur) */}
                    <line
                      x1="400"
                      y1="205"
                      x2="400"
                      y2="486"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="2.5"
                      strokeDasharray="8 7"
                    />
                    <line
                      x1="400"
                      y1="205"
                      x2="400"
                      y2="486"
                      stroke="#34D399"
                      strokeWidth="2.5"
                      strokeDasharray="8 7"
                      strokeDashoffset="7"
                    />

                    {/* Subtle Compartment Guide Labels */}
                    <g fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">
                      <text x="142" y="112" fill="rgba(255,255,255,0.78)">Lauk Utama</text>
                      <text x="403" y="112" fill="rgba(255,255,255,0.78)">Buah</text>
                      <text x="660" y="112" fill="rgba(255,255,255,0.78)">Susu / Ekstra</text>
                      <text x="207" y="352" fill="rgba(255,255,255,0.85)">Nasi / Pokok</text>
                      <text x="593" y="352" fill="rgba(255,255,255,0.85)">Sayur</text>
                    </g>

                    {/* 4 Corner Brackets (Tanda Siku Hijau Emerald) */}
                    <g stroke="#34D399" strokeWidth="6" strokeLinecap="round" fill="none">
                      {/* Top-Left */}
                      <path d="M 0 38 L 0 12 Q 0 0 12 0 L 38 0" />
                      {/* Top-Right */}
                      <path d="M 762 0 L 788 0 Q 800 0 800 12 L 800 38" />
                      {/* Bottom-Left */}
                      <path d="M 0 462 L 0 488 Q 0 500 12 500 L 38 500" />
                      {/* Bottom-Right */}
                      <path d="M 762 500 L 788 500 Q 800 500 800 488 L 800 462" />
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* Top Center Instruction Pill Badge + Portrait Orientation Warning */}
            <div className="absolute top-3 inset-x-3 flex flex-col items-center gap-2 pointer-events-none z-20">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-emerald-400/50 shadow-lg text-center">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wide shrink-0">
                  {portionLabel}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-white">
                  Posisikan Ompreng Secara Horizontal di Dalam Garis Panduan
                </span>
              </div>

              {isPortrait && cameraStatus !== 'error' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 text-[11px] font-bold shadow-md">
                  <Smartphone className="w-3.5 h-3.5 rotate-90 shrink-0" />
                  <span>Disarankan miringkan ponsel ke posisi Landscape agar layar lebih lega</span>
                </div>
              )}
            </div>

            {/* Bottom-Left Watermark Info Preview */}
            {cameraStatus === 'ready' && (
              <div className="absolute bottom-3 left-3 pointer-events-none z-20 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs border border-white/15 text-[10px] text-slate-200 font-mono">
                Watermark Otomatis: {locationLabel} • {portionLabel}
              </div>
            )}

            {/* Loading State */}
            {cameraStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 gap-3 p-4 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                <p className="text-xs sm:text-sm font-semibold text-slate-200">
                  Mengaktifkan Kamera Belakang (Mode Landscape)...
                </p>
              </div>
            )}

            {/* Error / Permission Blocked Fallback State */}
            {cameraStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 p-6 text-center max-w-md mx-auto gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    Akses Kamera Langsung Tidak Tersedia
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Coba Kamera Lagi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackCameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Buka Kamera Bawaan HP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-xs font-bold text-white transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih dari Galeri</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SLIM VERTICAL RIGHT CONTROL RAIL (THUMB-FRIENDLY IN LANDSCAPE) */}
      <div className="w-20 sm:w-24 shrink-0 h-full bg-slate-950/95 border-l border-white/15 flex flex-col items-center justify-between py-4 px-2 z-30">
        {/* Top: Flash / Torch Control */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            disabled={!torchSupported || Boolean(capturedPreview)}
            onClick={handleToggleTorch}
            title={
              torchSupported
                ? torchOn
                  ? 'Matikan Flash/Lampu'
                  : 'Nyalakan Flash/Lampu'
                : 'Flash tidak didukung di browser ini'
            }
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition ${
              torchOn
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
                : torchSupported && !capturedPreview
                ? 'bg-slate-800 hover:bg-slate-700 text-white border-white/20'
                : 'bg-slate-900 text-slate-600 border-white/10 cursor-not-allowed'
            }`}
          >
            {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
          </button>
          <span className="text-[10px] font-semibold text-slate-400">
            {torchOn ? 'Flash On' : 'Flash'}
          </span>
        </div>

        {/* Center: Big Shutter Button */}
        <div className="flex flex-col items-center gap-2">
          {!capturedPreview ? (
            <>
              <button
                type="button"
                disabled={cameraStatus !== 'ready' || isCapturing}
                onClick={handleShutterCapture}
                title="Ambil Foto Ompreng"
                className="w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full border-4 border-white p-1 flex items-center justify-center bg-transparent hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="w-full h-full rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-inner">
                  <Camera className="w-6 h-6 text-slate-950" />
                </span>
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Jepret
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={handleUsePhoto}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition"
              title="Gunakan Foto Ini"
            >
              <Check className="w-7 h-7 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Bottom: Galeri / Kamera Bawaan & Tutup */}
        <div className="flex flex-col items-center gap-3">
          {!capturedPreview && (
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              title="Unggah / Pilih dari Galeri"
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition"
            >
              <span className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold">Galeri</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Tutup Kamera"
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-rose-400 transition"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-rose-950/70 border border-white/15 flex items-center justify-center">
              <X className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-semibold">Tutup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
