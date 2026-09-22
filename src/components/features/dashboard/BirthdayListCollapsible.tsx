"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface Student {
  id: string;
  name: string;
  nickname?: string;
  date_of_birth: string;
  photo_url?: string;
  days_until_birthday?: number;
  is_today_birthday?: boolean;
  age?: number;
  label?: {
    main_level?: string;
    sub_level?: string;
    hex_color?: string;
  };
}

export function BirthdayListCollapsible() {
  const [expanded, setExpanded] = useState(false); // Default closed
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = all

  // State for viewing feedback history
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<{
    id: string;
    name: string;
    nickname?: string;
  } | null>(null);

  // Bulan dalam Bahasa Indonesia
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Fetch birthday data on mount and when filters change
  useEffect(() => {
    const fetchBirthdayData = async () => {
      try {
        setLoading(true);

        let url = "/api/birthday";

        if (selectedMonth) {
          url = `/api/birthday?month=${selectedMonth}`;
        }

        console.log(`🔍 Fetching birthday data from: ${url}`);

        const response = await fetch(url);
        const result = await response.json();

        console.log(
          `📊 API Response: success=${result.success}, count=${result.students?.length || 0}`,
        );

        if (result.success && result.students) {
          console.log(
            ` Students returned:`,
            result.students.map((s: any) => `${s.name} (${s.date_of_birth})`),
          );

          // Check if Rafi is in the list
          const rafi = result.students.find((s: any) =>
            s.name.toLowerCase().includes("rafi"),
          );
          if (rafi) {
            console.log(
              `✅ Rafi found in list! DOB: ${rafi.date_of_birth}, DaysUntil: ${rafi.days_until_birthday}, is_today: ${rafi.is_today_birthday}`,
            );
          } else {
            console.warn(`⚠️ Rafi NOT found in birthday list`);
          }
        }

        const filteredStudents =
          result.success && result.students ? [...result.students] : [];

        setStudents(filteredStudents);
      } catch (err: any) {
        console.error("❌ Error fetching birthday data:", err);
        setError(err.message || "Gagal mengambil data ulang tahun");
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdayData();
  }, [selectedMonth]);

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 sm:p-5 bg-linear-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2 bg-white/15 backdrop-blur-sm">
            <span className="text-xl">🎂</span>
          </div>
          <div className="text-left">
            <h3 className="text-base font-bold text-white">
              Daftar Ulang Tahun
            </h3>
            <p className="text-xs text-brand-100 opacity-90">
              {students.length === 0
                ? "Tidak ada ultah bulan ini"
                : `Bulan ini: ${students.length} siswa`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-xs text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
              Klik untuk expand
            </span>
          )}
          <svg
            className={`w-5 h-5 text-white transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Collapsible Content */}
      {expanded && (
        <div className="p-4 sm:p-5 border-t border-brand-500/20 animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Memuat data...
              </p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <div className="text-3xl mb-2">❌</div>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tidak ada siswa yang punya ulang tahun bulan ini
              </p>
            </div>
          ) : (
            <>
              {/* Filter Controls */}
              <div className="mb-6 pb-5 border-b border-slate-100 dark:border-slate-800">
                {/* Month Filter - Responsive & User-Friendly */}
                <div className="space-y-3">
                  {/* Label */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span className="text-base">📅</span>
                      Filter Bulan:
                    </label>

                    {/* Dropdown Container */}
                    <div className="relative">
                      <select
                        value={selectedMonth || ""}
                        onChange={(e) =>
                          setSelectedMonth(
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full appearance-none rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 pr-8 text-xs font-medium text-slate-900 dark:text-white shadow-sm hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
                      >
                        <option value="" className="text-slate-500">
                          Semua Bulan
                        </option>
                        {monthNames.map((name, idx) => (
                          <option
                            key={name}
                            value={idx + 1}
                            className="text-slate-700 dark:text-slate-200"
                          >
                            {name}
                          </option>
                        ))}
                      </select>

                      {/* Custom Arrow Icon */}
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                        <svg
                          className="w-4 h-4 text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Selected Month Display */}
                  {selectedMonth && (
                    <div className="flex items-center justify-between pt-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Bulan terpilih: {monthNames[selectedMonth - 1]}
                      </span>
                      <button
                        onClick={() => setSelectedMonth(null)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Hapus Filter Bulan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Header Info */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  {selectedMonth
                    ? `📅 ${monthNames[selectedMonth - 1]}`
                    : `📅 Daftar Ulang Tahun`}
                </h4>
                {selectedMonth && (
                  <button
                    onClick={() => {
                      setSelectedMonth(null);
                    }}
                    className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Hapus Filter Bulan
                  </button>
                )}
                {students.some((s) => s.is_today_birthday) && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    🔥 Hari Ini!
                  </span>
                )}
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar">
                {students.map((student, idx) => {
                  const dob = new Date(student.date_of_birth);
                  const birthDay = dob.getDate();
                  const birthMonth = monthNames[dob.getMonth()];

                  return (
                    <div
                      key={student.id}
                      className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                        student.is_today_birthday
                          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50"
                          : idx === 0
                            ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          {student.photo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={student.photo_url}
                              alt={student.name}
                              className="w-full h-full rounded-lg object-cover"
                            />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white text-sm break-words">
                                {student.name}
                                {student.nickname && (
                                  <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">
                                    ("{student.nickname}")
                                  </span>
                                )}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-0.5">
                                  <svg
                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  {birthDay} {birthMonth}
                                </span>
                                {student.age !== undefined &&
                                  student.age > 0 && (
                                    <>
                                      <span className="hidden sm:inline">
                                        {" "}
                                        •{" "}
                                      </span>
                                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                                        Umur {student.age} tahun
                                      </span>
                                    </>
                                  )}
                                {!student.is_today_birthday && (
                                  <>
                                    <span className="hidden sm:inline">
                                      {" "}
                                      •{" "}
                                    </span>
                                    <span className="font-semibold text-brand-600 dark:text-brand-400">
                                      H-{student.days_until_birthday}
                                    </span>
                                  </>
                                )}
                                {student.is_today_birthday && (
                                  <>
                                    <span className="hidden sm:inline">
                                      {" "}
                                      •{" "}
                                    </span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">
                                      Hari Ini!
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Button Lihat Feedback */}
                          <button
                            onClick={() => {
                              setSelectedStudentForFeedback({
                                id: student.id,
                                name: student.name,
                                nickname: student.nickname,
                              });
                              setFeedbackModalOpen(true);
                            }}
                            className="shrink-0 inline-flex items-center gap-1 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-95 px-2 py-1 rounded-md text-[10px] font-bold text-white transition-all shadow-sm"
                          >
                            📋 Riwayat
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Feedback - View History */}
      {feedbackModalOpen && selectedStudentForFeedback && (
        <FeedbackHistoryModal
          student={{
            id: selectedStudentForFeedback.id,
            name: selectedStudentForFeedback.name,
            nickname: selectedStudentForFeedback.nickname,
          }}
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
        />
      )}
    </div>
  );
}

// Sub-component untuk modal feedback history
function FeedbackHistoryModal({
  student,
  isOpen,
  onClose,
}: {
  student: { id: string; name: string; nickname?: string };
  isOpen: boolean;
  onClose: () => void;
}) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFeedbacks();
    }
  }, [isOpen]);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        "[FeedbackClient] Loading feedbacks for student_id:",
        student.id,
      );

      const response = await fetch(
        `/api/student-feedback?student_id=${student.id}`,
      );

      console.log("[FeedbackClient] Response status:", response.status);

      const result = await response.json();

      console.log(
        "[FeedbackClient] API response:",
        JSON.stringify(result, null, 2),
      );

      if (result.success) {
        setFeedbacks(result.feedbacks || []);
        console.log(
          "[FeedbackClient] Feedback count:",
          result.feedbacks?.length || 0,
        );
      } else {
        throw new Error(result.error || "Gagal memuat data");
      }
    } catch (err: any) {
      console.error("Error loading feedbacks:", err);
      setError(err.message || "Gagal memuat data feedback");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">📋 Feedback History</h3>
              <p className="font-semibold text-white/95">{student.name}</p>
              {student.nickname && (
                <p className="text-sm text-blue-100 italic mt-0.5">
                  "{student.nickname}"
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/20 transition-all rounded-lg p-1.5"
              aria-label="Close modal"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto scroll-smooth bg-slate-50 dark:bg-slate-900/50">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              <p className="text-xs text-slate-500 mt-3">Memuat...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
              <button
                onClick={loadFeedbacks}
                className="mt-3 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3 opacity-40">📬</div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Belum Ada Feedback
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pesan dari orang tua akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((feedback, index) => (
                <div
                  key={feedback.id}
                  className={`p-4 rounded-xl border transition-all duration-150 ${
                    feedback.is_read
                      ? "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                      : "bg-linear-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm"
                  }`}
                >
                  {/* Status Badge - Right Aligned */}
                  <div className="flex items-center justify-end mb-2">
                    {!feedback.is_read ? (
                      <span className="shrink-0 px-2 py-0.5 bg-yellow-400 text-slate-900 text-[10px] font-bold uppercase tracking-wide rounded-full animate-pulse">
                        Baru
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold uppercase tracking-wide rounded-full">
                        Dibaca
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {feedback.message}
                  </p>

                  {/* Timestamp */}
                  <time
                    dateTime={new Date(feedback.submitted_at).toISOString()}
                    className="block text-xs text-slate-400 dark:text-slate-500 mt-2"
                  >
                    {new Date(feedback.submitted_at).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-2 px-1">
            <span className="font-medium">
              {feedbacks.filter((f) => !f.is_read).length} pesan belum dibaca
            </span>
            <span>Total {feedbacks.length} pesan</span>
          </div>
          <button
            onClick={() => {
              if (feedbacks.some((f) => !f.is_read)) {
                loadFeedbacks();
              }
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Tutup & Tandai Sudah Dibaca
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
