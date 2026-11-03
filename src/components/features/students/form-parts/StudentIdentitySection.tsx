"use client";

// Dipisahkan dari StudentRegistrationForm.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch } from "react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

export interface StudentIdentitySectionProps {
  calculatedAge: string;
  dob: any;
  gender: any;
  name: any;
  nickname: any;
  setDob: Dispatch<any>;
  setGender: Dispatch<any>;
  setName: Dispatch<any>;
  setNickname: Dispatch<any>;
}

export function StudentIdentitySection({
  calculatedAge,
  dob,
  gender,
  name,
  nickname,
  setDob,
  setGender,
  setName,
  setNickname,
}: StudentIdentitySectionProps) {
  return (
    <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4 shadow-sm bg-white dark:bg-slate-900/20">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Identitas Anak
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nama Lengkap */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Nama Lengkap Anak
          </label>
          <input
            type="text"
            id="name"
            autoComplete="off"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            placeholder="Contoh: Rafi Rachmawan"
          />
        </div>

        {/* Nama Panggilan */}
        <div>
          <label
            htmlFor="nickname"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Nama Panggilan
          </label>
          <input
            type="text"
            id="nickname"
            autoComplete="off"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            placeholder="Contoh: Rafi"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Jenis Kelamin */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Jenis Kelamin
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setGender(gender === "Laki-laki" ? "" : "Laki-laki")
              }
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                gender === "Laki-laki"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 ring-1 ring-blue-500"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              <span>👦</span> Laki-laki
            </button>
            <button
              type="button"
              onClick={() =>
                setGender(gender === "Perempuan" ? "" : "Perempuan")
              }
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                gender === "Perempuan"
                  ? "border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 ring-1 ring-pink-500"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              <span>👧</span> Perempuan
            </button>
          </div>
        </div>

        {/* Tanggal Lahir & Kalkulasi Usia */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label
              htmlFor="dob"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              Tanggal Lahir
            </label>
            {calculatedAge && (
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                ⏳ {calculatedAge}
              </span>
            )}
          </div>
          <DatePickerInput
            id="dob"
            required
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
