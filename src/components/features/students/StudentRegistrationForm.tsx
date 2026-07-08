"use client";

import { useState, useEffect, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import { createStudent } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
  initialData?: any;
}

function parseIndonesianDate(dateStr: string) {
  if (!dateStr) return "";
  
  const months: Record<string, string> = {
    'januari': '01', 'jan': '01',
    'februari': '02', 'feb': '02',
    'maret': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'mei': '05',
    'juni': '06', 'jun': '06',
    'juli': '07', 'jul': '07',
    'agustus': '08', 'agu': '08', 'agus': '08',
    'september': '09', 'sep': '09',
    'oktober': '10', 'okt': '10',
    'november': '11', 'nov': '11',
    'desember': '12', 'des': '12'
  };

  const parts = dateStr.toLowerCase().replace(/,/g, '').split(/\s+/);
  let day = "", month = "", year = "";
  for (const part of parts) {
    if (!isNaN(parseInt(part)) && part.length <= 2) day = part.padStart(2, '0');
    else if (!isNaN(parseInt(part)) && part.length === 4) year = part;
    else if (months[part]) month = months[part];
  }
  
  if (day && month && year) {
    return `${year}-${month}-${day}`;
  }
  return "";
}

export function StudentRegistrationForm({ onClose, labels, onSuccess, initialData }: StudentRegistrationFormProps) {
  const [name, setName] = useState(initialData ? initialData.name : "");
  const [nickname, setNickname] = useState(initialData?.nickname || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [school, setSchool] = useState(initialData?.school || "");
  const [registrationDate, setRegistrationDate] = useState(
    initialData?.registration_date || new Date().toISOString().split('T')[0]
  );
  const [dob, setDob] = useState(initialData ? initialData.date_of_birth : "");
  const [status, setStatus] = useState(initialData ? initialData.status : "CG");
  const [labelId, setLabelId] = useState(initialData?.label_id ? initialData.label_id : "");
  
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLevelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      formData.append("nickname", nickname);
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("school", school);
      formData.append("registration_date", registrationDate);
      formData.append("date_of_birth", dob);
      formData.append("status", status);
      if (status === "REGISTERED" && labelId) {
        formData.append("label_id", labelId);
      }
      
      if (initialData) {
        const { updateStudent } = await import('@/lib/actions');
        await updateStudent(initialData.id, formData);
      } else {
        const { createStudent } = await import('@/lib/actions');
        await createStudent(formData);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      alert("Gagal menambahkan siswa. Silakan coba lagi.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteWA = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (!text) return;

    // Tanggal Pendaftaran
    const tglDaftarMatch = text.match(/Tanggal Pendaftaran\s*:\s*(.+)/i);
    if (tglDaftarMatch) {
      const parsedDate = parseIndonesianDate(tglDaftarMatch[1].trim());
      if (parsedDate) setRegistrationDate(parsedDate);
    }

    // Nama Lengkap anak
    const nameMatch = text.match(/Nama Lengkap(?: anak)?\s*:\s*(.+)/i);
    if (nameMatch) setName(nameMatch[1].trim());

    // Nama panggilan
    const nicknameMatch = text.match(/Nama panggilan\s*:\s*(.+)/i);
    if (nicknameMatch) setNickname(nicknameMatch[1].trim());

    // Tanggal lahir anak
    const dobMatch = text.match(/Tanggal lahir(?: anak)?\s*:\s*(.+)/i);
    if (dobMatch) {
      const parsedDate = parseIndonesianDate(dobMatch[1].trim());
      if (parsedDate) setDob(parsedDate);
    }

    // No hp
    const phoneMatch = text.match(/No(?:[\s\.]*)?hp\s*:\s*(.+)/i);
    if (phoneMatch) setPhone(phoneMatch[1].trim().replace(/[^0-9\+\-]/g, ''));

    // Alamat
    const addressMatch = text.match(/Alamat\s*:\s*(.+)/i);
    if (addressMatch) setAddress(addressMatch[1].trim());

    // Sekolah
    const schoolMatch = text.match(/Sekolah\s*:\s*(.+)/i);
    if (schoolMatch) setSchool(schoolMatch[1].trim());
  };

  return (
    <>
      {isSubmitting && <LoadingSpinner usePortal={true} />}
      
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
            
            {!initialData && (
              <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <label htmlFor="wa-paste" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
                  </svg>
                  Isi Otomatis dari WhatsApp
                </label>
                <textarea
                  id="wa-paste"
                  rows={2}
                  onChange={handlePasteWA}
                  className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm placeholder:text-slate-400"
                  placeholder="Paste (Tempel) text pendaftaran dari WA di sini untuk mengisi form otomatis..."
                />
              </div>
            )}

            <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Tanggal Pendaftaran */}
              <div>
                <label htmlFor="registrationDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tanggal Pendaftaran
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="registrationDate"
                    required
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Nama Lengkap & Panggilan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nama Lengkap Anak
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nama Panggilan
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                      placeholder="Nama Panggilan"
                    />
                  </div>
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
                    Usia: {calculatedAge}
                  </div>
                )}
              </div>
              
              {/* Kontak & Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    No. HP (WhatsApp)
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Sekolah Asal
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      id="school"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                      placeholder="TK/PAUD/SD..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Alamat Lengkap
                </label>
                <div className="mt-1 relative">
                  <textarea
                    id="address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                    placeholder="Alamat domisili anak..."
                  />
                </div>
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
              <div 
                className={`transition-all duration-300 ${
                  status === "REGISTERED" 
                    ? "opacity-100 overflow-visible" 
                    : "max-h-0 opacity-0 overflow-hidden pointer-events-none"
                }`}
              >
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Tingkat / Label Level (Opsional)
                </label>
                
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLevelOpen(!isLevelOpen)}
                    className="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white text-left text-sm cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                      {labelId === "" 
                        ? "-- Pilih Level --" 
                        : (() => {
                            const selectedLabel = labels.find(l => l.id === labelId);
                            return selectedLabel ? `${selectedLabel.main_level} - ${selectedLabel.sub_level}` : "-- Pilih Level --";
                          })()
                      }
                    </span>
                    <svg className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isLevelOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isLevelOpen && (
                    <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-[195px] overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setLabelId("");
                          setIsLevelOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                          labelId === "" ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20" : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        -- Pilih Level --
                      </button>
                      {labels.map((lbl) => (
                        <button
                          key={lbl.id}
                          type="button"
                          onClick={() => {
                            setLabelId(lbl.id);
                            setIsLevelOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                            labelId === lbl.id ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20" : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lbl.hex_color }}></span>
                          {lbl.main_level} - {lbl.sub_level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
