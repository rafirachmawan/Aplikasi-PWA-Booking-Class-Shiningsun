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
}

export function BirthdayListCollapsible() {
  const [expanded, setExpanded] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // State untuk collapsible sections
  const [expandedUpcoming, setExpandedUpcoming] = useState(true);
  const [expandedPast, setExpandedPast] = useState(true);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<{
    id: string;
    name: string;
    nickname?: string;
  } | null>(null);

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

  useEffect(() => {
    // Batch2 hemat (tanpa ubah logika/data): batalkan fetch lama saat ganti
    // bulan cepat agar tidak double-fetch balapan. Hasil akhir sama.
    const ctrl = new AbortController();
    const fetchBirthdayData = async () => {
      try {
        setLoading(true);
        setError(null);
        let url = "/api/birthday";
        if (selectedMonth) {
          url = `/api/birthday?month=${selectedMonth}`;
        }

        const response = await fetch(url, { signal: ctrl.signal });
        const result = await response.json();

        if (result.success && result.students) {
          const filteredStudents = [...result.students];
          const sortedStudents = filteredStudents.sort((a, b) => {
            const aDays = a.days_until_birthday ?? 999;
            const bDays = b.days_until_birthday ?? 999;
            return aDays - bDays;
          });
          setStudents(sortedStudents);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("❌ Error fetching birthday data:", err);
        setError(err.message || "Gagal mengambil data ulang tahun");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    };

    fetchBirthdayData();
    return () => ctrl.abort();
  }, [selectedMonth]);

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-xl p-2.5 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 shrink-0">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M12 8v13" />
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Daftar Ulang Tahun
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {students.length === 0
                ? "Tidak ada ultah bulan ini"
                : `Bulan ini: ${students.length} siswa`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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

      {expanded && (
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-zinc-800">
          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">
                Memuat data...
              </p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Tidak ada siswa yang punya ulang tahun bulan ini
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 pb-5 border-b border-slate-200 dark:border-zinc-800">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                      Filter Bulan
                    </label>
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

              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
                <h4 className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  {selectedMonth
                    ? monthNames[selectedMonth - 1]
                    : "Daftar Ulang Tahun"}
                </h4>
                <div className="flex items-center gap-2">
                  {selectedMonth && (
                    <button
                      onClick={() => setSelectedMonth(null)}
                      className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Hapus filter
                    </button>
                  )}
                  {students.some((s) => s.is_today_birthday) && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-lg">
                      Hari ini ada yang ultah
                    </span>
                  )}
                </div>
              </div>

              {/* Section: Akan Datang */}
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const upcomingStudents = students.filter((s) => {
                  const dob = new Date(s.date_of_birth);
                  const birthDate = new Date(
                    today.getFullYear(),
                    dob.getMonth(),
                    dob.getDate(),
                  );
                  const diff = Math.ceil(
                    (birthDate.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  return diff >= 0 && !s.is_today_birthday;
                });
                const todayBirthdays = students.filter(
                  (s) => s.is_today_birthday,
                );

                if (upcomingStudents.length > 0 || todayBirthdays.length > 0) {
                  return (
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden mb-4">
                      <button
                        onClick={() => setExpandedUpcoming(!expandedUpcoming)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm text-slate-800 dark:text-zinc-100 truncate">
                            Akan Datang
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                            {upcomingStudents.length} siswa
                          </span>
                          {todayBirthdays.length > 0 && (
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-lg">
                              {todayBirthdays.length} hari ini
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedUpcoming ? "rotate-180" : ""}`}
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
                      </button>

                      {expandedUpcoming && (
                        <div className="p-3 space-y-2.5 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
                          {todayBirthdays.map((student) => (
                            <div
                              key={student.id}
                              className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/50"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-400">
                                  {student.photo_url ? (
                                    <img
                                      src={student.photo_url}
                                      alt={student.name}
                                      loading="lazy"
                                      className="w-full h-full rounded-lg object-cover"
                                    />
                                  ) : (
                                    <span>
                                      {(student.nickname || student.name || "?").charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
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
                                        className="w-3 h-3 inline"
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
                                      {new Date(
                                        student.date_of_birth,
                                      ).getFullYear()}
                                    </span>
                                    {student.age && student.age > 0 && (
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
                                    <span className="hidden sm:inline">
                                      {" "}
                                      •{" "}
                                    </span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                      Hari ini
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedStudentForFeedback({
                                        id: student.id,
                                        name: student.name,
                                        nickname: student.nickname,
                                      });
                                      setFeedbackModalOpen(true);
                                    }}
                                    className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15 dark:hover:text-brand-300 active:translate-y-[1px] transition-colors cursor-pointer mt-2"
                                  >
                                    Riwayat
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {upcomingStudents.map((student, idx) => {
                            const dob = new Date(student.date_of_birth);
                            const birthDate = new Date(
                              today.getFullYear(),
                              dob.getMonth(),
                              dob.getDate(),
                            );
                            const willHaveBirthdaySoon = birthDate >= today;
                            return (
                              <div
                                key={student.id}
                                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-400">
                                    {student.photo_url ? (
                                      <img
                                        src={student.photo_url}
                                        alt={student.name}
                                        width={36}
                                        height={36}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full rounded-lg object-cover"
                                      />
                                    ) : (
                                      <span>
                                        {(student.nickname || student.name || "?").charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
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
                                          className="w-3 h-3 inline"
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
                                        {new Date(
                                          student.date_of_birth,
                                        ).toLocaleDateString("id-ID", {
                                          day: "numeric",
                                          month: "long",
                                          year: "numeric",
                                        })}
                                      </span>
                                      {student.age && student.age > 0 && (
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
                                      <span className="hidden sm:inline">
                                        {" "}
                                        •{" "}
                                      </span>
                                      {student.is_today_birthday ? (
                                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                          Hari ini
                                        </span>
                                      ) : (
                                        <span className="font-semibold text-brand-600 dark:text-brand-400">
                                          H-{student.days_until_birthday}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedStudentForFeedback({
                                          id: student.id,
                                          name: student.name,
                                          nickname: student.nickname,
                                        });
                                        setFeedbackModalOpen(true);
                                      }}
                                      className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15 dark:hover:text-brand-300 active:translate-y-[1px] transition-colors cursor-pointer mt-2"
                                    >
                                      Riwayat
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Section: Sudah Terlewat */}
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const pastStudents = students.filter((s) => {
                  const dob = new Date(s.date_of_birth);
                  const birthDate = new Date(
                    today.getFullYear(),
                    dob.getMonth(),
                    dob.getDate(),
                  );
                  const diff = Math.ceil(
                    (birthDate.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  return diff < 0;
                });

                if (pastStudents.length > 0) {
                  return (
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden mb-4">
                      <button
                        onClick={() => setExpandedPast(!expandedPast)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm text-slate-800 dark:text-zinc-100 truncate">
                            Sudah Terlewat
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                            {pastStudents.length} siswa
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedPast ? "rotate-180" : ""}`}
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
                      </button>

                      {expandedPast && (
                        <div className="p-3 space-y-2.5 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
                          {pastStudents.map((student) => {
                            const dob = new Date(student.date_of_birth);
                            const birthDate = new Date(
                              today.getFullYear(),
                              dob.getMonth(),
                              dob.getDate(),
                            );
                            const diffTime =
                              today.getTime() - birthDate.getTime();
                            const daysSincePast = Math.ceil(
                              diffTime / (1000 * 60 * 60 * 24),
                            );
                            return (
                              <div
                                key={student.id}
                                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-400">
                                    {student.photo_url ? (
                                      <img
                                        src={student.photo_url}
                                        alt={student.name}
                                        width={36}
                                        height={36}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full rounded-lg object-cover"
                                      />
                                    ) : (
                                      <span>
                                        {(student.nickname || student.name || "?").charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
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
                                          className="w-3 h-3 inline"
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
                                        {new Date(
                                          student.date_of_birth,
                                        ).toLocaleDateString("id-ID", {
                                          day: "numeric",
                                          month: "long",
                                          year: "numeric",
                                        })}
                                      </span>
                                      {student.age && student.age > 0 && (
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
                                      <span className="hidden sm:inline">
                                        {" "}
                                        •{" "}
                                      </span>
                                      {daysSincePast < 30 && (
                                        <span className="font-semibold text-slate-500 dark:text-zinc-400">
                                          {daysSincePast} hari yang lalu
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedStudentForFeedback({
                                          id: student.id,
                                          name: student.name,
                                          nickname: student.nickname,
                                        });
                                        setFeedbackModalOpen(true);
                                      }}
                                      className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15 dark:hover:text-brand-300 active:translate-y-[1px] transition-colors cursor-pointer mt-2"
                                    >
                                      Riwayat
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}
        </div>
      )}

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
    if (isOpen) loadFeedbacks();
  }, [isOpen]);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/student-feedback?student_id=${student.id}`,
      );
      const result = await response.json();
      if (result.success) {
        setFeedbacks(result.feedbacks || []);
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
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Riwayat Feedback</h3>
              <p className="font-semibold text-sm text-slate-700 dark:text-zinc-200 mt-1">{student.name}</p>
              {student.nickname && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 italic mt-0.5">
                  "{student.nickname}"
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors rounded-lg p-1.5 shrink-0"
              aria-label="Tutup modal"
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

        <div className="p-4 max-h-[60vh] overflow-y-auto scroll-smooth bg-slate-50 dark:bg-zinc-800/40">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent"></div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-3">Memuat...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
              <button
                onClick={loadFeedbacks}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 active:translate-y-[1px] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Belum Ada Feedback
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Pesan dari orang tua akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className={`p-4 rounded-xl border ${feedback.is_read ? "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700" : "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-800/50"}`}
                >
                  <div className="flex items-center justify-end mb-2">
                    {!feedback.is_read ? (
                      <span className="shrink-0 px-2 py-0.5 bg-brand-600 text-white text-[10px] font-bold rounded-lg">
                        Baru
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold rounded-lg">
                        Dibaca
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed">
                    {feedback.message}
                  </p>
                  <time
                    dateTime={new Date(feedback.submitted_at).toISOString()}
                    className="block text-xs text-slate-400 dark:text-zinc-500 mt-2"
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

        <div className="p-3 border-t border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 mb-2 px-1">
            <span className="font-medium">
              {feedbacks.filter((f) => !f.is_read).length} pesan belum dibaca
            </span>
            <span>Total {feedbacks.length} pesan</span>
          </div>
          <button
            onClick={() => {
              if (feedbacks.some((f) => !f.is_read)) loadFeedbacks();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
