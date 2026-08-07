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
}: DatePickerInputProps) {
  const displayFormatted = value ? formatNumericDate(value) : placeholder;

  return (
    <div className={`relative inline-flex items-center w-full ${className}`}>
      <div className="flex items-center justify-between w-full pointer-events-none px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm text-sm min-h-[44px]">
        <span className={value ? "font-semibold text-slate-800 dark:text-slate-100" : "text-slate-400"}>
          {displayFormatted}
        </span>
        <Icons.calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
      </div>
      <input
        type="date"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        value={value}
        onChange={onChange}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-10 touch-manipulation"
        style={{ WebkitTapHighlightColor: "transparent" }}
      />
    </div>
  );
}
