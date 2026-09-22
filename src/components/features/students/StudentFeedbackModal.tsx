"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Feedback {
  id: string;
  message: string;
  submitted_at: string;
  parent_name: string;
  is_read: boolean;
}

interface StudentFeedbackModalProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentFeedbackModal({
  studentId,
  studentName,
  isOpen,
  onClose,
}: StudentFeedbackModalProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFeedbacks();
    }
  }, [isOpen]);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/student-feedback?student_id=${studentId}`,
      );
      const result = await response.json();

      if (result.success) {
        setFeedbacks(result.feedbacks || []);
      } else {
        console.error("Failed to load feedbacks:", result.error);
      }
    } catch (error) {
      console.error("Error loading feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-linear-to-r from-brand-500 to-brand-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Pesan dari Orang Tua</h3>
              <p className="text-sm text-brand-100 mt-1">
                {studentName} • Histori Feedback
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent"></div>
              <p className="text-sm text-slate-500 mt-3">Memuat pesan...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-sm text-slate-500">
                Belum ada pesan dari orang tua
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className={`p-4 rounded-xl border ${
                    feedback.is_read
                      ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      : "bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
                        OT
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {feedback.parent_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(feedback.submitted_at).toLocaleString(
                            "id-ID",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    {!feedback.is_read && (
                      <span className="px-2 py-0.5 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                        Baru
                      </span>
                    )}
                  </div>
                  <div className="pl-12">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {feedback.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
