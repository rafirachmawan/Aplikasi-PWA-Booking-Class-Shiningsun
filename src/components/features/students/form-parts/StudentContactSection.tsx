"use client";

// Dipisahkan dari StudentRegistrationForm.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch } from "react";

export interface StudentContactSectionProps {
  address: any;
  phone: any;
  school: any;
  setAddress: Dispatch<any>;
  setPhone: Dispatch<any>;
  setSchool: Dispatch<any>;
}

export function StudentContactSection({
  address,
  phone,
  school,
  setAddress,
  setPhone,
  setSchool,
}: StudentContactSectionProps) {
  return (
    <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4 shadow-sm bg-white dark:bg-slate-900/20">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Kontak & Alamat
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* No HP */}
        <div>
          <label
            htmlFor="phone"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            No. HP (WhatsApp Orang Tua)
          </label>
          <input
            type="tel"
            id="phone"
            autoComplete="off"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            placeholder="Contoh: 081234567890"
          />
        </div>

        {/* Sekolah */}
        <div>
          <label
            htmlFor="school"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Sekolah Asal (TK / PAUD)
          </label>
          <input
            type="text"
            id="school"
            autoComplete="off"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            placeholder="Contoh: TK Shining Sun"
          />
        </div>
      </div>

      {/* Alamat */}
      <div>
        <label
          htmlFor="address"
          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
        >
          Alamat Domisili
        </label>
        <textarea
          id="address"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm placeholder:text-slate-400"
          placeholder="Masukkan alamat tinggal anak saat ini..."
        />
      </div>
    </div>
  );
}
