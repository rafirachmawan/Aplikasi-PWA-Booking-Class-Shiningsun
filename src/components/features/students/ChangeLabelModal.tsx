"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { updateStudentLabel } from "@/lib/actions";

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
  const [selectedLabelId, setSelectedLabelId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setSelectedLabelId(student.label_id || student.label?.id || "");
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateStudentLabel(student.id, selectedLabelId || null);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Gagal mengubah level siswa: " + (error?.message || error));
    } finally {
      setIsSubmitting(false);
    }
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
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Icons.close className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Siswa
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icons.users className="w-4 h-4 text-brand-500" />
                <span>{student.nickname || student.name}</span>
                {student.name && student.nickname && (
                  <span className="text-xs font-normal text-slate-400">({student.name})</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Level / Kelas Baru
              </label>
              
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedLabelId("")}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium border transition-all ${
                    selectedLabelId === ""
                      ? "border-brand-500 bg-brand-50/70 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 font-bold ring-1 ring-brand-500"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                      onClick={() => setSelectedLabelId(lbl.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? "border-brand-500 bg-brand-50/70 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 font-bold ring-1 ring-brand-500"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: lbl.hex_color }}
                        ></span>
                        <span>
                          {lbl.main_level} - {lbl.sub_level}
                        </span>
                      </span>
                      {isSelected && (
                        <Icons.check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Simpan Level
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
