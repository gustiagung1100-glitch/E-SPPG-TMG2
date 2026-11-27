import React, { useState } from 'react';

export interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'min' | 'max'
  > {
  value: number | string | null | undefined;
  onValueChange?: (next: number) => void;
  onOptionalValueChange?: (next: number | undefined) => void;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  emptyFallback?: number;
}

/**
 * Safe numeric input that allows clearing to "" while typing without snapping
 * to 0 or leaking NaN into React state/formulas.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onValueChange,
  onOptionalValueChange,
  min,
  max,
  allowEmpty = false,
  emptyFallback,
  onFocus,
  onBlur,
  onKeyDown,
  disabled,
  readOnly,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const formatDisplay = (v: number | string | null | undefined): string => {
    if (v === '' || v === null || v === undefined) return '';
    const num = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'));
    return Number.isFinite(num) ? String(num) : '';
  };

  const clampFinal = (num: number): number => {
    let out = num;
    if (typeof min === 'number') out = Math.max(min, out);
    if (typeof max === 'number') out = Math.min(max, out);
    return out;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDraft(formatDisplay(value));
    onFocus?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);

    const cleaned = raw.trim().replace(',', '.');
    if (cleaned === '') {
      if (allowEmpty) {
        onOptionalValueChange?.(undefined);
        if (onValueChange && emptyFallback !== undefined) {
          onValueChange(emptyFallback);
        }
      } else {
        const fb = emptyFallback !== undefined ? emptyFallback : typeof min === 'number' && min <= 0 ? 0 : 0;
        onValueChange?.(fb);
        onOptionalValueChange?.(fb);
      }
      return;
    }

    // Allow partial negative sign or trailing decimal point while typing
    if (cleaned === '-' || cleaned === '.' || cleaned === '-.') {
      return;
    }

    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return;

    // During live typing, prevent negative values if min >= 0 and cap at max if defined
    let liveVal = parsed;
    if (typeof min === 'number' && min >= 0 && liveVal < 0) {
      liveVal = 0;
    }
    if (typeof max === 'number' && liveVal > max) {
      liveVal = max;
    }
    onValueChange?.(liveVal);
    onOptionalValueChange?.(liveVal);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const cleaned = draft.trim().replace(',', '.');
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
      if (allowEmpty) {
        onOptionalValueChange?.(undefined);
        if (onValueChange && emptyFallback !== undefined) {
          onValueChange(emptyFallback);
        }
      } else {
        const fb =
          emptyFallback !== undefined
            ? clampFinal(emptyFallback)
            : typeof min === 'number'
            ? min
            : 0;
        onValueChange?.(fb);
        onOptionalValueChange?.(fb);
      }
      onBlur?.(e);
      return;
    }

    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      const finalVal = clampFinal(parsed);
      onValueChange?.(finalVal);
      onOptionalValueChange?.(finalVal);
    }
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={typeof min === 'number' && min >= 0 ? 'decimal' : 'text'}
      disabled={disabled}
      readOnly={readOnly}
      value={isFocused && !disabled && !readOnly ? draft : formatDisplay(value)}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          setIsFocused(false);
          setDraft(formatDisplay(value));
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
};
