"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { updateStudentLabel } from "@/lib/actions";
import { WorksheetFormModal } from "@/components/features/worksheets/WorksheetFormModal";

interface Label {
  id: string;
  main_level: string;
  sub_level: string;
  hex_color: string;
}

interface ChangeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    nickname?: string;
    label_id?: string | null;
    label?: Label | null;
  } | null;
  labels: Label[];
  onSuccess: () => void;
}

export function ChangeLabelModal({
  isOpen,
  onClose,
  student,
  labels,
  onSuccess,
}: ChangeLabelModalProps) {
  const router = useRouter();
  const [selectedLabelId, setSelectedLabelId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Worksheet Modal state
  const [isWorksheetModalOpen, setIsWorksheetModalOpen] = useState(false);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [worksheetsList, setWorksheetsList] = useState<any[]>([]);
  const [isLoadingWorksheetData, setIsLoadingWorksheetData] = useState(false);

  useEffect(() => {
    if (student) {
      const labelObj = Array.isArray(student.label)
        ? student.label[0]
        : student.label;
      const currentId = student.label_id || labelObj?.id || "";
      setSelectedLabelId(currentId);
      setIsDropdownOpen(false);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const studentLabelObj = Array.isArray(student.label)
    ? student.label[0]
    : student.label;
  const selectedLabel =
    labels.find((l) => l.id === selectedLabelId) ||
    (selectedLabelId &&
    (selectedLabelId === student.label_id ||
      selectedLabelId === studentLabelObj?.id)
      ? studentLabelObj
      : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError("");
    try {
      await updateStudentLabel(student.id, selectedLabelId || null);
      onSuccess();
      onClose();
    } catch (error: any) {
      setModalError(
        "Gagal mengubah level siswa: " +
          (error?.message || "Terjadi kesalahan."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenWorksheet = async () => {
    setIsLoadingWorksheetData(true);
    try {
      const { getTeachers, getAssessmentTemplates, getWorksheetsByStudent } =
        await import("@/lib/actions");
      const [tchs, tpls, ws] = await Promise.all([
        teachersList.length === 0
          ? getTeachers()
          : Promise.resolve(teachersList),
        templatesList.length === 0
          ? getAssessmentTemplates()
          : Promise.resolve(templatesList),
        // Selalu ambil riwayat terbaru agar auto-hitung "bulan ke" sama dengan halaman worksheets
        getWorksheetsByStudent(student.id),
      ]);
      setTeachersList(tchs);
      setTemplatesList(tpls);
      setWorksheetsList(ws);
    } catch (err) {
      console.error("Gagal mengambil data pendukung laporan:", err);
    } finally {
      setIsLoadingWorksheetData(false);
      setIsWorksheetModalOpen(true);
    }
  };

  return (
    <>
      {isSubmitting && <LoadingSpinner usePortal={true} />}
      {isLoadingWorksheetData && <LoadingSpinner usePortal={true} />}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-600 dark:text-brand-400">
                <Icons.edit className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ganti Level Siswa
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-11 min-w-11 flex items-center justify-center"
            >
              <Icons.close className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-300">
                ⚠️ {modalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Siswa
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Icons.users className="w-4 h-4 text-brand-500 shrink-0" />
                  <span className="truncate">
                    {student.nickname || student.name}
                  </span>
                  {student.name && student.nickname && (
                    <span className="text-xs font-normal text-slate-400 truncate">
                      ({student.name})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Collapsible Level Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Level / Kelas Baru
              </label>

              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-11.5 ${
                  isDropdownOpen
                    ? "border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-slate-900"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{
                      backgroundColor: selectedLabel?.hex_color || "#94a3b8",
                    }}
                  />
                  <span className="truncate text-slate-800 dark:text-slate-100">
                    {selectedLabel
                      ? `${selectedLabel.main_level} - ${selectedLabel.sub_level}`
                      : "-- Tanpa Level --"}
                  </span>
                </div>
                <Icons.chevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? "rotate-180 text-brand-500" : ""
                  }`}
                />
              </button>

              {/* Collapsible Options List */}
              {isDropdownOpen && (
                <div className="mt-2 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-2 space-y-1 max-h-47.5 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLabelId("");
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedLabelId === ""
                        ? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold border border-brand-200/60 dark:border-brand-800/40"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                      -- Tanpa Level --
                    </span>
                    {selectedLabelId === "" && (
                      <Icons.check className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    )}
                  </button>

                  {labels.map((lbl) => {
                    const isSelected = selectedLabelId === lbl.id;
                    return (
                      <button
                        key={lbl.id}
                        type="button"
                        onClick={() => {
                          setSelectedLabelId(lbl.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold border border-brand-200/60 dark:border-brand-800/40"
                            : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: lbl.hex_color }}
                          />
                          <span className="truncate">
                            {lbl.main_level} - {lbl.sub_level}
                          </span>
                        </span>
                        {isSelected && (
                          <Icons.check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions: Fill & View Progress Report */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleOpenWorksheet}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-bold text-xs transition-all cursor-pointer shadow-xs min-h-11"
              >
                <Icons.edit className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Isi Laporan Perkembangan Siswa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  router.push(`/worksheets?student_id=${student.id}`);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 font-bold text-xs transition-all cursor-pointer shadow-xs min-h-11"
              >
                <Icons.fileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Lihat Perkembangan Siswa</span>
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-11"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 text-xs font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 min-h-11"
              >
                Simpan Level
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Worksheet Form Modal for filling progress report directly */}
      {isWorksheetModalOpen && (
        <WorksheetFormModal
          students={[
            {
              id: student.id,
              name: student.name,
              nickname: student.nickname,
              label: student.label,
            },
          ]}
          teachers={teachersList}
          templates={templatesList}
          labels={labels}
          initialData={{ student_id: student.id }}
          worksheets={worksheetsList}
          onClose={() => setIsWorksheetModalOpen(false)}
          onSuccess={() => {
            setIsWorksheetModalOpen(false);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
