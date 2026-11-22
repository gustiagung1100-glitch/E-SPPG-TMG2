import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Clock, Check, RotateCcw } from 'lucide-react';

export type ClassicTimeFormat = 'HH:mm' | 'HH:mm WIB' | 'HH.mm WIB';

export interface ClassicTimeInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  format?: ClassicTimeFormat;
  mode?: 'single' | 'range';
  rangeSeparator?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  clearValue?: string;
  compact?: boolean;
  className?: string;
  title?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

const ITEM_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS; // 180px
const SPACER_HEIGHT = ITEM_HEIGHT * 2; // 72px

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad2 = (n: number) => String(Math.max(0, Math.min(59, Math.floor(n)))).padStart(2, '0');

function parseSingleTimeParts(
  raw: string,
  fallbackHour = 8,
  fallbackMinute = 0
): { hour: number; minute: number; valid: boolean } {
  const cleaned = (raw || '').trim();
  const match = cleaned.match(/(\d{1,2})[:.](\d{1,2})/);
  if (!match) {
    return { hour: fallbackHour, minute: fallbackMinute, valid: false };
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return { hour: fallbackHour, minute: fallbackMinute, valid: false };
  }
  return { hour: h, minute: m, valid: true };
}

function parseRangeTimeParts(raw: string): {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
} {
  const cleaned = (raw || '').trim();
  const matches = [...cleaned.matchAll(/(\d{1,2})[:.](\d{1,2})/g)];
  if (matches.length >= 2) {
    const sh = Math.min(23, Math.max(0, Number(matches[0][1]) || 6));
    const sm = Math.min(59, Math.max(0, Number(matches[0][2]) || 0));
    const eh = Math.min(23, Math.max(0, Number(matches[1][1]) || 14));
    const em = Math.min(59, Math.max(0, Number(matches[1][2]) || 0));
    return { startHour: sh, startMinute: sm, endHour: eh, endMinute: em };
  }
  if (matches.length === 1) {
    const sh = Math.min(23, Math.max(0, Number(matches[0][1]) || 8));
    const sm = Math.min(59, Math.max(0, Number(matches[0][2]) || 0));
    const eh = Math.min(23, sh + 4);
    return { startHour: sh, startMinute: sm, endHour: eh, endMinute: sm };
  }
  return { startHour: 6, startMinute: 0, endHour: 14, endMinute: 0 };
}

function formatTimeFromParts(hour: number, minute: number, format: ClassicTimeFormat): string {
  const hh = pad2(hour);
  const mm = pad2(minute);
  if (format === 'HH.mm WIB') return `${hh}.${mm} WIB`;
  if (format === 'HH:mm WIB') return `${hh}:${mm} WIB`;
  return `${hh}:${mm}`;
}

function formatRangeFromParts(
  sh: number,
  sm: number,
  eh: number,
  em: number,
  format: ClassicTimeFormat,
  separator = '–'
): string {
  const useDot = format === 'HH.mm WIB';
  const sepChar = useDot ? '.' : ':';
  const startStr = `${pad2(sh)}${sepChar}${pad2(sm)}`;
  const endStr = `${pad2(eh)}${sepChar}${pad2(em)}`;
  const suffix = format.includes('WIB') ? ' WIB' : '';
  return `${startStr}${separator}${endStr}${suffix}`;
}

export const ClassicTimeInput: React.FC<ClassicTimeInputProps> = ({
  value,
  onChange,
  format = 'HH:mm WIB',
  mode = 'single',
  rangeSeparator = '–',
  placeholder,
  required = false,
  disabled = false,
  allowClear = false,
  clearValue = '',
  compact = false,
  className = '',
  title,
  id,
  name,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRangePart, setActiveRangePart] = useState<'start' | 'end'>('start');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 300,
  });

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hourWheelRef = useRef<HTMLDivElement | null>(null);
  const minuteWheelRef = useRef<HTMLDivElement | null>(null);
  const suppressNextFocusOpenRef = useRef<boolean>(false);
  const hourScrollLockUntilRef = useRef<number>(0);
  const minuteScrollLockUntilRef = useRef<number>(0);

  const parsedSingle = useMemo(() => {
    const now = new Date();
    return parseSingleTimeParts(value, now.getHours(), Math.floor(now.getMinutes() / 5) * 5);
  }, [value]);

  const parsedRange = useMemo(() => parseRangeTimeParts(value), [value]);

  const [selectedHour, setSelectedHour] = useState<number>(
    mode === 'range'
      ? activeRangePart === 'start'
        ? parsedRange.startHour
        : parsedRange.endHour
      : parsedSingle.hour
  );
  const [selectedMinute, setSelectedMinute] = useState<number>(
    mode === 'range'
      ? activeRangePart === 'start'
        ? parsedRange.startMinute
        : parsedRange.endMinute
      : parsedSingle.minute
  );

  const scrollWheelToIndex = (
    el: HTMLDivElement | null,
    index: number,
    smooth: boolean,
    lockRef: React.MutableRefObject<number>
  ) => {
    if (!el) return;
    lockRef.current = Date.now() + (smooth ? 340 : 80);
    el.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Update floating panel coordinates so it never clips off-screen
  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const vvLeft = vv ? vv.offsetLeft : 0;
    const vvTop = vv ? vv.offsetTop : 0;
    const vvWidth = vv ? vv.width : window.innerWidth;
    const vvHeight = vv ? vv.height : window.innerHeight;
    const margin = vvWidth < 480 ? 8 : 12;

    const panelWidth = Math.min(312, Math.max(256, vvWidth - margin * 2));
    const estimatedHeight = mode === 'range' ? 364 : 320;
    const panelHeight = Math.min(estimatedHeight, Math.max(240, vvHeight - margin * 2));

    // Pada layar smartphone sempit (< 520px), pusatkan horizontal otomatis agar pas di layar
    let left = vvWidth < 520 ? vvLeft + (vvWidth - panelWidth) / 2 : rect.left;
    if (left + panelWidth > vvLeft + vvWidth - margin) {
      left = Math.max(vvLeft + margin, vvLeft + vvWidth - panelWidth - margin);
    }
    if (left < vvLeft + margin) left = vvLeft + margin;

    const spaceBelow = vvTop + vvHeight - rect.bottom;
    const spaceAbove = rect.top - vvTop;
    let top = rect.bottom + 6;
    if (vvHeight < estimatedHeight + 24) {
      // Layar sangat pendek (mis. HP landscape): tampilkan terpusat vertikal di viewport
      top = vvTop + Math.max(margin, (vvHeight - panelHeight) / 2);
    } else if (spaceBelow < panelHeight + 10 && spaceAbove > spaceBelow) {
      top = Math.max(vvTop + margin, rect.top - panelHeight - 6);
    } else if (top + panelHeight > vvTop + vvHeight - margin) {
      top = Math.max(vvTop + margin, vvTop + vvHeight - panelHeight - margin);
    }

    setCoords({ top: Math.round(top), left: Math.round(left), width: Math.round(panelWidth) });
  };

  const openPicker = () => {
    if (disabled) return;
    const now = new Date();
    let initH = now.getHours();
    let initM = now.getMinutes();

    if (mode === 'range') {
      const r = parseRangeTimeParts(value);
      if (activeRangePart === 'start') {
        initH = r.startHour;
        initM = r.startMinute;
      } else {
        initH = r.endHour;
        initM = r.endMinute;
      }
    } else {
      const s = parseSingleTimeParts(value, now.getHours(), now.getMinutes());
      initH = s.hour;
      initM = s.minute;
    }

    setSelectedHour(initH);
    setSelectedMinute(initM);
    updatePosition();
    setIsOpen(true);
  };

  // Align wheels cleanly when opening or switching Start/End tab in range mode
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      scrollWheelToIndex(hourWheelRef.current, selectedHour, false, hourScrollLockUntilRef);
      scrollWheelToIndex(minuteWheelRef.current, selectedMinute, false, minuteScrollLockUntilRef);
    });
    return () => cancelAnimationFrame(raf);
    // Intentionally sync scroll only when opening or switching Start/End tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeRangePart]);

  // Reposition on window resize/scroll & close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowChange = () => updatePosition();
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const vv = window.visualViewport;
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('orientationchange', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    vv?.addEventListener('resize', handleWindowChange);
    vv?.addEventListener('scroll', handleWindowChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('orientationchange', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      vv?.removeEventListener('resize', handleWindowChange);
      vv?.removeEventListener('scroll', handleWindowChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  const emitTimeChange = (nextH: number, nextM: number, rangeTarget: 'start' | 'end' = activeRangePart) => {
    const safeH = ((nextH % 24) + 24) % 24;
    const safeM = ((nextM % 60) + 60) % 60;
    setSelectedHour(safeH);
    setSelectedMinute(safeM);

    if (mode === 'range') {
      const r = parseRangeTimeParts(value);
      const nextStartH = rangeTarget === 'start' ? safeH : r.startHour;
      const nextStartM = rangeTarget === 'start' ? safeM : r.startMinute;
      const nextEndH = rangeTarget === 'end' ? safeH : r.endHour;
      const nextEndM = rangeTarget === 'end' ? safeM : r.endMinute;
      onChange(formatRangeFromParts(nextStartH, nextStartM, nextEndH, nextEndM, format, rangeSeparator));
    } else {
      onChange(formatTimeFromParts(safeH, safeM, format));
    }
  };

  const handleSelectHour = (h: number, smooth = true) => {
    const wrapped = ((h % 24) + 24) % 24;
    emitTimeChange(wrapped, selectedMinute);
    scrollWheelToIndex(hourWheelRef.current, wrapped, smooth, hourScrollLockUntilRef);
  };

  const handleSelectMinute = (m: number, smooth = true) => {
    const wrapped = ((m % 60) + 60) % 60;
    emitTimeChange(selectedHour, wrapped);
    scrollWheelToIndex(minuteWheelRef.current, wrapped, smooth, minuteScrollLockUntilRef);
  };

  const handleHourScroll = () => {
    const el = hourWheelRef.current;
    if (!el || Date.now() < hourScrollLockUntilRef.current) return;
    const idx = Math.max(0, Math.min(23, Math.round(el.scrollTop / ITEM_HEIGHT)));
    if (idx !== selectedHour) {
      emitTimeChange(idx, selectedMinute);
    }
  };

  const handleMinuteScroll = () => {
    const el = minuteWheelRef.current;
    if (!el || Date.now() < minuteScrollLockUntilRef.current) return;
    const idx = Math.max(0, Math.min(59, Math.round(el.scrollTop / ITEM_HEIGHT)));
    if (idx !== selectedMinute) {
      emitTimeChange(selectedHour, idx);
    }
  };

  const handleSwitchRangeTab = (tab: 'start' | 'end') => {
    setActiveRangePart(tab);
    const r = parseRangeTimeParts(value);
    if (tab === 'start') {
      setSelectedHour(r.startHour);
      setSelectedMinute(r.startMinute);
    } else {
      setSelectedHour(r.endHour);
      setSelectedMinute(r.endMinute);
    }
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    emitTimeChange(h, m);
    scrollWheelToIndex(hourWheelRef.current, h, true, hourScrollLockUntilRef);
    scrollWheelToIndex(minuteWheelRef.current, m, true, minuteScrollLockUntilRef);
  };

  const handleClose = () => {
    suppressNextFocusOpenRef.current = true;
    setIsOpen(false);
    setTimeout(() => {
      suppressNextFocusOpenRef.current = false;
    }, 150);
  };

  const inputBasePadding = compact ? 'pl-2 pr-6 py-1 text-[11px]' : 'pl-3 pr-8 py-2 text-xs';
  const defaultClasses = `w-full border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono ${inputBasePadding} focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 dark:focus:ring-sky-500/40`;
  const resolvedInputClasses = className
    ? `${className} ${compact ? 'pr-6' : 'pr-8'} font-mono cursor-pointer`
    : `${defaultClasses} cursor-pointer`;

  const displayPreview =
    mode === 'range'
      ? formatRangeFromParts(
          activeRangePart === 'start' ? selectedHour : parsedRange.startHour,
          activeRangePart === 'start' ? selectedMinute : parsedRange.startMinute,
          activeRangePart === 'end' ? selectedHour : parsedRange.endHour,
          activeRangePart === 'end' ? selectedMinute : parsedRange.endMinute,
          format,
          rangeSeparator
        )
      : formatTimeFromParts(selectedHour, selectedMinute, format);

  const portalContent =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Pemilih Waktu Classic Dual Wheel"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: 'calc(100dvh - 16px)',
              zIndex: 9999,
            }}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-y-auto overflow-x-hidden select-none"
          >
            {/* Header Readout */}
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E3A8A] dark:text-sky-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Classic Dual Wheel
                </span>
              </div>
              <div className="font-mono tabular-nums text-xs font-extrabold text-[#1E3A8A] dark:text-sky-300">
                {displayPreview}
              </div>
            </div>

            {/* Start / End Switch for Range Mode */}
            {mode === 'range' && (
              <div className="px-3 pt-2.5 pb-1 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSwitchRangeTab('start')}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition cursor-pointer font-mono tabular-nums ${
                      activeRangePart === 'start'
                        ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-sky-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Mulai: {pad2(parsedRange.startHour)}:{pad2(parsedRange.startMinute)}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchRangeTab('end')}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition cursor-pointer font-mono tabular-nums ${
                      activeRangePart === 'end'
                        ? 'bg-white dark:bg-slate-900 text-[#0D9488] dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Selesai: {pad2(parsedRange.endHour)}:{pad2(parsedRange.endMinute)}
                  </button>
                </div>
              </div>
            )}

            {/* Column Labels */}
            <div className="grid grid-cols-[1fr_20px_1fr] items-center px-4 pt-2.5 pb-1 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Jam (00–23)
              </span>
              <span aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Menit (00–59)
              </span>
            </div>

            {/* Dual Scroll Wheels */}
            <div className="px-4 py-1">
              <div className="relative grid grid-cols-[1fr_20px_1fr] items-center rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                {/* Center Selection Highlight Band */}
                <div
                  aria-hidden="true"
                  style={{ height: `${ITEM_HEIGHT}px`, top: `${SPACER_HEIGHT}px` }}
                  className="pointer-events-none absolute inset-x-2 rounded-lg bg-[#1E3A8A]/10 dark:bg-sky-500/15 border-y border-[#1E3A8A]/30 dark:border-sky-400/35 z-10"
                />
                {/* Top/Bottom Cylindrical Drum Gradient Masks */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/95 via-white/60 to-transparent dark:from-slate-900/95 dark:via-slate-900/60 z-10"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white/95 via-white/60 to-transparent dark:from-slate-900/95 dark:via-slate-900/60 z-10"
                />

                {/* Left Wheel: HOURS */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Kurangi 1 jam"
                    onClick={() => handleSelectHour(selectedHour - 1)}
                    className="relative z-20 w-full py-1 flex items-center justify-center text-slate-400 hover:text-[#1E3A8A] dark:hover:text-sky-400 transition cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <div
                    ref={hourWheelRef}
                    onScroll={handleHourScroll}
                    style={{
                      height: `${WHEEL_HEIGHT}px`,
                      scrollSnapType: 'y mandatory',
                    }}
                    className="w-full overflow-y-auto no-scrollbar overscroll-contain"
                  >
                    <div style={{ height: `${SPACER_HEIGHT}px` }} />
                    {HOURS.map(h => {
                      const active = h === selectedHour;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleSelectHour(h)}
                          style={{ height: `${ITEM_HEIGHT}px`, scrollSnapAlign: 'center' }}
                          className={`w-full flex items-center justify-center font-mono tabular-nums transition-colors cursor-pointer ${
                            active
                              ? 'text-lg font-extrabold text-[#1E3A8A] dark:text-sky-300'
                              : 'text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {pad2(h)}
                        </button>
                      );
                    })}
                    <div style={{ height: `${SPACER_HEIGHT}px` }} />
                  </div>
                  <button
                    type="button"
                    aria-label="Tambah 1 jam"
                    onClick={() => handleSelectHour(selectedHour + 1)}
                    className="relative z-20 w-full py-1 flex items-center justify-center text-slate-400 hover:text-[#1E3A8A] dark:hover:text-sky-400 transition cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Center Divider Colon */}
                <div className="relative z-20 flex items-center justify-center font-mono text-lg font-black text-[#1E3A8A] dark:text-sky-300">
                  :
                </div>

                {/* Right Wheel: MINUTES */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Kurangi 1 menit"
                    onClick={() => handleSelectMinute(selectedMinute - 1)}
                    className="relative z-20 w-full py-1 flex items-center justify-center text-slate-400 hover:text-[#0D9488] dark:hover:text-teal-400 transition cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <div
                    ref={minuteWheelRef}
                    onScroll={handleMinuteScroll}
                    style={{
                      height: `${WHEEL_HEIGHT}px`,
                      scrollSnapType: 'y mandatory',
                    }}
                    className="w-full overflow-y-auto no-scrollbar overscroll-contain"
                  >
                    <div style={{ height: `${SPACER_HEIGHT}px` }} />
                    {MINUTES.map(m => {
                      const active = m === selectedMinute;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          style={{ height: `${ITEM_HEIGHT}px`, scrollSnapAlign: 'center' }}
                          className={`w-full flex items-center justify-center font-mono tabular-nums transition-colors cursor-pointer ${
                            active
                              ? 'text-lg font-extrabold text-[#0D9488] dark:text-teal-300'
                              : 'text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {pad2(m)}
                        </button>
                      );
                    })}
                    <div style={{ height: `${SPACER_HEIGHT}px` }} />
                  </div>
                  <button
                    type="button"
                    aria-label="Tambah 1 menit"
                    onClick={() => handleSelectMinute(selectedMinute + 1)}
                    className="relative z-20 w-full py-1 flex items-center justify-center text-slate-400 hover:text-[#0D9488] dark:hover:text-teal-400 transition cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Controls */}
            <div className="px-3.5 py-2.5 mt-1 bg-slate-50/90 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetNow}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  Sekarang
                </button>
                {allowClear && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(clearValue);
                      handleClose();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Kosong</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!value || value.trim() === '' || value === clearValue) {
                    emitTimeChange(selectedHour, selectedMinute);
                  }
                  handleClose();
                }}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#1E3A8A] hover:bg-blue-900 dark:bg-sky-600 dark:hover:bg-sky-500 text-white shadow-sm transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Selesai</span>
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} className="relative w-full">
      <input
        id={id}
        name={name}
        aria-label={ariaLabel}
        type="text"
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        title={title || 'Klik untuk membuka pemilih waktu Classic Dual Wheel'}
        onClick={() => {
          if (!isOpen) openPicker();
        }}
        onFocus={() => {
          if (!isOpen && !suppressNextFocusOpenRef.current) {
            openPicker();
          }
        }}
        onChange={e => onChange(e.target.value)}
        className={resolvedInputClasses}
      />
      <button
        type="button"
        disabled={disabled}
        tabIndex={-1}
        aria-label="Buka pemilih waktu Classic Dual Wheel"
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            openPicker();
          }
        }}
        className={`absolute inset-y-0 right-0 flex items-center ${
          compact ? 'pr-1.5' : 'pr-2.5'
        } text-slate-400 hover:text-[#1E3A8A] dark:hover:text-sky-400 cursor-pointer`}
      >
        <Clock className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>
      {portalContent}
    </div>
  );
};
