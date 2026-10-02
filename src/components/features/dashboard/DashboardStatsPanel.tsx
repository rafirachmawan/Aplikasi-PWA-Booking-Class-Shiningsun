"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { WorksheetFormModal } from "@/components/features/worksheets/WorksheetFormModal";
import {
  getStudentsByStatusWithSchedules,
  getClassesWithSchedules,
  getOverdueWorksheets,
} from "@/lib/actions";
import {
  formatShortDate,
  getIndonesianMonthYearName as getMonthName,
  getTodayISO,
} from "@/lib/dateUtils";

type TabType = "REGISTERED" | "CG" | "CLASSES" | "OVERDUE_WORKSHEETS";

type StatItem = {
  name: string;
  value: string;
  subValue?: string;
  iconName: string;
  statusFilter?: TabType;
};

const iconMap: Record<string, any> = {
  users: Icons.users,
  sun: Icons.sun,
  calendar: Icons.calendar,
  "alert-circle": Icons.alertCircle,
};

// Warna header panel detail per-tab — presentasi saja, selaras hero Hallo (solid, tanpa gradient).
// Logika activeTab / fetch / filter / sort tidak berubah.
const panelThemeByTab: Record<
  TabType,
  { outer: string; header: string; divider: string }
> = {
  REGISTERED: {
    outer: "border-brand-700/30",
    header: "bg-brand-600",
    divider: "border-white/20",
  },
  CG: {
    outer: "border-amber-800/30",
    header: "bg-amber-700",
    divider: "border-white/20",
  },
  OVERDUE_WORKSHEETS: {
    outer: "border-red-700/30",
    header: "bg-red-600",
    divider: "border-white/20",
  },
  CLASSES: {
    outer: "border-brand-700/30",
    header: "bg-brand-600",
    divider: "border-white/20",
  },
};

export function DashboardStatsCards({
  stats,
  activeTab,
  onCardClick,
}: {
  stats: StatItem[];
  activeTab: TabType | null;
  onCardClick: (stat: StatItem) => void;
}) {
  return (
    <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {stats.map((item) => {
        const IconComponent = iconMap[item.iconName] || Icons.users;
        const isClickable = !!item.statusFilter;
        const isActive = activeTab === item.statusFilter;

        // Satu warna selaras (biru brand) untuk semua kartu — presentasi
        // saja, selaras hero. Logika klik/aktif tidak berubah.
        const theme = {
          topBar: "bg-brand-500 dark:bg-brand-400",
          iconIdle:
            "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/20",
          iconActive:
            "bg-brand-600 text-white ring-brand-600 dark:ring-brand-500",
          cardIdle:
            "bg-brand-50/40 hover:bg-brand-50 dark:bg-brand-500/[0.06] dark:hover:bg-brand-500/[0.10]",
          cardActive:
            "bg-brand-50 dark:bg-brand-500/[0.13] ring-1 ring-inset ring-brand-200 dark:ring-brand-500/30",
          detailIdle:
            "text-slate-500 dark:text-zinc-400 group-hover:text-brand-600 dark:group-hover:text-brand-400",
          detailActive: "text-brand-700 dark:text-brand-300",
          chevronActive: "text-brand-600 dark:text-brand-400",
          focus: "focus-visible:outline-brand-600",
        };

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onCardClick(item)}
            disabled={!isClickable}
            className={`group relative p-3 sm:p-5 transition-colors duration-200 flex flex-col justify-between min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${theme.focus} ${
              isActive ? theme.cardActive : theme.cardIdle
            } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] ${theme.topBar}`}
            />
            <div className="flex flex-col items-start gap-1.5 mb-1.5 min-w-0">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                  isActive ? theme.iconActive : theme.iconIdle
                }`}
              >
                <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
              <dt className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-200 leading-snug line-clamp-2 min-h-8 sm:min-h-9">
                {item.name}
              </dt>
            </div>

            <dd className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                {item.value}
              </span>
              {/* Show "X sesi" message for CG */}
              {item.statusFilter === "CG" && (
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold ring-1 ring-inset bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/20 leading-tight">
                    {item.subValue ? (
                      <span>{item.subValue}</span>
                    ) : (
                      <span>0 sesi</span>
                    )}
                  </span>
                </div>
              )}
            </dd>

            {isClickable && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={`text-[10px] sm:text-[11px] font-bold ${
                    isActive ? theme.detailActive : theme.detailIdle
                  }`}
                >
                  {isActive ? "Tutup Detail" : "Lihat Detail"}
                </span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${isActive ? `rotate-180 ${theme.chevronActive}` : "text-slate-500 dark:text-zinc-400"} `}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardStatsPanel({ stats }: { stats: StatItem[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"label" | "name">("label");
  const [cgFilter, setCgFilter] = useState<"ALL" | "UPCOMING" | "PASSED">(
    "ALL",
  );
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [currentBranchId, setCurrentBranchId] = useState<string>(""); // Add branch state

  // Overdue worksheet modal state
  const [overdueStudent, setOverdueStudent] = useState<any | null>(null);
  const [missedDate, setMissedDate] = useState<string>("");
  const [missedTime, setMissedTime] = useState<string>("");
  const [className, setClassName] = useState<string>("");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [successToast, setSuccessToast] = useState("");
  // Riwayat worksheets untuk auto-hitung "bulan ke" (sama seperti halaman worksheets)
  const [overdueWorksheets, setOverdueWorksheets] = useState<any[]>([]);

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(""), 3000);
    return () => clearTimeout(t);
  }, [successToast]);

  const panelRef = useRef<HTMLDivElement>(null);

  const handleCardClick = async (stat: StatItem) => {
    if (!stat.statusFilter) return;

    // Toggle off if clicking same tab
    if (activeTab === stat.statusFilter) {
      setActiveTab(null);
      setItems([]);
      setSearchQuery("");
      setExpandedItemId(null);
      return;
    }

    setActiveTab(stat.statusFilter);
    setIsLoading(true);
    setSearchQuery("");
    setExpandedItemId(null);

    try {
      // Get current branch ID from cookie
      const { getBranchId } = await import("@/lib/actions");
      const branchId = await getBranchId();
      setCurrentBranchId(branchId);

      if (stat.statusFilter === "CLASSES") {
        const data = await getClassesWithSchedules();
        setItems(data);
      } else if (stat.statusFilter === "OVERDUE_WORKSHEETS") {
        // Special handling for overdue worksheets - pass branch ID
        const data = await getOverdueWorksheets(branchId);
        setItems(data);
      } else {
        const data = await getStudentsByStatusWithSchedules(stat.statusFilter);
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch detail data:", err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for "Isi Lembar Perkembangan Sekarang" button
  const handleOpenWorksheetForm = async (
    student: any,
    missedDate: string,
    className?: string,
    missedTime?: string,
  ) => {
    // Tampilkan loading panel selama data modal disiapkan
    // (fetch sama persis, hanya ada indikator sebelum modal muncul).
    setIsLoading(true);
    try {
      // Fetch teachers + riwayat worksheets agar auto-hitung "bulan ke"
      // sama persis dengan halaman Laporan Perkembangan / ChangeLabelModal
      const { getTeachers, getWorksheetsByStudent } =
        await import("@/lib/actions");
      const [teacherList, studentWorksheets] = await Promise.all([
        getTeachers(),
        // Selalu ambil riwayat terbaru agar auto-hitung "bulan ke" sama dengan halaman worksheets
        student?.id ? getWorksheetsByStudent(student.id) : Promise.resolve([]),
      ]);
      setTeachers(teacherList);
      setOverdueWorksheets(studentWorksheets || []);

      setOverdueStudent(student);
      setMissedDate(missedDate);
      setMissedTime(missedTime || student?.missedTime || "");
      setClassName(className || "");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseWorksheetModal = () => {
    setOverdueStudent(null);
    setMissedDate("");
    setMissedTime("");
    setClassName("");
    setOverdueWorksheets([]);
  };

  useEffect(() => {
    if (activeTab && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 150);
    }
  }, [activeTab]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();

    if (activeTab === "CLASSES") {
      return item.name?.toLowerCase().includes(q);
    }

    // For students (including overdue worksheets)
    const matchName = (item.name || "").toLowerCase().includes(q);
    const matchNickname = (item.nickname || "").toLowerCase().includes(q);

    // Special check for overdue worksheets - also match by missed date
    let matchDate = false;
    if (activeTab === "OVERDUE_WORKSHEETS" && item.missedDate) {
      matchDate = String(item.missedDate).toLowerCase().includes(q);
    }

    return matchName || matchNickname || matchDate;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (activeTab === "CLASSES") {
      return (a.name || "").localeCompare(b.name || "");
    }

    // Special sorting for overdue worksheets - by missed date (most recent first)
    if (activeTab === "OVERDUE_WORKSHEETS") {
      // If sortBy is 'name', just compare names normally
      if (sortBy === "name") {
        const nameA = a.nickname || a.name || "";
        const nameB = b.nickname || b.name || "";
        return nameA.localeCompare(nameB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      // Default sort by missed date (newest first)
      if (a.missedDate && b.missedDate) {
        return (
          new Date(b.missedDate).getTime() - new Date(a.missedDate).getTime()
        );
      }
      return 0;
    }

    if (sortBy === "label") {
      const labelA = a.label
        ? `${a.label.main_level || ""} ${a.label.sub_level || ""}`.trim()
        : "ZZZ";
      const labelB = b.label
        ? `${b.label.main_level || ""} ${b.label.sub_level || ""}`.trim()
        : "ZZZ";

      if (labelA !== labelB) {
        return labelA.localeCompare(labelB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
    }

    const nameA = a.nickname || a.name || "";
    const nameB = b.nickname || b.name || "";
    return nameA.localeCompare(nameB, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const today = getTodayISO();
  const todayDate = new Date(today);
  const currentMonth = todayDate.getMonth();
  const currentYear = todayDate.getFullYear();

  const isStudentUpcoming = (student: any) => {
    // Siswa tanpa jadwal = Sudah Terlewat (tidak ada jadwal di bulan ini)
    if (!student.schedules || student.schedules.length === 0) return false;

    // Check if student has at least one schedule on or after today
    return student.schedules.some((sched: any) => {
      const schedDate = new Date(sched.date);
      // Compare full date including year, month, AND day
      return schedDate.getTime() >= todayDate.getTime();
    });
  };

  const upcomingStudents = sortedItems.filter(isStudentUpcoming);
  const passedStudents = sortedItems.filter((s) => !isStudentUpcoming(s));

  const renderStudentItem = (student: any, idx: number) => {
    const hex = student.label?.hex_color || "#94a3b8";
    const isExpanded = expandedItemId === student.id;
    const scheduleCount = student.schedules?.length || 0;
    const isEven = idx % 2 === 0;
    const isUpcoming = isStudentUpcoming(student);

    const todaySchedules =
      student.schedules?.filter((sched: any) => sched.date === today) || [];
    const hasTodaySchedule = todaySchedules.length > 0;

    return (
      <div
        key={
          activeTab === "OVERDUE_WORKSHEETS"
            ? `${student.id}_${student.missedDate}`
            : student.id
        }
      >
        <button
          type="button"
          onClick={() => setExpandedItemId(isExpanded ? null : student.id)}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 transition-colors cursor-pointer text-left ${
            isExpanded
              ? "bg-brand-50 dark:bg-brand-500/10"
              : hasTodaySchedule
                ? "bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15"
                : isEven
                  ? "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  : "bg-slate-50/60 hover:bg-slate-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-800"
          }`}
        >
          {/* Index number & Color Dot */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-300 w-4 text-right tabular-nums sm:w-5">
              {idx + 1}
            </span>
            <div
              className="w-2 h-2 rounded-full ring-1 ring-black/10 shrink-0"
              style={{ backgroundColor: hex }}
            />
          </div>

          {/* Student Name, Gender & Level Badge - Mobile optimized */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              {/* Left section: Name + Badges (stacked vertically for clarity) */}
              <div className="flex flex-col gap-1 flex-1">
                {/* Row 1: Name */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {student.nickname || student.name}
                  </span>
                  {student.gender === "Perempuan" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-pink-600 text-white text-[9px] font-bold shrink-0 whitespace-nowrap">
                      P
                    </span>
                  ) : student.gender === "Laki-laki" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-blue-600 text-white text-[9px] font-bold shrink-0 whitespace-nowrap">
                      L
                    </span>
                  ) : null}
                </div>

                {/* Row 2: Level Badge (always on new line for consistency) */}
                {student.label && (
                  <div className="flex items-center">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-slate-900 shadow-md shrink-0 whitespace-nowrap"
                      style={{
                        backgroundColor: `${hex}66`,
                        backgroundImage: `linear-gradient(135deg, #FFFFFF 0%, ${hex}88 100%)`,
                        boxShadow: `0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(255,255,255,0.6) inset`,
                        borderWidth: "2px",
                        borderStyle: "solid",
                        borderColor: "#FFFFFF",
                      }}
                    >
                      {student.label.main_level}
                      {student.label.sub_level
                        ? `.${student.label.sub_level}`
                        : ""}
                    </span>
                  </div>
                )}

                {/* CG Status if active */}
                {activeTab === "CG" && (
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                      isUpcoming
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {isUpcoming ? "Belum Terlewat" : "Sudah Terlewat"}
                  </span>
                )}

                {/* Overdue Worksheet Warning if active */}
                {activeTab === "OVERDUE_WORKSHEETS" && (
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 shrink-0 animate-pulse whitespace-nowrap">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>Jadwal Terlewat</span>
                  </span>
                )}

                {/* Today's schedule indicator */}
                {hasTodaySchedule && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 animate-pulse whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Hari Ini</span>
                  </span>
                )}
              </div>
            </div>

            {/* Full name subtitle (if different from nickname) */}
            {student.nickname && student.name !== student.nickname && (
              <span className="text-xs text-slate-400 mt-1 block">
                {student.name}
              </span>
            )}
          </div>

          {/* Schedule count badge & Chevron - Right aligned */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Hidden for overdue worksheets */}
            {activeTab !== "OVERDUE_WORKSHEETS" && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  hasTodaySchedule
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : scheduleCount > 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {scheduleCount} sesi
              </span>
            )}

            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-brand-500" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m6 9 6 6 6-6"
              />
            </svg>
          </div>
        </button>

        {/* Expanded Student Schedule Detail */}
        {isExpanded && activeTab !== "OVERDUE_WORKSHEETS" && (
          <div className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 px-3 py-2.5 sm:px-6 sm:py-4">
            <div className="ml-2 sm:ml-6 pl-2.5 sm:pl-3 border-l-2 border-brand-600/30">
              {scheduleCount === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">
                  Belum ada jadwal bulan ini
                </p>
              ) : (
                <div className="space-y-1">
                  {student.schedules.map((sched: any, sIdx: number) => {
                    const isPast = sched.date < today;
                    const isToday = sched.date === today;

                    return (
                      <div
                        key={`${student.id}_${sched.date}_${sched.time}`}
                        className={`flex items-center justify-between gap-1.5 py-1.5 px-2 sm:px-2.5 rounded-lg transition-colors ${
                          isToday
                            ? "bg-emerald-50 border border-emerald-200 shadow-2xs"
                            : isPast
                              ? "opacity-40"
                              : "hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isToday
                                ? "bg-emerald-500 animate-pulse"
                                : isPast
                                  ? "bg-slate-300"
                                  : "bg-brand-500"
                            }`}
                          />
                          <span className="text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0">
                            {formatShortDate(sched.date)}
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold text-slate-800 tabular-nums shrink-0">
                            {sched.time?.slice(0, 5) || sched.time}
                          </span>
                          <span className="text-[11px] sm:text-xs font-medium text-slate-600 truncate min-w-0">
                            {sched.class?.name || "-"}
                          </span>
                        </div>

                        {isToday && (
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0 ml-1">
                            HARI INI
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expanded Overdue Worksheet Detail */}
        {isExpanded && activeTab === "OVERDUE_WORKSHEETS" && (
          <div className="bg-red-50/80 border-b border-red-200/80 px-3 py-2 sm:px-4 sm:py-3">
            <div className="ml-2 pl-2.5 border-l-2 border-red-400">
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-red-800 font-semibold mb-0.5">
                      Jadwal pada tanggal tersebut belum diisi dalam lembar
                      perkembangan
                    </p>
                    <p className="text-[10px] text-red-600 leading-tight">
                      • Tanggal:{" "}
                      <strong>{formatShortDate(student.missedDate)}</strong>
                      <br />• Waktu: <strong>{student.missedTime}</strong>
                    </p>
                    {student.className && (
                      <p className="text-[10px] text-red-600 mt-0.5">
                        Kelas: <strong>{student.className}</strong>
                      </p>
                    )}
                    <a
                      href="#"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors w-full justify-center"
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenWorksheetForm(
                          student,
                          student.missedDate || missedDate,
                          student.className,
                          student.missedTime,
                        );
                      }}
                    >
                      <Icons.add className="w-3.5 h-3.5" />
                      Isi Lembar Perkembangan Sekarang
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tema header panel per-tab (visual saja — tidak memengaruhi fetch/filter/sort).
  const panelTheme = activeTab
    ? panelThemeByTab[activeTab]
    : panelThemeByTab.CLASSES;

  return (
    <>
      {/* Stats Cards - rendered inside the hero banner */}
      <DashboardStatsCards
        stats={stats}
        activeTab={activeTab}
        onCardClick={handleCardClick}
      />

      {/* Detail List Panel - header solid per-tab, selaras hero Hallo */}
      {activeTab && (
        <div ref={panelRef} className="mt-4 relative z-10">
          <div
            className={`rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border ${panelTheme.outer} overflow-hidden`}
          >
            {/* Panel Header */}
            <div
              className={`sticky top-0 z-20 px-4 py-3 sm:px-6 sm:py-4 ${panelTheme.header} border-b ${panelTheme.divider} flex flex-col gap-3`}
            >
              {/* Header Top Row: Title & Close Button */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-white/15 border border-white/25 text-white shrink-0">
                    {activeTab === "REGISTERED" ? (
                      <Icons.users className="h-4 w-4" />
                    ) : activeTab === "CG" ? (
                      <Icons.sun className="h-4 w-4" />
                    ) : (
                      <Icons.calendar className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-white truncate">
                      {activeTab === "REGISTERED"
                        ? "Daftar Siswa Aktif"
                        : activeTab === "CG"
                          ? "Daftar Siswa Coba Gratis"
                          : activeTab === "OVERDUE_WORKSHEETS"
                            ? "Laporan Terlewat"
                            : "Daftar Tipe Kelas"}
                    </h4>
                    <p className="text-[11px] text-white/85 truncate mt-0.5">
                      {activeTab === "CLASSES"
                        ? `${sortedItems.length} tipe kelas tersedia`
                        : activeTab === "CG"
                          ? `Bulan ${getMonthName()} • ${upcomingStudents.length} belum terlewat, ${passedStudents.length} sudah terlewat`
                          : activeTab === "OVERDUE_WORKSHEETS"
                            ? `${sortedItems.length} siswa belum mengisi laporan sesuai jadwal`
                            : `Bulan ${getMonthName()} • ${sortedItems.length} siswa`}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(null);
                    setItems([]);
                    setSearchQuery("");
                    setExpandedItemId(null);
                  }}
                  className="p-1.5 rounded-lg bg-white/15 border border-white/25 text-white hover:bg-white/25 transition-colors cursor-pointer shrink-0 ml-auto"
                  title="Tutup"
                >
                  <Icons.close className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-filter tabs & Controls Row */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t ${panelTheme.divider}`}
              >
                {/* Sub-filter dropdown for CG only - not shown for OVERDUE_WORKSHEETS */}
                {activeTab === "CG" ? (
                  <div className="relative w-full sm:w-auto min-w-35">
                    <select
                      value={cgFilter}
                      onChange={(e) =>
                        setCgFilter(
                          e.target.value as "ALL" | "UPCOMING" | "PASSED",
                        )
                      }
                      className="w-full appearance-none px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 cursor-pointer"
                    >
                      <option value="ALL">Semua ({sortedItems.length})</option>
                      <option value="UPCOMING">
                        Belum Terlewat ({upcomingStudents.length})
                      </option>
                      <option value="PASSED">
                        Sudah Terlewat ({passedStudents.length})
                      </option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
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
                          d="m19 9 7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                ) : activeTab === "OVERDUE_WORKSHEETS" ? (
                  <div />
                ) : (
                  <div className="w-full sm:w-auto" />
                )}

                {/* Controls (Sort & Search) */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Sort toggle for students */}
                  {activeTab !== "CLASSES" && (
                    <button
                      type="button"
                      onClick={() =>
                        setSortBy((prev) =>
                          prev === "label" ? "name" : "label",
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all cursor-pointer shrink-0 shadow-2xs"
                      title="Ganti Urutan"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                        />
                      </svg>
                      <span>
                        Urut:{" "}
                        <strong className="text-brand-600">
                          {sortBy === "label" ? "Label" : "Nama"}
                        </strong>
                      </span>
                    </button>
                  )}

                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-48">
                    <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={
                        activeTab === "CLASSES"
                          ? "Cari kelas..."
                          : "Cari nama / panggilan..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Body - Scrollable area with smart overflow */}
            <div className="px-4 py-3 sm:px-6 sm:py-5">
              <div
                className="max-h-[calc(100vh-200px)] min-h-[50vh] overflow-y-auto overscroll-contain"
                onWheel={(e) => {
                  const target = e.target as HTMLElement;
                  const atTop = target.scrollTop === 0;
                  const atBottom =
                    target.scrollHeight - target.scrollTop ===
                    target.clientHeight;

                  // Jika sudah mentok bawah dan scroll maju, biarkan scroll berlanjut ke luar
                  if (!atBottom && e.deltaY > 0) {
                    e.stopPropagation();
                  }
                  // Jika di atas dan scroll mundur, biarkan scroll berlanjut ke luar
                  if (atTop && e.deltaY < 0) {
                    e.stopPropagation();
                  }
                }}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-[3px] border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">
                      Memuat data...
                    </span>
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <Icons.users className="w-8 h-8 text-slate-300" />
                    <span className="text-xs text-slate-400 font-medium">
                      {searchQuery
                        ? "Tidak ada data yang cocok"
                        : "Belum ada data"}
                    </span>
                  </div>
                ) : activeTab === "CLASSES" ? (
                  /* Render Classes List */
                  <div className="divide-y divide-slate-100">
                    {sortedItems.map((cls, idx) => {
                      const isExpanded = expandedItemId === cls.id;
                      const scheduleCount = cls.schedules?.length || 0;
                      const isEven = idx % 2 === 0;

                      return (
                        <div key={cls.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedItemId(isExpanded ? null : cls.id)
                            }
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-6 transition-all cursor-pointer text-left ${
                              isExpanded
                                ? "bg-brand-50/60"
                                : isEven
                                  ? "bg-white hover:bg-slate-50"
                                  : "bg-slate-50/50 hover:bg-slate-100/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-right tabular-nums">
                                {idx + 1}
                              </span>
                              <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0 ring-1 ring-black/10" />
                              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                {cls.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                Maks {cls.max_quota || 4} siswa
                              </span>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  scheduleCount > 0
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                    : "bg-slate-100 text-slate-400 border border-slate-200"
                                }`}
                              >
                                {scheduleCount} sesi
                              </span>

                              <svg
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-brand-500" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m6 9 6 6 6-6"
                                />
                              </svg>
                            </div>
                          </button>

                          {/* Expanded Class Schedule Detail */}
                          {isExpanded && (
                            <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-3 sm:px-6 sm:py-4 animate-in slide-in-from-top-2 fade-in duration-200">
                              <div className="ml-7 pl-3 border-l-2 border-brand-300 space-y-2">
                                {scheduleCount === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-1">
                                    Belum ada sesi jadwal untuk kelas ini bulan
                                    ini
                                  </p>
                                ) : (
                                  cls.schedules.map(
                                    (slot: any, sIdx: number) => {
                                      const isPast = slot.date < today;
                                      const isToday = slot.date === today;
                                      const bookingsCount =
                                        slot.bookings?.length || 0;

                                      return (
                                        <div
                                          key={sIdx}
                                          className={`p-2.5 rounded-xl border transition-colors ${
                                            isToday
                                              ? "bg-emerald-50/90 border-emerald-200 shadow-2xs"
                                              : isPast
                                                ? "bg-white/60 border-slate-200 opacity-60"
                                                : "bg-white border-slate-200"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                  isToday
                                                    ? "bg-emerald-500 animate-pulse"
                                                    : isPast
                                                      ? "bg-slate-300"
                                                      : "bg-brand-500"
                                                }`}
                                              />
                                              <span className="text-xs font-semibold text-slate-700">
                                                {formatShortDate(slot.date)}
                                              </span>
                                              <span className="text-xs font-bold text-slate-900 tabular-nums">
                                                {slot.time}
                                              </span>
                                              {isToday && (
                                                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                                  HARI INI
                                                </span>
                                              )}
                                            </div>
                                            <span
                                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                bookingsCount >=
                                                (cls.max_quota || 4)
                                                  ? "bg-red-50 text-red-600 border border-red-200"
                                                  : bookingsCount === 0
                                                    ? "bg-slate-100 text-slate-400"
                                                    : "bg-brand-50 text-brand-700 border border-brand-200"
                                              }`}
                                            >
                                              {bookingsCount}/
                                              {cls.max_quota || 4} Terisi
                                            </span>
                                          </div>

                                          {/* Booked Students List */}
                                          {bookingsCount === 0 ? (
                                            <p className="text-[10px] text-slate-400 italic pl-3.5">
                                              Belum ada siswa terdaftar
                                            </p>
                                          ) : (
                                            <div className="flex flex-wrap gap-1.5 pl-3.5 mt-1.5">
                                              {slot.bookings.map((b: any) => {
                                                const hex =
                                                  b.student?.label?.hex_color ||
                                                  "#94a3b8";
                                                return (
                                                  <span
                                                    key={b.student_id}
                                                    className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md text-slate-800 bg-white border border-slate-200 shadow-2xs"
                                                    style={{
                                                      borderLeft: `3px solid ${hex}`,
                                                    }}
                                                  >
                                                    {b.student?.status ===
                                                      "CG" && (
                                                      <span className="text-amber-600 font-extrabold mr-1">
                                                        (CG)
                                                      </span>
                                                    )}
                                                    <span>
                                                      {b.student?.nickname ||
                                                        b.student?.name}
                                                    </span>
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    },
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : activeTab === "CG" ? (
                  /* Render CG Students - Split into Belum Terlewat & Sudah Terlewat */
                  <div>
                    {cgFilter === "ALL" ? (
                      <div>
                        {/* Section 1: Belum Terlewat */}
                        <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xs">
                          <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Belum Terlewat ({upcomingStudents.length} siswa)
                          </span>
                        </div>
                        {upcomingStudents.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 italic">
                            Tidak ada siswa CG yang belum terlewat
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {upcomingStudents.map(renderStudentItem)}
                          </div>
                        )}

                        {/* Section 2: Sudah Terlewat */}
                        <div className="bg-slate-100 border-y border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xs">
                          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Sudah Terlewat ({passedStudents.length} siswa)
                          </span>
                        </div>
                        {passedStudents.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 italic">
                            Tidak ada siswa CG yang sudah terlewat
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {passedStudents.map(renderStudentItem)}
                          </div>
                        )}
                      </div>
                    ) : cgFilter === "UPCOMING" ? (
                      upcomingStudents.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 font-medium">
                          Tidak ada siswa CG yang belum terlewat
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {upcomingStudents.map(renderStudentItem)}
                        </div>
                      )
                    ) : passedStudents.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-medium">
                        Tidak ada siswa CG yang sudah terlewat
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {passedStudents.map(renderStudentItem)}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Render Registered Students List */
                  <div className="divide-y divide-slate-100">
                    {sortedItems.map(renderStudentItem)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Worksheet Form Modal */}
      {overdueStudent && (
        <WorksheetFormModal
          students={[overdueStudent]}
          teachers={teachers}
          worksheets={overdueWorksheets}
          onClose={handleCloseWorksheetModal}
          onSuccess={(msg) => {
            handleCloseWorksheetModal();
            if (msg) setSuccessToast(msg);
            // Optionally refresh data here
          }}
          lockedStudentId={overdueStudent.id}
          currentDate={missedDate}
          scheduleTime={missedTime || overdueStudent?.missedTime}
          scheduleClassName={className}
        />
      )}

      {/* Toast berhasil (hijau, auto-hilang) */}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span>✅</span>
          <span>{successToast}</span>
        </div>
      )}
    </>
  );
}
