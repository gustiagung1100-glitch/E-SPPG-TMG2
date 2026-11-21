import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Maximize2,
} from 'lucide-react';

export interface LandscapeTrayCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  portionLabel: string; // e.g., "Porsi Kecil" | "Porsi Besar"
  locationLabel: string; // e.g., Nama Sekolah / Lokasi Dapur SPPG
}

interface ExtendedCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step?: number };
}

interface ExtendedConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
  zoom?: number;
}

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 800; // 16:10 Landscape Tray Aspect Ratio
const JPEG_QUALITY = 0.85;
const DEFAULT_ZOOM_PRESET = 0.6 as const;

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
  portionLabel: string,
  zoomLabel: string
) {
  const { dateStr, timeStr } = formatRealtimeWatermarkTimestamp(new Date());
  const line1 = `${dateStr} • ${timeStr} • ${portionLabel} (${zoomLabel})`;
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

  ctx.fillStyle = '#10B981';
  ctx.fillRect(boxX + 6, boxY + 8, 4, boxHeight - 16);

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

  // Zoom / Lens 0.6x (Default) vs 1.0x
  const [zoomLevel, setZoomLevel] = useState<0.6 | 1.0>(DEFAULT_ZOOM_PRESET);
  const [zoomSourceMode, setZoomSourceMode] = useState<'hardware' | 'ultrawide_lens' | 'wide_fov'>('wide_fov');
  const [ultraWideDeviceId, setUltraWideDeviceId] = useState<string | null>(null);
  const [mainRearDeviceId, setMainRearDeviceId] = useState<string | null>(null);

  // Flash / Torch Controls (Hidupkan & Matikan Flash)
  const [torchSupported, setTorchSupported] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [flashModeLabel, setFlashModeLabel] = useState<'LED' | 'Layar' | 'Mati'>('Mati');

  // Responsive Smartphone Viewport State
  const [viewport, setViewport] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shutterFlashEffect, setShutterFlashEffect] = useState(false);

  const layout = useMemo(() => {
    const { width, height } = viewport;
    const isPortrait = height > width;
    const isNarrowPhone = width <= 390;
    const isCompactLandscape = !isPortrait && height <= 460;
    const isSmartphone = width < 768 || height < 520;
    return {
      width,
      height,
      isPortrait,
      isNarrowPhone,
      isCompactLandscape,
      isSmartphone,
    };
  }, [viewport]);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          // Turn off hardware torch cleanly before stopping track
          if (track.kind === 'video' && typeof track.applyConstraints === 'function') {
            track
              .applyConstraints({
                advanced: [{ torch: false } as ExtendedConstraintSet],
              })
              .catch(() => {
                // ignore if unsupported
              });
          }
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
    setFlashOn(false);
    setFlashModeLabel('Mati');
    setTorchSupported(false);
  }, []);

  const applyTorchToTrack = useCallback(async (track: MediaStreamTrack | undefined, desiredOn: boolean) => {
    if (!track || typeof track.applyConstraints !== 'function') return false;
    try {
      await track.applyConstraints({
        advanced: [{ torch: desiredOn } as ExtendedConstraintSet],
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const applyZoomToTrack = useCallback(
    async (track: MediaStreamTrack | undefined, targetZoom: 0.6 | 1.0): Promise<'hardware' | 'wide_fov'> => {
      if (!track || typeof track.getCapabilities !== 'function') return 'wide_fov';
      try {
        const caps = track.getCapabilities() as ExtendedCapabilities;
        if (caps?.zoom && typeof caps.zoom.min === 'number' && typeof caps.zoom.max === 'number') {
          const minZ = caps.zoom.min;
          const maxZ = caps.zoom.max;
          if (targetZoom < 1.0 && minZ < 1.0) {
            const clamped = Math.max(minZ, Math.min(maxZ, targetZoom));
            await track.applyConstraints({
              advanced: [{ zoom: clamped } as ExtendedConstraintSet],
            });
            return 'hardware';
          }
          if (targetZoom >= 1.0) {
            const clamped = Math.max(minZ, Math.min(maxZ, targetZoom));
            await track.applyConstraints({
              advanced: [{ zoom: clamped } as ExtendedConstraintSet],
            });
            return 'hardware';
          }
        }
      } catch {
        // Fallback smoothly to full uncropped wide sensor FOV
      }
      return 'wide_fov';
    },
    []
  );

  const detectRearLenses = useCallback(async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      return { ultraId: null as string | null, mainId: null as string | null };
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
      let ultraId: string | null = null;
      let mainId: string | null = null;

      for (const dev of videoInputs) {
        const label = (dev.label || '').toLowerCase();
        const isFront = /front|selfie|user|depan/i.test(label);
        if (isFront) continue;

        if (
          !ultraId &&
          /ultra[\s_-]?wide|0\.5|0\.6|wide[\s_-]?angle|camera2\s*2/i.test(label) &&
          !/tele|zoom/i.test(label)
        ) {
          ultraId = dev.deviceId;
        } else if (!mainId && (/back|rear|environment|camera2\s*0/i.test(label) || videoInputs.length > 1)) {
          mainId = dev.deviceId;
        }
      }
      setUltraWideDeviceId(ultraId);
      setMainRearDeviceId(mainId);
      return { ultraId, mainId };
    } catch {
      return { ultraId: null, mainId: null };
    }
  }, []);

  const startCamera = useCallback(
    async (desiredZoom: 0.6 | 1.0 = zoomLevel, preserveFlash = false) => {
      const wasFlashOn = preserveFlash ? flashOn : false;
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

      const { ultraId, mainId } = await detectRearLenses();
      const preferredDeviceId = desiredZoom === 0.6 ? ultraId : mainId;

      const constraintCandidates: MediaStreamConstraints[] = [];
      if (preferredDeviceId) {
        constraintCandidates.push({
          video: {
            deviceId: { exact: preferredDeviceId },
            aspectRatio: { ideal: 4 / 3 },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
      }

      // Request uncropped 4:3 full rear sensor first for wide 0.6x field of view
      constraintCandidates.push(
        {
          video: {
            facingMode: { ideal: 'environment' },
            aspectRatio: { ideal: 4 / 3 },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        },
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
          video: { facingMode: 'environment' },
          audio: false,
        },
        {
          video: true,
          audio: false,
        }
      );

      let acquiredStream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const constraints of constraintCandidates) {
        try {
          acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastErr = err;
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
            'Izin akses kamera ditolak oleh browser. Aktifkan izin kamera pada pengaturan browser, atau gunakan kamera bawaan / galeri.';
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          msg = 'Perangkat kamera tidak ditemukan. Anda tetap dapat mengunggah foto dari galeri atau kamera bawaan.';
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          msg = 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
        }
        setCameraStatus('error');
        setErrorMessage(msg);
        return;
      }

      // Check newly unlocked device labels for dedicated ultra-wide 0.6x lens
      let activeTrack = acquiredStream.getVideoTracks()[0];
      if (desiredZoom === 0.6 && !preferredDeviceId && activeTrack) {
        const postLabels = await detectRearLenses();
        const currentDeviceId = activeTrack.getSettings?.().deviceId;
        const caps =
          typeof activeTrack.getCapabilities === 'function'
            ? (activeTrack.getCapabilities() as ExtendedCapabilities)
            : undefined;
        const hasNativeWideZoom = Boolean(caps?.zoom && caps.zoom.min < 1.0);

        if (!hasNativeWideZoom && postLabels.ultraId && postLabels.ultraId !== currentDeviceId) {
          try {
            const ultraStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: postLabels.ultraId },
                aspectRatio: { ideal: 4 / 3 },
                width: { ideal: 1920 },
                height: { ideal: 1440 },
              },
              audio: false,
            });
            acquiredStream.getTracks().forEach(t => t.stop());
            acquiredStream = ultraStream;
            activeTrack = ultraStream.getVideoTracks()[0];
            setZoomSourceMode('ultrawide_lens');
          } catch {
            // Keep default stream if switching fails
          }
        }
      }

      streamRef.current = acquiredStream;
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = acquiredStream;
        try {
          await videoEl.play();
        } catch {
          // Handled via onLoadedMetadata
        }
      }

      // Apply 0.6x (or 1.0x) hardware zoom capability if available
      if (activeTrack) {
        if (preferredDeviceId && desiredZoom === 0.6) {
          setZoomSourceMode('ultrawide_lens');
        } else {
          const zMode = await applyZoomToTrack(activeTrack, desiredZoom);
          setZoomSourceMode(zMode);
        }

        // Check Torch / Flash capability
        let hasTorch = false;
        if (typeof activeTrack.getCapabilities === 'function') {
          try {
            const caps = activeTrack.getCapabilities() as ExtendedCapabilities;
            hasTorch = Boolean(caps?.torch);
          } catch {
            hasTorch = false;
          }
        }
        setTorchSupported(hasTorch);

        if (wasFlashOn) {
          const appliedLed = hasTorch ? await applyTorchToTrack(activeTrack, true) : false;
          setFlashOn(true);
          setFlashModeLabel(appliedLed ? 'LED' : 'Layar');
        }
      }

      setCameraStatus('ready');
    },
    [applyTorchToTrack, applyZoomToTrack, detectRearLenses, flashOn, stopCameraStream, zoomLevel]
  );

  // Viewport & Orientation Tracker (auto-adapts button layout for smartphone screens)
  useEffect(() => {
    if (!isOpen) return;

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateViewport();

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    const orientationApi = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (orientation: string) => Promise<void>; unlock?: () => void })
      | undefined;
    if (orientationApi && typeof orientationApi.lock === 'function') {
      orientationApi.lock('landscape').catch(() => {
        // Ignore gracefully when unsupported
      });
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      if (orientationApi && typeof orientationApi.unlock === 'function') {
        try {
          orientationApi.unlock();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  // Manage camera lifecycle on open/close (default 0.6x every time opened)
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setZoomLevel(DEFAULT_ZOOM_PRESET);
      startCamera(DEFAULT_ZOOM_PRESET, false);
    } else {
      stopCameraStream();
      setCapturedPreview(null);
    }
    return () => {
      stopCameraStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  const handleToggleFlash = async () => {
    if (capturedPreview) return;
    const nextFlash = !flashOn;
    const track = streamRef.current?.getVideoTracks()[0];

    if (nextFlash) {
      let ledActivated = false;
      if (track) {
        ledActivated = await applyTorchToTrack(track, true);
        if (ledActivated) setTorchSupported(true);
      }
      setFlashOn(true);
      setFlashModeLabel(ledActivated ? 'LED' : 'Layar');
    } else {
      if (track) {
        await applyTorchToTrack(track, false);
      }
      setFlashOn(false);
      setFlashModeLabel('Mati');
    }
  };

  const handleSwitchZoom = async (targetZoom: 0.6 | 1.0) => {
    if (targetZoom === zoomLevel || capturedPreview) return;
    setZoomLevel(targetZoom);

    const track = streamRef.current?.getVideoTracks()[0];
    // If device uses separate physical lenses for 0.6x vs 1.0x, re-acquire stream on that lens
    if ((ultraWideDeviceId && mainRearDeviceId && ultraWideDeviceId !== mainRearDeviceId) || zoomSourceMode === 'ultrawide_lens') {
      await startCamera(targetZoom, true);
      return;
    }

    if (track) {
      const zMode = await applyZoomToTrack(track, targetZoom);
      setZoomSourceMode(zMode);
    }
  };

  // Capture & crop cleanly from live video (supports uncropped wide 0.6x contain & cover projection)
  const handleShutterCapture = () => {
    const video = videoRef.current;
    const guideBox = guideBoxRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsCapturing(true);
    setShutterFlashEffect(true);
    setTimeout(() => setShutterFlashEffect(false), 180);

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const vRect = video.getBoundingClientRect();
      const gRect = guideBox?.getBoundingClientRect();

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      const useContainFraming = zoomLevel === 0.6 && zoomSourceMode === 'wide_fov';

      if (gRect && vRect.width > 0 && vRect.height > 0) {
        const scaleX = vRect.width / vw;
        const scaleY = vRect.height / vh;
        const renderedScale = useContainFraming ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);

        const renderedWidth = vw * renderedScale;
        const renderedHeight = vh * renderedScale;
        const offsetX = (renderedWidth - vRect.width) / 2;
        const offsetY = (renderedHeight - vRect.height) / 2;

        const relLeft = gRect.left - vRect.left;
        const relTop = gRect.top - vRect.top;

        const rawSx = (relLeft + offsetX) / renderedScale;
        const rawSy = (relTop + offsetY) / renderedScale;
        const rawSw = gRect.width / renderedScale;
        const rawSh = gRect.height / renderedScale;

        const clampedSx = Math.max(0, rawSx);
        const clampedSy = Math.max(0, rawSy);
        const clampedEx = Math.min(vw, rawSx + rawSw);
        const clampedEy = Math.min(vh, rawSy + rawSh);
        const validSw = Math.max(1, clampedEx - clampedSx);
        const validSh = Math.max(1, clampedEy - clampedSy);

        const dx = ((clampedSx - rawSx) / rawSw) * TARGET_WIDTH;
        const dy = ((clampedSy - rawSy) / rawSh) * TARGET_HEIGHT;
        const dw = (validSw / rawSw) * TARGET_WIDTH;
        const dh = (validSh / rawSh) * TARGET_HEIGHT;

        ctx.drawImage(video, clampedSx, clampedSy, validSw, validSh, dx, dy, dw, dh);
      } else {
        const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
        const videoRatio = vw / vh;
        const factor = zoomLevel === 0.6 ? 0.94 : 0.8;
        let sw = vw;
        let sh = vh;
        if (videoRatio > targetRatio) {
          sh = vh * factor;
          sw = sh * targetRatio;
        } else {
          sw = vw * factor;
          sh = sw / targetRatio;
        }
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      }

      drawWatermarkOnCanvas(
        ctx,
        TARGET_WIDTH,
        TARGET_HEIGHT,
        locationLabel,
        portionLabel,
        `${zoomLevel.toFixed(1)}x`
      );

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      setCapturedPreview(dataUrl);
      stopCameraStream();
    } finally {
      setIsCapturing(false);
    }
  };

  // Fallback file upload normalized to 16:10 landscape + watermark
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
        drawWatermarkOnCanvas(
          ctx,
          TARGET_WIDTH,
          TARGET_HEIGHT,
          locationLabel,
          portionLabel,
          `${zoomLevel.toFixed(1)}x`
        );

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
    startCamera(zoomLevel, false);
  };

  const handleUsePhoto = () => {
    if (!capturedPreview) return;
    onCapture(capturedPreview);
    stopCameraStream();
    onClose();
  };

  if (!isOpen) return null;

  const isPortraitLayout = layout.isPortrait;
  const useContainFraming = zoomLevel === 0.6 && zoomSourceMode === 'wide_fov';

  // Control buttons extracted to adapt cleanly across Portrait Bottom Dock vs Landscape Right Rail
  const flashButtonLabel = flashOn ? 'Matikan Flash' : 'Hidupkan Flash';
  const flashShortText = flashOn ? `Flash Hidup` : `Flash Mati`;

  const renderFlashControl = (compactMode: boolean) => (
    <button
      type="button"
      disabled={Boolean(capturedPreview)}
      onClick={handleToggleFlash}
      title={
        flashOn
          ? `${flashButtonLabel} (${torchSupported ? 'LED Kamera' : 'Lampu Layar'})`
          : `${flashButtonLabel}`
      }
      aria-pressed={flashOn}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        compactMode ? 'min-w-[54px] px-2 py-1.5' : 'w-full px-2 py-2'
      } ${
        flashOn
          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
          : 'bg-slate-800/95 hover:bg-slate-700 text-white border-white/20'
      }`}
    >
      {flashOn ? (
        <Zap className={layout.isNarrowPhone || layout.isCompactLandscape ? 'w-4 h-4' : 'w-5 h-5'} />
      ) : (
        <ZapOff className={layout.isNarrowPhone || layout.isCompactLandscape ? 'w-4 h-4' : 'w-5 h-5'} />
      )}
      <span className="text-[10px] font-bold leading-tight whitespace-nowrap">{flashShortText}</span>
    </button>
  );

  const renderZoomControl = (compactMode: boolean) => (
    <button
      type="button"
      disabled={Boolean(capturedPreview)}
      onClick={() => handleSwitchZoom(zoomLevel === 0.6 ? 1.0 : 0.6)}
      title="Ganti Sudut Lensa Kamera (0.6x Ultra-Wide / 1.0x Normal)"
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        compactMode ? 'min-w-[48px] px-2 py-1.5' : 'w-full px-2 py-2'
      } ${
        zoomLevel === 0.6
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 hover:bg-emerald-500/30'
          : 'bg-slate-800/95 text-slate-200 border-white/20 hover:bg-slate-700'
      }`}
    >
      <Maximize2 className={layout.isNarrowPhone || layout.isCompactLandscape ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span className="text-[10px] font-extrabold font-mono leading-tight">
        {zoomLevel === 0.6 ? '0.6x' : '1.0x'}
      </span>
    </button>
  );

  const renderShutterControl = () => {
    const shutterSizeClass = layout.isNarrowPhone
      ? 'w-14 h-14'
      : layout.isCompactLandscape
      ? 'w-13 h-13'
      : 'w-16 h-16 sm:w-[68px] sm:h-[68px]';

    if (capturedPreview) {
      return (
        <button
          type="button"
          onClick={handleUsePhoto}
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition cursor-pointer"
          title="Gunakan Foto Ini"
        >
          <Check className="w-7 h-7 stroke-[2.5]" />
        </button>
      );
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={cameraStatus !== 'ready' || isCapturing}
          onClick={handleShutterCapture}
          title="Ambil Foto Ompreng"
          className={`${shutterSizeClass} rounded-full border-4 border-white p-1 flex items-center justify-center bg-transparent hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        >
          <span className="w-full h-full rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-inner">
            <Camera className={layout.isNarrowPhone || layout.isCompactLandscape ? 'w-5 h-5 text-slate-950' : 'w-6 h-6 text-slate-950'} />
          </span>
        </button>
        {!layout.isCompactLandscape && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Jepret
          </span>
        )}
      </div>
    );
  };

  const renderGalleryButton = (compactMode: boolean) => (
    <button
      type="button"
      onClick={() => galleryInputRef.current?.click()}
      title="Unggah / Pilih dari Galeri"
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-white/15 text-slate-200 hover:text-white transition cursor-pointer ${
        compactMode ? 'min-w-[46px] px-2 py-1.5' : 'w-full px-2 py-1.5'
      }`}
    >
      <ImageIcon className={layout.isNarrowPhone || layout.isCompactLandscape ? 'w-4 h-4' : 'w-4 h-4'} />
      <span className="text-[10px] font-semibold leading-tight">Galeri</span>
    </button>
  );

  const renderCloseButton = (compactMode: boolean) => (
    <button
      type="button"
      onClick={onClose}
      title="Tutup Kamera"
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-800/95 hover:bg-rose-950/80 border border-white/15 text-slate-200 hover:text-rose-300 transition cursor-pointer ${
        compactMode ? 'min-w-[46px] px-2 py-1.5' : 'w-full px-2 py-1.5'
      }`}
    >
      <X className={layout.isNarrowPhone || layout.isCompactLandscape ? 'w-4 h-4' : 'w-4 h-4'} />
      <span className="text-[10px] font-semibold leading-tight">Tutup</span>
    </button>
  );

  return (
    <div
      className={`fixed inset-0 z-[80] bg-black text-white flex ${
        isPortraitLayout ? 'flex-col' : 'flex-row'
      } overflow-hidden select-none`}
    >
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

      {/* Screen Fill-Light Flash Assist when hardware torch unavailable & Flash ON */}
      {flashOn && !torchSupported && !capturedPreview && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-[12px] sm:border-[18px] border-white/90 shadow-[inset_0_0_90px_rgba(255,255,255,0.65)]"
        />
      )}

      {/* MAIN VIEWPORT: LIVE CAMERA OR CROP PREVIEW */}
      <div className="relative flex-1 min-w-0 min-h-0 bg-slate-950 flex items-center justify-center overflow-hidden">
        {capturedPreview ? (
          /* ============================================================= */
          /* PRATINJAU HASIL CROP LANDSCAPE 16:10                           */
          /* ============================================================= */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-950 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Pratinjau Ompreng ({zoomLevel.toFixed(1)}x) • {portionLabel}
              </span>
            </div>

            <div className="relative w-full max-w-4xl max-h-[64vh] aspect-[16/10] rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-2xl bg-black">
              <img
                src={capturedPreview}
                alt={`Hasil Foto Ompreng ${portionLabel}`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full max-w-md px-2">
              <button
                type="button"
                onClick={handleRetake}
                className="min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Foto Ulang</span>
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="min-h-[42px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Foto Ini</span>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================= */
          /* LIVE VIEWFINDER (0.6x ULTRA-WIDE) + 16:10 TRAY GUIDE OVERLAY   */
          /* ============================================================= */
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setCameraStatus('ready')}
              className={`w-full h-full ${
                useContainFraming ? 'object-contain' : 'object-cover'
              } ${cameraStatus === 'error' ? 'hidden' : 'block'}`}
            />

            {/* Shutter Flash Feedback */}
            {shutterFlashEffect && <div className="absolute inset-0 bg-white/80 pointer-events-none z-30" />}

            {/* SVG Stencil Dark Surround + Cutout + 5-Compartment Ompreng Guidelines */}
            {cameraStatus !== 'error' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  ref={guideBoxRef}
                  className={`relative aspect-[16/10] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] ${
                    isPortraitLayout
                      ? zoomLevel === 0.6
                        ? 'w-[92%] max-w-[780px]'
                        : 'w-[84%] max-w-[720px]'
                      : zoomLevel === 0.6
                      ? 'w-[84%] max-w-[820px] max-h-[80%]'
                      : 'w-[72%] max-w-[740px] max-h-[72%]'
                  }`}
                >
                  <svg
                    viewBox="0 0 800 500"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                    aria-hidden="true"
                  >
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

                    {/* Horizontal divider separating Top 3 & Bottom 2 compartments */}
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

                    {/* Top 3 Compartments */}
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

                    {/* Bottom 2 Compartments */}
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

                    {/* Compartment Labels */}
                    <g fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" textAnchor="middle">
                      <text x="142" y="112" fill="rgba(255,255,255,0.78)">Lauk Utama</text>
                      <text x="403" y="112" fill="rgba(255,255,255,0.78)">Buah</text>
                      <text x="660" y="112" fill="rgba(255,255,255,0.78)">Susu / Ekstra</text>
                      <text x="207" y="352" fill="rgba(255,255,255,0.85)">Nasi / Pokok</text>
                      <text x="593" y="352" fill="rgba(255,255,255,0.85)">Sayur</text>
                    </g>

                    {/* 4 Corner Brackets */}
                    <g stroke="#34D399" strokeWidth="6" strokeLinecap="round" fill="none">
                      <path d="M 0 38 L 0 12 Q 0 0 12 0 L 38 0" />
                      <path d="M 762 0 L 788 0 Q 800 0 800 12 L 800 38" />
                      <path d="M 0 462 L 0 488 Q 0 500 12 500 L 38 500" />
                      <path d="M 762 500 L 788 500 Q 800 500 800 488 L 800 462" />
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* Top Adaptive HUD */}
            <div className="absolute top-2.5 inset-x-2.5 flex flex-col items-center gap-1.5 pointer-events-none z-20">
              <div className="max-w-full inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-emerald-400/50 shadow-lg text-center">
                <span className="text-[11px] font-black uppercase tracking-wide text-emerald-400 shrink-0">
                  {portionLabel}
                </span>
                <span className="text-slate-500 text-[10px]">|</span>
                <span className="font-mono text-[11px] font-bold text-sky-300 shrink-0">
                  {zoomLevel.toFixed(1)}x Wide
                </span>
                {flashOn && (
                  <>
                    <span className="text-slate-500 text-[10px]">|</span>
                    <span className="text-[11px] font-bold text-amber-300 shrink-0">
                      Flash {flashModeLabel}
                    </span>
                  </>
                )}
                {!layout.isNarrowPhone && (
                  <>
                    <span className="text-slate-500 text-[10px]">|</span>
                    <span className="text-[11px] font-medium text-slate-200 truncate max-w-[240px] sm:max-w-none">
                      Posisikan ompreng di dalam garis panduan
                    </span>
                  </>
                )}
              </div>

              {isPortraitLayout && cameraStatus !== 'error' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 text-[10px] font-bold shadow-md">
                  <Smartphone className="w-3 h-3 rotate-90 shrink-0" />
                  <span>Miringkan HP ke Landscape untuk hasil lebih maksimal</span>
                </div>
              )}
            </div>

            {/* Bottom-Left Watermark Info Preview (Hidden on ultra-compact phones to avoid clutter) */}
            {cameraStatus === 'ready' && !layout.isNarrowPhone && (
              <div className="absolute bottom-2.5 left-3 pointer-events-none z-20 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs border border-white/15 text-[10px] text-slate-200 font-mono">
                {locationLabel} • {portionLabel} • {zoomLevel.toFixed(1)}x
              </div>
            )}

            {/* Loading State */}
            {cameraStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 gap-3 p-4 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                <p className="text-xs sm:text-sm font-semibold text-slate-200">
                  Mengaktifkan Kamera {zoomLevel.toFixed(1)}x Wide (Mode {isPortraitLayout ? 'Responsif' : 'Landscape'})...
                </p>
              </div>
            )}

            {/* Error / Permission Blocked Fallback State */}
            {cameraStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 p-5 text-center max-w-md mx-auto gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    Akses Kamera Langsung Tidak Tersedia
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => startCamera(zoomLevel, false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Coba Kamera Lagi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackCameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-lg cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Buka Kamera Bawaan HP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer"
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

      {/* ADAPTIVE CONTROL BAR: BOTTOM BAR FOR PORTRAIT SMARTPHONE vs RIGHT RAIL FOR LANDSCAPE/DESKTOP */}
      {isPortraitLayout ? (
        <div className="w-full shrink-0 bg-slate-950/95 border-t border-white/15 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-30">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
            {/* Left Cluster: Flash ON/OFF + Zoom 0.6x/1x */}
            <div className="flex items-center gap-1.5">
              {renderFlashControl(true)}
              {renderZoomControl(true)}
            </div>

            {/* Center: Shutter */}
            <div className="shrink-0">{renderShutterControl()}</div>

            {/* Right Cluster: Galeri + Tutup */}
            <div className="flex items-center gap-1.5">
              {!capturedPreview && renderGalleryButton(true)}
              {renderCloseButton(true)}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`shrink-0 h-full bg-slate-950/95 border-l border-white/15 flex flex-col items-center justify-between z-30 overflow-y-auto no-scrollbar ${
            layout.isCompactLandscape ? 'w-[86px] py-2 px-1.5 gap-1.5' : 'w-24 sm:w-28 py-4 px-2.5 gap-2'
          }`}
        >
          {/* Top Cluster: Flash ON/OFF + 0.6x Lens Toggle */}
          <div className="w-full flex flex-col items-center gap-1.5">
            {renderFlashControl(false)}
            {renderZoomControl(false)}
          </div>

          {/* Center: Big Shutter Button */}
          <div className="flex flex-col items-center justify-center shrink-0">
            {renderShutterControl()}
          </div>

          {/* Bottom Cluster: Galeri & Tutup */}
          <div className="w-full flex flex-col items-center gap-1.5">
            {!capturedPreview && renderGalleryButton(false)}
            {renderCloseButton(false)}
          </div>
        </div>
      )}
    </div>
  );
};
