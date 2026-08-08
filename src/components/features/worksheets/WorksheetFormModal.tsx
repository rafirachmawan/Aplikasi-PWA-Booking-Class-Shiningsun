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

export function WorksheetFormModal({
  students,
  initialData,
  onClose,
  onSuccess,
}: WorksheetFormModalProps) {
  const isEditing = !!initialData;
  const [studentId, setStudentId] = useState(initialData?.student_id || (students[0]?.id || ''));
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [worksheetDate, setWorksheetDate] = useState(initialData?.worksheet_date || getTodayISO());
  const [gdriveLink, setGdriveLink] = useState(initialData?.gdrive_link || '');
  const [materi, setMateri] = useState(initialData?.materi || '');
  const [kegiatan, setKegiatan] = useState(initialData?.kegiatan || '');
  const [hasilBelajar, setHasilBelajar] = useState(initialData?.hasil_belajar || '');
  const [catatanGuru, setCatatanGuru] = useState(initialData?.catatan_guru || '');
  const [ttdGuru, setTtdGuru] = useState(initialData?.ttd_guru || '');
  const [bulanKe, setBulanKe] = useState(initialData?.bulan_ke?.toString() || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileId = extractGDriveFileId(gdriveLink);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || materi.trim() || "Lembar Perkembangan";
    if (!isEditing && !studentId) {
      setErrorMsg("Pilih siswa terlebih dahulu.");
      return;
    }

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
      formData.append('kegiatan', kegiatan.trim());
      formData.append('hasil_belajar', hasilBelajar.trim());
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
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Icons.edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Lembar Perkembangan" : "Tambah Lembar Perkembangan"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catat materi, kegiatan, hasil belajar, dan catatan guru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
              {errorMsg}
            </div>
          )}

          {/* Row 1: Student + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Selector */}
            {!isEditing ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Siswa <span className="text-red-500">*</span>
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                Siswa: <span className="font-bold text-brand-600 dark:text-brand-400 ml-1">{initialData?.student?.name || 'Siswa'}</span>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Hari / Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={worksheetDate}
                onChange={(e) => setWorksheetDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Bulan Ke + TTD Guru */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Bulan Ke
              </label>
              <select
                value={bulanKe}
                onChange={(e) => setBulanKe(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">-- Pilih Bulan --</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <option key={m} value={m}>Bulan ke-{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                TTD Guru (Nama Guru)
              </label>
              <input
                type="text"
                value={ttdGuru}
                onChange={(e) => setTtdGuru(e.target.value)}
                placeholder="Contoh: Miss Sarah"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Judul Lembar Kerja <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Lembar Kerja - Modul 1 Montessori"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Separator - Kolom Perkembangan */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">📋 Data Perkembangan</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
          </div>

          {/* Materi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Materi
            </label>
            <input
              type="text"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Contoh: Berhitung 1-10, Mengenal huruf vokal"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Kegiatan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Kegiatan
            </label>
            <textarea
              rows={2}
              value={kegiatan}
              onChange={(e) => setKegiatan(e.target.value)}
              placeholder="Contoh: Menulis angka, membaca kata sederhana, bermain puzzle"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Hasil Belajar */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Hasil Belajar
            </label>
            <textarea
              rows={2}
              value={hasilBelajar}
              onChange={(e) => setHasilBelajar(e.target.value)}
              placeholder="Contoh: Sudah bisa menghitung 1-10 dengan benar, masih perlu latihan menulis huruf 'R'"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Catatan Guru - Highlighted */}
          <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
              ✍️ Catatan Guru untuk Siswa / Orang Tua
            </label>
            <textarea
              rows={3}
              value={catatanGuru}
              onChange={(e) => setCatatanGuru(e.target.value)}
              placeholder="Tuliskan pesan, apresiasi, atau saran untuk orang tua terkait perkembangan anak..."
              className="w-full px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Deskripsi Umum (Opsional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan internal guru atau informasi tambahan..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Google Drive Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Link Google Drive File</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">🟢 Free Tier Safe</span>
            </label>
            <input
              type="url"
              value={gdriveLink}
              onChange={(e) => setGdriveLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/.../view"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400 font-mono text-xs"
            />
            {fileId ? (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2">
                <span className="truncate">✓ Format valid! ID File: <strong>{fileId}</strong></span>
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
                ⚠️ Pastikan link bisa diakses publik ("Siapa saja yang memiliki link").
              </p>
            ) : null}
          </div>

          {/* Submit Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Memproses..." : (isEditing ? "Simpan Perubahan" : "Tambah Lembar Kerja")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
