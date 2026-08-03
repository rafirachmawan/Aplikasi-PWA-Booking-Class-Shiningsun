"use client";

import { useState, useEffect, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

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
    januari: "01",
    jan: "01",
    februari: "02",
    feb: "02",
    maret: "03",
    mar: "03",
    april: "04",
    apr: "04",
    mei: "05",
    juni: "06",
    jun: "06",
    juli: "07",
    jul: "07",
    agustus: "08",
    agu: "08",
    agus: "08",
    september: "09",
    sep: "09",
    oktober: "10",
    okt: "10",
    november: "11",
    nov: "11",
    desember: "12",
    des: "12",
  };

  const parts = dateStr.toLowerCase().replace(/,/g, "").split(/\s+/);
  let day = "",
    month = "",
    year = "";
  for (const part of parts) {
    if (!isNaN(parseInt(part)) && part.length <= 2) day = part.padStart(2, "0");
    else if (!isNaN(parseInt(part)) && part.length === 4) year = part;
    else if (months[part]) month = months[part];
  }

  if (day && month && year) {
    return `${year}-${month}-${day}`;
  }
  return "";
}

export function StudentRegistrationForm({
  onClose,
  labels,
  onSuccess,
  initialData,
}: StudentRegistrationFormProps) {
  const [name, setName] = useState(initialData ? initialData.name : "");
  const [nickname, setNickname] = useState(initialData?.nickname || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [school, setSchool] = useState(initialData?.school || "");
  const [registrationDate, setRegistrationDate] = useState(
    initialData?.registration_date || new Date().toISOString().split("T")[0],
  );
  const [dob, setDob] = useState(initialData ? initialData.date_of_birth : "");
  const [status, setStatus] = useState(initialData ? initialData.status : "CG");
  const [labelId, setLabelId] = useState(
    initialData?.label_id ? initialData.label_id : "",
  );

  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [showWaAutofill, setShowWaAutofill] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

      // If status is CG, we set label_id to empty/null to clear previous label
      if (status === "REGISTERED" && labelId) {
        formData.append("label_id", labelId);
      } else {
        formData.append("label_id", "");
      }

      if (initialData) {
        const { updateStudent } = await import("@/lib/actions");
        await updateStudent(initialData.id, formData);
      } else {
        const { createStudent } = await import("@/lib/actions");
        await createStudent(formData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert("Gagal menyimpan data siswa. Silakan coba lagi.");
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
    if (phoneMatch) setPhone(phoneMatch[1].trim().replace(/[^0-9\+\-]/g, ""));

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

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 sm:rounded-t-2xl">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-600 dark:text-brand-400">
                  <Icons.users className="w-5 h-5" />
                </span>
                {initialData ? "Edit Data Siswa" : "Pendaftaran Siswa Baru"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icons.close className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body - Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* WhatsApp Auto-Fill Panel */}
            {!initialData && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowWaAutofill(!showWaAutofill)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 text-emerald-500"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.817 9.817 0 0 0 12.04 2zm0 1.63c4.56 0 8.27 3.71 8.27 8.28 0 2.21-.58 4.31-1.68 6.13l-.37.59 1.1 4.02-4.11-1.08-.57.34a8.196 8.196 0 0 1-4.64 1.41c-4.56 0-8.27-3.71-8.27-8.28 0-2.21.58-4.31 1.68-6.13l.37-.59-1.1-4.02 4.11 1.08.57-.34a8.196 8.196 0 0 1 4.64-1.41zm-1.89 3.26c-.22 0-.46.08-.66.3-.2.22-.76.74-.76 1.81 0 1.07.78 2.11.89 2.26.11.15 1.53 2.34 3.71 3.28.52.22.92.36 1.24.46.52.16 1 .14 1.37.09.42-.06 1.28-.52 1.46-1.03.18-.51.18-.94.13-1.03-.05-.09-.18-.15-.38-.25-.2-.1-1.19-.59-1.37-.66-.18-.07-.31-.1-.44.1-.13.2-.49.62-.6 1-.11.13-.22.15-.42.05-.2-.1-.85-.31-1.62-1-.6-.53-1.01-1.19-1.12-1.39-.11-.2-.01-.31.09-.41.09-.09.2-.22.3-.33.1-.11.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.44-1.07-.61-1.47-.16-.39-.33-.34-.46-.34z" />
                    </svg>
                    Autofill / Isi Otomatis WA
                  </span>
                  <svg
                    className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${showWaAutofill ? "rotate-185" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div
                  className={`transition-all duration-300 ${showWaAutofill ? "max-h-40 opacity-100 p-4 border-t border-slate-200 dark:border-slate-800" : "max-h-0 opacity-0 pointer-events-none"}`}
                >
                  <textarea
                    rows={3}
                    onChange={handlePasteWA}
                    className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-xs placeholder:text-slate-400"
                    placeholder="Tempel (paste) format teks pendaftaran dari WhatsApp di sini..."
                  />
                </div>
              </div>
            )}

            <form
              id="student-form"
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Section 1: Data Akademik / Pendaftaran */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Informasi Pendaftaran
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tanggal Pendaftaran */}
                  <div>
                    <label
                      htmlFor="registrationDate"
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Tanggal Pendaftaran
                    </label>
                    <DatePickerInput
                      id="registrationDate"
                      required
                      value={registrationDate}
                      onChange={(e) => setRegistrationDate(e.target.value)}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Status Pendaftaran
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStatus("CG")}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          status === "CG"
                            ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-500"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        Coba Gratis (CG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("REGISTERED")}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          status === "REGISTERED"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-500"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        Reguler
                      </button>
                    </div>
                  </div>
                </div>

                {/* Level Dropdown (Only show if Regular) */}
                {status === "REGISTERED" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Tingkat Level / Kelas
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsLevelOpen(!isLevelOpen)}
                        className="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-white text-left text-sm cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {labelId === ""
                            ? "-- Pilih Level --"
                            : (() => {
                                const selectedLabel = labels.find(
                                  (l) => l.id === labelId,
                                );
                                return selectedLabel
                                  ? `${selectedLabel.main_level} - ${selectedLabel.sub_level}`
                                  : "-- Pilih Level --";
                              })()}
                        </span>
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isLevelOpen ? "rotate-180" : ""}`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {isLevelOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg max-h-[160px] overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setLabelId("");
                              setIsLevelOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                              labelId === ""
                                ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                                : "text-slate-700 dark:text-slate-300"
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
                              className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                                labelId === lbl.id
                                  ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: lbl.hex_color }}
                              ></span>
                              {lbl.main_level} - {lbl.sub_level}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Data Anak */}
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
                  {/* Tanggal Lahir */}
                  <div>
                    <label
                      htmlFor="dob"
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Tanggal Lahir
                    </label>
                    <DatePickerInput
                      id="dob"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>

                  {/* Kalkulator Usia */}
                  <div className="flex flex-col justify-end">
                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
                      Kalkulasi Usia
                    </label>
                    <div className="h-9 flex items-center px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {calculatedAge ? (
                        <span className="flex items-center gap-1">
                          ⏳ {calculatedAge}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">
                          Pilih tanggal lahir
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Kontak & Alamat */}
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
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 sm:rounded-b-2xl shrink-0">
            <button
              type="submit"
              form="student-form"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Menyimpan...
                </>
              ) : initialData ? (
                "Simpan Perubahan"
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
