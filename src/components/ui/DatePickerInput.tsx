"use client";

import { Icons } from "@/components/ui/icons";
import { formatNumericDate } from "@/lib/dateUtils";

interface DatePickerInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  showManualInput?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  className = "",
  placeholder = "DD/MM/YYYY",
  required,
  id,
  name,
  disabled,
  showManualInput = true,
}: DatePickerInputProps) {
  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(value || "");
  const displayFormatted = value
    ? isIsoDate
      ? formatNumericDate(value)
      : value
    : placeholder;

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {/* 1. Date Picker Row */}
      <div className="relative inline-flex items-center w-full">
        <div className="flex items-center justify-between w-full pointer-events-none px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs text-sm min-h-[44px]">
          <span
            className={
              value
                ? "font-semibold text-slate-800 dark:text-slate-100 truncate"
                : "text-slate-400 truncate text-xs sm:text-sm"
            }
          >
            {displayFormatted}
          </span>
          <Icons.calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
        </div>
        <input
          type="date"
          id={id}
          name={name}
          required={required && !value}
          disabled={disabled}
          value={isIsoDate ? value : ""}
          onChange={onChange}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-10 touch-manipulation"
          style={{ WebkitTapHighlightColor: "transparent" }}
        />
      </div>

      {/* 2. Manual Text Input Row */}
      {showManualInput && (
        <input
          type="text"
          disabled={disabled}
          value={value || ""}
          onChange={onChange}
          placeholder="Atau isi tanggal manual (bebas)..."
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400 shadow-2xs"
        />
      )}
    </div>
  );
}
