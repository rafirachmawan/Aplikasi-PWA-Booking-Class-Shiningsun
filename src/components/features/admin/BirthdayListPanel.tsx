"use client";

import { useEffect, useState } from "react";

interface Student {
  id: string;
  name: string;
  nickname?: string;
  date_of_birth: string;
  photo_url?: string;
  days_until_birthday?: number;
  is_today_birthday?: boolean;
  age?: number;
  branch?: {
    name?: string;
  };
  label?: {
    main_level?: string;
    sub_level?: string;
    hex_color?: string;
  };
}

interface BirthdayListPanelProps {
  initialMonth?: number;
  initialDayFilter?: number[];
}

export function BirthdayListPanel({
  initialMonth = new Date().getMonth() + 1,
  initialDayFilter = [],
}: BirthdayListPanelProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDays, setSelectedDays] = useState<number[]>(initialDayFilter);
  const [sortByProximity, setSortByProximity] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Fetch data dari API
  const fetchBirthdayData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
      });

      if (selectedDays.length > 0) {
        // Jika ada filter tanggal, ambil semua tanggal yang dipilih satu per satu
        const allStudents: Student[] = [];

        for (const day of selectedDays) {
          params.set("day", day.toString());
          const response = await fetch(`/api/birthday?${params.toString()}`);
          const result = await response.json();

          if (result.success && result.students) {
            allStudents.push(...result.students);
          }
        }

        // Remove duplicates by ID
        const uniqueStudents = Array.from(
          new Map(allStudents.map((s) => [s.id, s])).values(),
        );

        // Sort by proximity if enabled
        if (sortByProximity) {
          uniqueStudents.sort(
            (a, b) => a.days_until_birthday! - b.days_until_birthday!,
          );
        }

        setStudents(uniqueStudents);
      } else {
        // Tampilkan semua tanggal di bulan yang dipilih
        const response = await fetch(`/api/birthday?${params.toString()}`);
        const result = await response.json();

        if (result.success && result.students) {
          let filtered = result.students;

          // Filter by proximity
          if (sortByProximity) {
            filtered = filtered.sort(
              (a: Student, b: Student) =>
                a.days_until_birthday! - b.days_until_birthday!,
            );
          }

          setStudents(filtered);
        } else {
          setStudents([]);
          setError(result.error || "Gagal mengambil data");
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengambil data");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdayData();
  }, [selectedMonth, selectedDays, sortByProximity]);

  // Toggle filter tanggal
  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  // Clear filter
  const clearFilter = () => {
    setSelectedDays([]);
  };

  // Apply filter
  const applyFilter = () => {
    if (selectedDays.length === 0) {
      setSelectedDays(Array.from({ length: 31 }, (_, i) => i + 1));
    }
    fetchBirthdayData();
  };

  // Search filtering
  const filteredStudents = students.filter((student) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const fullName = `${student.name} ${student.nickname || ""}`.toLowerCase();
    return fullName.includes(query);
  });

  // Get color for level badge
  const getLevelColor = (level?: string) => {
    return level ? `background-color: ${level}; opacity: 0.85;` : "";
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-brand-600 to-brand-700 px-4 py-4 sm:px-6">
        <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
          🎂 Daftar Ulang Tahun
          <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">
            {filteredStudents.length} siswa
          </span>
        </h3>
      </div>

      {/* Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Cari nama siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        {/* Month Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Bulan:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Day Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Tanggal:
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={clearFilter}
                className="text-[10px] font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Hapus
              </button>
              <button
                onClick={applyFilter}
                className="text-[10px] font-bold bg-brand-600 text-white px-2 py-1 rounded-lg hover:bg-brand-700"
              >
                Terapkan
              </button>
            </div>
          </div>

          {/* Checkboxes for days 1-31 */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`w-7 h-7 text-[10px] font-bold rounded-lg transition-all ${
                  selectedDays.includes(day)
                    ? "bg-brand-600 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Toggle */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Urutkan:
          </label>
          <button
            onClick={() => setSortByProximity(!sortByProximity)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              sortByProximity
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {sortByProximity ? "🏆 Paling Dekat" : "📅 Semua"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Memuat data...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-12 text-center">
          <div className="text-3xl mb-2">❌</div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredStudents.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada siswa dengan kriteria yang dipilih
          </p>
        </div>
      )}

      {/* Student List */}
      {!loading && !error && filteredStudents.length > 0 && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
          {filteredStudents.map((student, idx) => {
            const dob = new Date(student.date_of_birth);
            const birthDay = dob.getDate();
            const birthMonth = monthNames[dob.getMonth()];

            return (
              <div
                key={student.id}
                className={`p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  student.is_today_birthday
                    ? "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500"
                    : "border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Photo / Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0 relative">
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

                    {student.is_today_birthday && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-sm">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {student.name}
                            {student.nickname && (
                              <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">
                                ("{student.nickname}")
                              </span>
                            )}
                          </h4>

                          {student.is_today_birthday && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              🎂 Hari Ini ({birthDay} {birthMonth})
                            </span>
                          )}

                          {!student.is_today_birthday && (
                            <span className="inline-flex items-center gap-1 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                              ⏳ H-{student.days_until_birthday}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>
                            📅 {birthDay} {birthMonth}
                          </span>
                          <span>•</span>
                          <span>🎂 {student.age} thn</span>

                          {student.label && student.label.hex_color && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: student.label.hex_color,
                                  }}
                                />
                                <span>{student.label.main_level}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Rank indicator if sorted by proximity */}
                      {sortByProximity &&
                        idx === 0 &&
                        filteredStudents.some((s) => s.is_today_birthday) && (
                          <div className="text-right shrink-0">
                            <div className="text-2xl">🏆</div>
                            <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                              Terdekat
                            </div>
                          </div>
                        )}
                    </div>
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
