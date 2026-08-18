"use client";

import { useEffect, useState } from "react";
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

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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

  // Custom calendar popover state
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Saat dibuka, arahkan tampilan ke bulan dari value (atau hari ini)
  useEffect(() => {
    if (isOpen) {
      const base = isIsoDate ? new Date(`${value}T00:00:00`) : new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const emitChange = (iso: string) => {
    // Pertahankan kontrak onChange(e.target.value) agar logika pemakai tidak berubah
    onChange({
      target: { value: iso },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const pickDay = (day: number) => {
    emitChange(toIso(viewYear, viewMonth, day));
    setIsOpen(false);
  };

  const navMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {/* 1. Date Picker Row (trigger kalender custom) */}
      <div className="relative w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs text-sm min-h-11 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
            isOpen
              ? "border-brand-500 ring-2 ring-brand-500/30"
              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
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
        </button>

        {/* Hidden native input — hanya untuk semantik form (required/name/id) */}
        <input
          type="date"
          id={id}
          name={name}
          required={required && !value}
          disabled={disabled}
          value={isIsoDate ? value : ""}
          onChange={onChange}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute opacity-0 pointer-events-none w-px h-px"
        />

        {/* Calendar Popover */}
        {isOpen && (
          <>
            {/* Invisible Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-xs"
              onClick={() => setIsOpen(false)}
            />

            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => navMonth(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span className="text-sm font-bold text-slate-900 dark:text-white select-none">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={() => navMonth(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase text-center py-1"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDow }).map((_, i) => (
                  <span key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const iso = toIso(viewYear, viewMonth, day);
                  const isSelected = isIsoDate && value === iso;
                  const isToday = iso === todayIso;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => pickDay(day)}
                      className={`h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                          : isToday
                            ? "text-brand-600 dark:text-brand-400 ring-1 ring-inset ring-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    emitChange("");
                    setIsOpen(false);
                  }}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors cursor-pointer px-1"
                >
                  Bersihkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitChange(todayIso);
                    setIsOpen(false);
                  }}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer px-1"
                >
                  Hari Ini
                </button>
              </div>
            </div>
          </>
        )}
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
