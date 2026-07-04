"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/icons";
import { createStudent } from "@/lib/actions";

interface Label {
  id: string;
  main_level: string;
  sub_level: string;
  hex_color: string;
}

interface StudentRegistrationFormProps {
  onClose: () => void;
  labels: Label[];
  onSuccess: () => void;
}

export function StudentRegistrationForm({ onClose, labels, onSuccess }: StudentRegistrationFormProps) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [status, setStatus] = useState("CG"); // CG by default
  const [labelId, setLabelId] = useState("");
  
  const [calculatedAge, setCalculatedAge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto calculate age
  useEffect(() => {
    if (!dob) {
      setCalculatedAge("");
      return;
    }
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < birthDate.getDate()) {
      months--;
      if (months < 0) {
        months += 12;
      }
    }

    if (years === 0 && months === 0) {
      setCalculatedAge("Baru lahir");
    } else {
      setCalculatedAge(`${years} Tahun ${months} Bulan`);
    }
  }, [dob]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("date_of_birth", dob);
      formData.append("status", status);
      if (status === "REGISTERED" && labelId) {
        formData.append("label_id", labelId);
      }
      
      await createStudent(formData);
      onSuccess();
      onClose();
    } catch (error) {
      alert("Gagal menambahkan siswa. Silakan coba lagi.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal/Drawer Container */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
        <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Icons.users className="w-5 h-5 text-brand-500" />
              Pendaftaran Siswa Baru
            </h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="sr-only">Tutup</span>
              <Icons.close className="w-5 h-5" />
            </button>
          </div>
          
          {/* Form Body - Scrollable */}
          <div className="p-6 overflow-y-auto flex-1">
            <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Nama Lengkap */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap Siswa
                </label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>
              
              {/* Tanggal Lahir & Kalkulator Umur */}
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tanggal Lahir
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="dob"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                  />
                </div>
                {calculatedAge && (
                  <div className="mt-2 text-sm text-brand-600 dark:text-brand-400 flex items-center gap-1.5 font-medium bg-brand-50 dark:bg-brand-500/10 p-2 rounded-lg inline-flex">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Usia riil: {calculatedAge}
                  </div>
                )}
              </div>
              
              {/* Status Pendaftaran */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Status Pendaftaran
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus("CG")}
                    className={`px-4 py-3 text-sm font-medium rounded-xl border transition-all ${
                      status === "CG" 
                        ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-500" 
                        : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Coba Gratis (CG)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("REGISTERED")}
                    className={`px-4 py-3 text-sm font-medium rounded-xl border transition-all ${
                      status === "REGISTERED" 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-500" 
                        : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Reguler Terdaftar
                  </button>
                </div>
              </div>
              
              {/* Pilihan Level (Wajib jika Reguler) */}
              <div className={`transition-all duration-300 overflow-hidden ${status === "REGISTERED" ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}>
                <label htmlFor="label_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pilih Tingkat / Label Level
                </label>
                <select
                  id="label_id"
                  value={labelId}
                  onChange={(e) => setLabelId(e.target.value)}
                  required={status === "REGISTERED"}
                  className="mt-1 block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                >
                  <option value="" disabled>-- Pilih Level --</option>
                  {labels.map((lbl) => (
                    <option key={lbl.id} value={lbl.id}>
                      {lbl.main_level} - {lbl.sub_level}
                    </option>
                  ))}
                </select>
              </div>

            </form>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 sm:rounded-b-2xl shrink-0">
            <button
              type="submit"
              form="student-form"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                </>
              ) : (
                "Simpan & Daftarkan Siswa"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
