"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { createWorksheet, updateWorksheet } from "@/lib/actions";
import { getGDrivePreviewLink, getGDriveDirectLink, extractGDriveFileId } from "@/lib/gdriveUtils";
import { getTodayISO } from "@/lib/dateUtils";

interface WorksheetFormModalProps {
  students: any[];
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
  
  // Dynamic bullet list items for Kegiatan & Hasil Belajar
  const [kegiatanItems, setKegiatanItems] = useState<string[]>(() =>
    parseBulletList(initialData?.kegiatan)
  );
  const [hasilBelajarItems, setHasilBelajarItems] = useState<string[]>(() =>
    parseBulletList(initialData?.hasil_belajar)
  );

  const [catatanGuru, setCatatanGuru] = useState(initialData?.catatan_guru || '');
  const [ttdGuru, setTtdGuru] = useState(initialData?.ttd_guru || '');
  const [bulanKe, setBulanKe] = useState(initialData?.bulan_ke?.toString() || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeStudent = students.find((s) => s.id === studentId || s.id === initialData?.student_id) || initialData?.student;
  const activeStudentName = activeStudent?.name || initialData?.student_name || "Siswa";

  const fileId = extractGDriveFileId(gdriveLink);

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
    const finalTitle = title.trim() || materi.trim() || "Lembar Perkembangan";
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
      setErrorMsg(err.message || "Gagal menyimpan lembar kerja.");
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
                {isEditing ? "Edit Lembar Perkembangan" : "Tambah Lembar Perkembangan"}
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
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Siswa <span className="text-red-500">*</span>
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="" disabled>-- Pilih Siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.nickname ? `(${s.nickname})` : ''} - {s.label ? `${s.label.main_level} ${s.label.sub_level}` : 'Tanpa Level'}
                    </option>
                  ))}
                </select>
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
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bulan Ke
                </label>
                <select
                  value={bulanKe}
                  onChange={(e) => setBulanKe(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">-- Pilih --</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                    <option key={m} value={m}>Bulan ke-{m}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Guru
                </label>
                <input
                  type="text"
                  value={ttdGuru}
                  onChange={(e) => setTtdGuru(e.target.value)}
                  placeholder="Cth: Miss Sarah"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Data Perkembangan ── */}
          <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-extrabold shrink-0">2</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">📋 Data Perkembangan Anak</span>
            </div>

            {/* Materi */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Materi yang Diajarkan
              </label>
              <input
                type="text"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
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

          {/* ── SECTION 3: Catatan Guru ── */}
          <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shrink-0">3</span>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">✍️ Catatan Guru untuk Orang Tua</span>
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 -mt-1">
              Pesan ini akan terlihat oleh orang tua di portal mereka.
            </p>
            <textarea
              rows={3}
              value={catatanGuru}
              onChange={(e) => setCatatanGuru(e.target.value)}
              placeholder="Tuliskan apresiasi, saran, atau pesan untuk orang tua..."
              className="w-full px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
            />
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

            {/* Google Drive Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Link Google Drive</span>
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

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Catatan Tambahan (Internal)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan internal guru, tidak terlihat orang tua..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
              />
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
              {isSubmitting ? "Memproses..." : (isEditing ? "✓ Simpan Perubahan" : "✓ Simpan Lembar Kerja")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
