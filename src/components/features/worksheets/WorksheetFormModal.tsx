"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import { createWorksheet, updateWorksheet } from "@/lib/actions";
import { getGDrivePreviewLink, getGDriveDirectLink, extractGDriveFileId } from "@/lib/gdriveUtils";
import { getTodayISO } from "@/lib/dateUtils";

interface WorksheetFormModalProps {
  students: any[];
  teachers?: any[];
  templates?: any[];
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const parseBulletList = (text?: string): string[] => {
  if (!text || !text.trim()) return [""];
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [""];
};

export function WorksheetFormModal({
  students,
  teachers = [],
  templates = [],
  initialData,
  onClose,
  onSuccess,
}: WorksheetFormModalProps) {
  const isEditing = !!initialData?.id;
  const [studentId, setStudentId] = useState(initialData?.student_id || (students[0]?.id || ''));
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [worksheetDate, setWorksheetDate] = useState(initialData?.worksheet_date || getTodayISO());
  const [gdriveLink, setGdriveLink] = useState(initialData?.gdrive_link || '');
  const [materi, setMateri] = useState(initialData?.materi || '');
  
  // Custom Student Dropdown State
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Custom Bulan Ke Dropdown State
  const [isBulanKeDropdownOpen, setIsBulanKeDropdownOpen] = useState(false);
  const bulanKeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStudentDropdownOpen(false);
      }
      if (
        bulanKeDropdownRef.current &&
        !bulanKeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBulanKeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, studentSearch]);
  
  // Dynamic bullet list items for Kegiatan & Hasil Belajar
  const [kegiatanItems, setKegiatanItems] = useState<string[]>(() =>
    parseBulletList(initialData?.kegiatan)
  );
  const [hasilBelajarItems, setHasilBelajarItems] = useState<string[]>(() =>
    parseBulletList(initialData?.hasil_belajar)
  );

  const [catatanGuru, setCatatanGuru] = useState(initialData?.catatan_guru || '');
  const [rekomendasiRumah, setRekomendasiRumah] = useState(initialData?.rekomendasi_rumah || '');
  const [ttdGuru, setTtdGuru] = useState(initialData?.ttd_guru || '');
  const [bulanKe, setBulanKe] = useState(initialData?.bulan_ke?.toString() || '');
  
  // Google Drive Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploadingGDrive, setIsUploadingGDrive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleUploadToGDrive = async (fileToUpload?: File) => {
    const target = fileToUpload || selectedFile;
    if (!target) return;

    setIsUploadingGDrive(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", target);

      const res = await fetch("/api/upload-gdrive", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah ke Google Drive");
      }

      if (data.gdriveLink) {
        setGdriveLink(data.gdriveLink);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Gagal mengunggah file");
    } finally {
      setIsUploadingGDrive(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeStudent = students.find((s) => s.id === studentId || s.id === initialData?.student_id) || initialData?.student;
  const activeStudentName = activeStudent?.name || initialData?.student_name || "Siswa";

  const fileId = extractGDriveFileId(gdriveLink);

  // Template autofill handler
  const handleSelectTemplate = (tplId: string) => {
    if (!tplId) return;
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      if (found.materi) setMateri(found.materi);
      if (found.kegiatan) setKegiatanItems(parseBulletList(found.kegiatan));
      if (found.hasil_belajar) setHasilBelajarItems(parseBulletList(found.hasil_belajar));
    }
  };

  // Smart Quick Assessment Builder State (Format Client Poin 1/2/3/4)
  const [showSmartBuilder, setShowSmartBuilder] = useState(true);

  // Dynamic template lists per category
  const materiTemplates = templates.filter((t) => t.category === "materi");
  const kegiatanTemplates = templates.filter((t) => (t.category || "kegiatan") === "kegiatan");
  const pemahamanTemplates = templates.filter((t) => t.category === "pemahaman");
  const rumahTemplates = templates.filter((t) => t.category === "rumah");
  const afirmasiTemplates = templates.filter((t) => t.category === "afirmasi");

  const defaultKegiatanOptions = kegiatanTemplates.length > 0
    ? kegiatanTemplates.map((t, idx) => ({ id: t.id, num: (idx + 1).toString(), label: t.title }))
    : [
        { id: "1", num: "1", label: "Belajar mengenal" },
        { id: "2", num: "2", label: "Mengulang" },
        { id: "3", num: "3", label: "Melanjutkan" },
      ];

  const defaultPemahamanOptions = pemahamanTemplates.length > 0
    ? pemahamanTemplates.map((t, idx) => ({ id: t.id, num: (idx + 1).toString(), label: t.title, desc: t.materi }))
    : [
        { id: "1", num: "1", label: "Masih bingung", desc: "Tetap semangat ya, sedikit demi sedikit pasti bisa" },
        { id: "2", num: "2", label: "Mulai menunjukkan ketertarikan", desc: "Kami senang melihat Ananda mulai penasaran, Lanjutkan rasa ingin tahu menjadi modal besar agar semakin cerdas." },
        { id: "3", num: "3", label: "Sudah bisa beberapa dengan bantuan", desc: "Keren! Ananda sudah bisa beberapa materi dengan bantuan. Sedikit lagi bisa mandiri." },
        { id: "4", num: "4", label: "Sudah bisa secara mandiri", desc: "Luar biasa! Sudah bisa mengerjakan mandiri. Pertahankan!" },
      ];

  const defaultRumahOptions = rumahTemplates.length > 0
    ? rumahTemplates.map((t, idx) => ({ id: t.id, num: (idx + 1).toString(), label: t.title }))
    : [
        { id: "1", num: "1", label: "Mengulang materi hari ini" },
        { id: "2", num: "2", label: "Melanjutkan materi" },
      ];

  const defaultAfirmasiOptions = afirmasiTemplates.length > 0
    ? afirmasiTemplates.map((t, idx) => ({ id: t.id, num: (idx + 1).toString(), label: t.title, text: t.materi || t.title }))
    : [
        { id: "1", num: "1", label: "Afirmasi 1 (Masih bingung)", text: "Tetap semangat ya, sedikit demi sedikit pasti bisa" },
        { id: "2", num: "2", label: "Afirmasi 2 (Mulai tertarik)", text: "Kami senang melihat Ananda mulai penasaran, Lanjutkan rasa ingin tahu menjadi modal besar agar semakin cerdas." },
        { id: "3", num: "3", label: "Afirmasi 3 (Dengan bantuan)", text: "Keren! Ananda sudah bisa beberapa materi dengan bantuan. Sedikit lagi bisa mandiri." },
        { id: "4", num: "4", label: "Afirmasi 4 (Mandiri)", text: "Luar biasa! Sudah bisa mengerjakan mandiri. Pertahankan!" },
      ];

  const [smartKegiatanId, setSmartKegiatanId] = useState<string>("");
  const [smartMateriText, setSmartMateriText] = useState("");
  const [smartPemahamanId, setSmartPemahamanId] = useState<string>("");
  const [smartRumahId, setSmartRumahId] = useState<string>("");
  const [smartAfirmasiId, setSmartAfirmasiId] = useState<string>("");

  // Custom Dropdown Open State ('materi' | 'kegiatan' | 'pemahaman' | 'rumah' | 'afirmasi' | 'guru' | null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const selectedKegiatan = defaultKegiatanOptions.find((o) => o.id === smartKegiatanId);
  const selectedPemahaman = defaultPemahamanOptions.find((o) => o.id === smartPemahamanId);
  const selectedRumah = defaultRumahOptions.find((o) => o.id === smartRumahId);
  const selectedAfirmasi = defaultAfirmasiOptions.find((o) => o.id === smartAfirmasiId);

  // Synchronize Afirmasi dropdown when Pemahaman changes
  const handlePemahamanChange = (newPemId: string) => {
    setSmartPemahamanId(newPemId);
    const pemOpt = defaultPemahamanOptions.find((o) => o.id === newPemId);
    const matchedAf = defaultAfirmasiOptions.find((a) => a.num === pemOpt?.num || a.id === newPemId);
    if (matchedAf) {
      setSmartAfirmasiId(matchedAf.id);
      setCatatanGuru(matchedAf.text);
    }
  };

  const handleAfirmasiChange = (newAfId: string) => {
    setSmartAfirmasiId(newAfId);
    const afOpt = defaultAfirmasiOptions.find((a) => a.id === newAfId);
    if (afOpt) {
      setCatatanGuru(afOpt.text);
    }
  };

  const selectedAfirmasiObj = defaultAfirmasiOptions.find((a) => a.id === smartAfirmasiId);
  const activeAfirmasiText = selectedAfirmasiObj?.text || (smartAfirmasiId ? "Tetap semangat ya!" : "Pilih afirmasi positif...");

  const handleApplySmartAssessment = () => {
    const materiVal = smartMateriText.trim();
    if (materiVal) {
      setMateri(materiVal);
    }

    // 1. Kegiatan
    const kegOpt = defaultKegiatanOptions.find((o) => o.id === smartKegiatanId);
    if (kegOpt) {
      const kegLabel = kegOpt.label.replace(/^(1|2|3|4)\.\s*/, "");
      setKegiatanItems([`Hari ini Ananda ${kegLabel} ${materiVal || "materi"}`]);
    }

    // 2. Pemahaman (Hanya ini yang masuk ke Hasil Belajar)
    const newHasil: string[] = [];
    const pemOpt = defaultPemahamanOptions.find((o) => o.id === smartPemahamanId);
    if (pemOpt) {
      const pemLabel = pemOpt.label.replace(/^(1|2|3|4)\.\s*/, "");
      newHasil.push(`Ananda ${pemLabel.toLowerCase()}`);
    }

    if (newHasil.length > 0) {
      setHasilBelajarItems(newHasil);
    }

    // 3. Rekomendasi di Rumah (Tempat Sendiri)
    const rumOpt = defaultRumahOptions.find((o) => o.id === smartRumahId);
    if (rumOpt) {
      const rumLabel = rumOpt.label.replace(/^(1|2|3|4)\.\s*/, "");
      setRekomendasiRumah(`Untuk di rumah Ananda bisa ${rumLabel.toLowerCase()}`);
    }

    // 4. Afirmasi Catatan Guru
    if (selectedAfirmasiObj) {
      setCatatanGuru(selectedAfirmasiObj.text);
    }
  };

  // Handlers for Kegiatan list
  const handleKegiatanChange = (idx: number, val: string) => {
    const next = [...kegiatanItems];
    next[idx] = val;
    setKegiatanItems(next);
  };
  const addKegiatanItem = () => setKegiatanItems((prev) => [...prev, ""]);
  const removeKegiatanItem = (idx: number) => {
    setKegiatanItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [""]));
  };

  // Handlers for Hasil Belajar list
  const handleHasilChange = (idx: number, val: string) => {
    const next = [...hasilBelajarItems];
    next[idx] = val;
    setHasilBelajarItems(next);
  };
  const addHasilItem = () => setHasilBelajarItems((prev) => [...prev, ""]);
  const removeHasilItem = (idx: number) => {
    setHasilBelajarItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [""]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || materi.trim() || "Laporan Perkembangan";
    if (!isEditing && !studentId) {
      setErrorMsg("Pilih siswa terlebih dahulu.");
      return;
    }

    const formattedKegiatan = kegiatanItems
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n");

    const formattedHasilBelajar = hasilBelajarItems
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n");

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('student_id', studentId);
      formData.append('title', finalTitle);
      formData.append('description', description.trim());
      formData.append('worksheet_date', worksheetDate);
      formData.append('gdrive_link', gdriveLink.trim());
      formData.append('materi', materi.trim());
      formData.append('kegiatan', formattedKegiatan);
      formData.append('hasil_belajar', formattedHasilBelajar);
      formData.append('catatan_guru', catatanGuru.trim());
      formData.append('rekomendasi_rumah', rekomendasiRumah.trim());
      formData.append('ttd_guru', ttdGuru.trim());
      if (bulanKe) formData.append('bulan_ke', bulanKe);

      if (isEditing) {
        await updateWorksheet(initialData.id, formData);
      } else {
        await createWorksheet(formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan laporan perkembangan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header: Premium Gradient Banner with Glass Icon */}
        <div className="relative flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-brand-600 via-sky-600 to-indigo-600 text-white overflow-hidden shadow-md">
          {/* Decorative glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shadow-inner shrink-0">
              <Icons.edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight">
                {isEditing ? "Edit Laporan Perkembangan" : "Tambah Laporan Perkembangan"}
              </h3>
              <p className="text-xs text-sky-100/90 font-medium mt-0.5">
                Catat materi, kegiatan, hasil belajar, dan catatan guru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="relative z-10 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Tutup"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
              {errorMsg}
            </div>
          )}

          {/* ── SECTION 1: Info Dasar ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-extrabold shrink-0">1</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Info Dasar</span>
            </div>

            {/* Student */}
            {!isEditing ? (
              <div className="relative" ref={studentDropdownRef}>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Siswa <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/80 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center justify-center font-extrabold text-xs shrink-0">
                      {activeStudent?.name ? activeStudent.name.charAt(0).toUpperCase() : "👤"}
                    </span>
                    <span className="truncate text-xs sm:text-sm font-bold text-left">
                      {activeStudent
                        ? `${activeStudent.name}${activeStudent.nickname ? ` (${activeStudent.nickname})` : ""} ${activeStudent.label ? `• ${activeStudent.label.main_level}` : ""}`
                        : "-- Pilih Siswa --"}
                    </span>
                  </div>
                  <Icons.chevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isStudentDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Custom Popover Dropdown Menu */}
                {isStudentDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Search Input inside Dropdown */}
                    {students.length > 5 && (
                      <div className="p-1">
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="🔍 Cari nama siswa..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Scrollable Student List */}
                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredStudents.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Siswa tidak ditemukan.
                        </div>
                      ) : (
                        filteredStudents.map((s) => {
                          const isSelected = s.id === studentId;
                          const initial = s.name.charAt(0).toUpperCase();

                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setStudentId(s.id);
                                setIsStudentDropdownOpen(false);
                                setStudentSearch("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-bold border border-brand-200/80 dark:border-brand-800/50"
                                  : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                    isSelected
                                      ? "bg-brand-600 text-white"
                                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {initial}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 dark:text-white truncate text-xs">
                                    {s.name} {s.nickname ? `(${s.nickname})` : ""}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {s.label
                                      ? `${s.label.main_level} ${s.label.sub_level}`
                                      : "Tanpa Level"}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0 text-xs">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Siswa
                </label>
                <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0"></span>
                  <span>{activeStudentName}</span>
                  {activeStudent?.nickname && (
                    <span className="text-xs text-slate-400 font-normal">({activeStudent.nickname})</span>
                  )}
                </div>
              </div>
            )}

            {/* Date + Bulan Ke + TTD Guru in grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={worksheetDate}
                  onChange={(e) => setWorksheetDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div className="relative" ref={bulanKeDropdownRef}>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bulan Ke
                </label>
                <button
                  type="button"
                  onClick={() => setIsBulanKeDropdownOpen(!isBulanKeDropdownOpen)}
                  className="w-full flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/80 cursor-pointer"
                >
                  <span className="truncate font-bold">
                    {bulanKe ? `Bulan ke-${bulanKe}` : "-- Pilih --"}
                  </span>
                  <Icons.chevronDown
                    className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isBulanKeDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Custom Popover for Bulan Ke */}
                {isBulanKeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 max-h-48 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setBulanKe("");
                        setIsBulanKeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        !bulanKe
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>-- Pilih --</span>
                      {!bulanKe && <span>✓</span>}
                    </button>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                      const isSel = bulanKe === m.toString();
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setBulanKe(m.toString());
                            setIsBulanKeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isSel
                              ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-extrabold border border-brand-200/80 dark:border-brand-800/50"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span>📅 Bulan ke-{m}</span>
                          {isSel && (
                            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0 text-xs">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Guru / Miss
                </label>
                {teachers.length > 0 ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'guru' ? null : 'guru')}
                      className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold shadow-xs hover:border-slate-300 cursor-pointer text-left"
                    >
                      <span className="truncate">
                        {ttdGuru ? `👩‍🏫 ${ttdGuru}` : "-- Pilih Guru --"}
                      </span>
                      <Icons.chevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${openDropdown === 'guru' ? 'rotate-180' : ''}`} />
                    </button>

                    {openDropdown === 'guru' && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                        {teachers.map((t) => {
                          const isSel = ttdGuru === t.name;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setTtdGuru(t.name);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                                isSel
                                  ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-extrabold"
                                  : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                              }`}
                            >
                              <span className="truncate">👩‍🏫 {t.name}</span>
                              {isSel && <span className="text-brand-600 shrink-0 text-xs font-bold">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={ttdGuru}
                    onChange={(e) => setTtdGuru(e.target.value)}
                    placeholder="Cth: Miss Sarah"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Data Perkembangan ── */}
          <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-extrabold shrink-0">2</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">📋 Data Perkembangan Anak</span>
            </div>

            {/* Smart Assessment Builder Panel (Format Client 1/2/3) */}
            <div className="bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-900/60 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Penilaian Cepat (Format Opsi 1/2/3/4)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pilih angka 1, 2, atau 3/4 untuk menyusun kalimat evaluasi &amp; afirmasi positif secara otomatis.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSmartBuilder(!showSmartBuilder)}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer shrink-0"
                >
                  {showSmartBuilder ? "▲ Sembunyikan" : "▼ Buka Generator"}
                </button>
              </div>

              {showSmartBuilder && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                  {/* 1. Materi yang Diajarkan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      1. Materi yang Diajarkan:
                    </label>
                    <div className="space-y-2">
                      {materiTemplates.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(openDropdown === 'materi' ? null : 'materi')}
                            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-slate-800 text-sky-950 dark:text-sky-200 text-xs sm:text-sm font-semibold shadow-xs hover:border-sky-400 cursor-pointer text-left"
                          >
                            <span className="truncate">
                              {smartMateriText ? `📚 ${smartMateriText}` : "-- Pilih Materi dari Master CRUD --"}
                            </span>
                            <Icons.chevronDown className={`w-4 h-4 text-sky-600 shrink-0 transition-transform duration-200 ${openDropdown === 'materi' ? 'rotate-180' : ''}`} />
                          </button>

                          {openDropdown === 'materi' && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-1.5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                              <button
                                type="button"
                                onClick={() => {
                                  setSmartMateriText("");
                                  setMateri("");
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                -- Reset Pilihan --
                              </button>
                              {materiTemplates.map((t) => {
                                const isSel = smartMateriText === t.title;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      setSmartMateriText(t.title);
                                      setMateri(t.title);
                                      setOpenDropdown(null);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                      isSel
                                        ? "bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-extrabold"
                                        : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                    }`}
                                  >
                                    <span className="break-words whitespace-normal leading-snug">📚 {t.title}</span>
                                    {isSel && <span className="text-sky-600 shrink-0 text-xs font-bold mt-0.5">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Hari ini Ananda... (Kegiatan) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      2. Hari ini Ananda (Kegiatan):
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'kegiatan' ? null : 'kegiatan')}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold shadow-xs hover:border-slate-400 cursor-pointer text-left"
                      >
                        <span className="line-clamp-2 leading-snug">
                          {selectedKegiatan
                            ? `${selectedKegiatan.num}. ${selectedKegiatan.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                            : "-- Pilih Jenis Kegiatan --"}
                        </span>
                        <Icons.chevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openDropdown === 'kegiatan' ? 'rotate-180' : ''}`} />
                      </button>

                      {openDropdown === 'kegiatan' && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                          {defaultKegiatanOptions.map((opt) => {
                            const isSel = smartKegiatanId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSmartKegiatanId(opt.id);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                  isSel
                                    ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-extrabold"
                                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                }`}
                              >
                                <span className="break-words whitespace-normal leading-snug">{opt.num}. {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}</span>
                                {isSel && <span className="text-brand-600 shrink-0 text-xs font-bold mt-0.5">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Pemahaman / Hasil Evaluasi Ananda */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      3. Pemahaman / Hasil Evaluasi Ananda:
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'pemahaman' ? null : 'pemahaman')}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-slate-800 text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm font-semibold shadow-xs hover:border-emerald-400 cursor-pointer text-left"
                      >
                        <span className="line-clamp-2 leading-snug">
                          {selectedPemahaman
                            ? `${selectedPemahaman.num}. ${selectedPemahaman.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                            : "-- Pilih Hasil Evaluasi / Pemahaman --"}
                        </span>
                        <Icons.chevronDown className={`w-4 h-4 text-emerald-600 shrink-0 transition-transform duration-200 ${openDropdown === 'pemahaman' ? 'rotate-180' : ''}`} />
                      </button>

                      {openDropdown === 'pemahaman' && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 p-1.5 space-y-1 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                          {defaultPemahamanOptions.map((opt) => {
                            const isSel = smartPemahamanId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  handlePemahamanChange(opt.id);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                  isSel
                                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-extrabold"
                                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                }`}
                              >
                                <span className="break-words whitespace-normal leading-snug">
                                  {opt.num}. {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                                </span>
                                {isSel && <span className="text-emerald-600 shrink-0 text-xs font-bold mt-0.5">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Untuk di rumah Ananda bisa... */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      4. Untuk di rumah Ananda bisa:
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'rumah' ? null : 'rumah')}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-slate-800 text-amber-950 dark:text-amber-200 text-xs sm:text-sm font-semibold shadow-xs hover:border-amber-400 cursor-pointer text-left"
                      >
                        <span className="line-clamp-2 leading-snug">
                          {selectedRumah
                            ? `${selectedRumah.num}. ${selectedRumah.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                            : "-- Pilih Rekomendasi di Rumah --"}
                        </span>
                        <Icons.chevronDown className={`w-4 h-4 text-amber-600 shrink-0 transition-transform duration-200 ${openDropdown === 'rumah' ? 'rotate-180' : ''}`} />
                      </button>

                      {openDropdown === 'rumah' && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 p-1.5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                          {defaultRumahOptions.map((opt) => {
                            const isSel = smartRumahId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSmartRumahId(opt.id);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                  isSel
                                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold"
                                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                }`}
                              >
                                <span className="break-words whitespace-normal leading-snug">{opt.num}. {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}</span>
                                {isSel && <span className="text-amber-600 shrink-0 text-xs font-bold mt-0.5">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Afirmasi Positif Catatan Guru */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      5. Afirmasi Positif (Catatan Guru):
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'afirmasi' ? null : 'afirmasi')}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50/50 dark:bg-slate-800 text-sky-950 dark:text-sky-200 text-xs sm:text-sm font-semibold shadow-xs hover:border-sky-400 cursor-pointer text-left"
                      >
                        <span className="line-clamp-2 leading-snug">
                          {selectedAfirmasi
                            ? `${selectedAfirmasi.num}. ${selectedAfirmasi.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                            : "-- Pilih Afirmasi Positif --"}
                        </span>
                        <Icons.chevronDown className={`w-4 h-4 text-sky-600 shrink-0 transition-transform duration-200 ${openDropdown === 'afirmasi' ? 'rotate-180' : ''}`} />
                      </button>

                      {openDropdown === 'afirmasi' && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-1.5 space-y-1 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                          {defaultAfirmasiOptions.map((opt) => {
                            const isSel = smartAfirmasiId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  handleAfirmasiChange(opt.id);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                  isSel
                                    ? "bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-extrabold"
                                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                }`}
                              >
                                <span className="break-words whitespace-normal leading-snug">
                                  {opt.num}. {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                                </span>
                                {isSel && <span className="text-sky-600 shrink-0 text-xs font-bold mt-0.5">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview & Generate Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex-1">
                      <span className="font-bold text-brand-600 dark:text-brand-400">Preview Afirmasi:</span> &quot;{activeAfirmasiText}&quot;
                    </div>
                    <button
                      type="button"
                      onClick={handleApplySmartAssessment}
                      className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>✨ Terapkan ke Form Laporan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Materi */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Materi yang Diajarkan (Bisa diisi manual atau otomatis terisi dari Generator Cepat)
              </label>
              <input
                type="text"
                value={materi}
                onChange={(e) => {
                  setMateri(e.target.value);
                  setSmartMateriText(e.target.value);
                }}
                placeholder="Cth: Berhitung 1-10, Mengenal huruf vokal"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Kegiatan */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Kegiatan di Kelas
                </label>
                <button
                  type="button"
                  onClick={addKegiatanItem}
                  className="text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-sky-900 flex items-center gap-1 bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Icons.add className="w-3.5 h-3.5" />
                  <span>Tambah Poin</span>
                </button>
              </div>
              <div className="space-y-2">
                {kegiatanItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sky-600 dark:text-sky-400 font-bold text-sm shrink-0 w-4 text-center">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleKegiatanChange(idx, e.target.value)}
                      placeholder={`Poin ${idx + 1}: Cth: Menulis angka 1-10`}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400"
                    />
                    {kegiatanItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKegiatanItem(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Hapus Poin"
                      >
                        <Icons.close className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Hasil Belajar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Hasil Belajar Anak
                </label>
                <button
                  type="button"
                  onClick={addHasilItem}
                  className="text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-sky-900 flex items-center gap-1 bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Icons.add className="w-3.5 h-3.5" />
                  <span>Tambah Poin</span>
                </button>
              </div>
              <div className="space-y-2">
                {hasilBelajarItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sky-600 dark:text-sky-400 font-bold text-sm shrink-0 w-4 text-center">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleHasilChange(idx, e.target.value)}
                      placeholder={`Poin ${idx + 1}: Cth: Sudah bisa menghitung 1-10`}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400"
                    />
                    {hasilBelajarItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHasilItem(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Hapus Poin"
                      >
                        <Icons.close className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SECTION 3: Catatan & Rekomendasi ── */}
          <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shrink-0">3</span>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">🏡 Rekomendasi di Rumah & ✍️ Catatan Guru</span>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                🏡 Rekomendasi Kegiatan di Rumah:
              </label>
              <input
                type="text"
                value={rekomendasiRumah}
                onChange={(e) => setRekomendasiRumah(e.target.value)}
                placeholder="Contoh: Untuk di rumah Ananda bisa mengulang materi hari ini"
                className="w-full px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ✍️ Catatan Guru untuk Orang Tua:
              </label>
              <textarea
                rows={2}
                value={catatanGuru}
                onChange={(e) => setCatatanGuru(e.target.value)}
                placeholder="Tuliskan apresiasi, saran, atau pesan untuk orang tua..."
                className="w-full px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* ── SECTION 4: Lampiran (Opsional) ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-500 text-white text-[11px] font-extrabold shrink-0">4</span>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">📎 Lampiran</span>
                <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
              </div>
            </div>

            {/* Upload File Foto ke Google Drive */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                📸 Upload Foto Hasil Belajar (Otomatis ke Google Drive):
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  id="gdrive-file-input"
                  className="hidden"
                  onChange={(e) => {
                    handleFileChange(e);
                    if (e.target.files?.[0]) {
                      handleUploadToGDrive(e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor="gdrive-file-input"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 shadow-xs active:scale-95"
                >
                  <Icons.add className="w-4 h-4 text-brand-600" />
                  <span>{selectedFile ? "📁 Ganti Foto..." : "📁 Pilih Foto dari HP / Laptop"}</span>
                </label>

                {isUploadingGDrive && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 animate-pulse">
                    <span className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Mengunggah ke Google Drive...</span>
                  </div>
                )}
              </div>

              {/* Preview Image */}
              {filePreviewUrl && (
                <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm max-w-[200px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreviewUrl} alt="Preview Lampiran" className="w-full h-32 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreviewUrl(null);
                      setGdriveLink("");
                    }}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md cursor-pointer"
                    title="Hapus Foto"
                  >
                    <Icons.close className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {uploadError && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-[11px] text-red-600 dark:text-red-400">
                  ⚠️ {uploadError}
                </div>
              )}
            </div>

            {/* Google Drive Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Link Google Drive (Otomatis terisi saat upload atau paste manual):</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">🟢 Free Tier Safe</span>
              </label>
              <input
                type="url"
                value={gdriveLink}
                onChange={(e) => setGdriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400 font-mono text-xs"
              />
              {fileId ? (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2">
                  <span className="truncate">✓ Format valid! ID: <strong>{fileId}</strong></span>
                  <a
                    href={getGDriveDirectLink(gdriveLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline shrink-0 hover:text-emerald-900"
                  >
                    Tes Unduh
                  </a>
                </div>
              ) : gdriveLink ? (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  ⚠️ Pastikan link bisa diakses publik.
                </p>
              ) : null}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? "Memproses..." : (isEditing ? "✓ Simpan Perubahan" : "✓ Simpan Laporan Perkembangan")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
