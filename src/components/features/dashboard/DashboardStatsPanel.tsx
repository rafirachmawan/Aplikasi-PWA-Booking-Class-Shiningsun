"use client";

import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/ui/icons";
import { getStudentsByStatusWithSchedules, getClassesWithSchedules } from "@/lib/actions";

type TabType = 'REGISTERED' | 'CG' | 'CLASSES';

type StatItem = {
  name: string;
  value: string;
  iconName: string;
  statusFilter?: TabType;
};

function formatShortDate(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getMonthName() {
  return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

const iconMap: Record<string, any> = {
  users: Icons.users,
  sun: Icons.sun,
  calendar: Icons.calendar,
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
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-10 relative z-10">
      {stats.map((item) => {
        const IconComponent = iconMap[item.iconName] || Icons.users;
        const isClickable = !!item.statusFilter;
        const isActive = activeTab === item.statusFilter;

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onCardClick(item)}
            disabled={!isClickable}
            className={`group rounded-2xl bg-white/15 border p-2.5 sm:p-5 backdrop-blur-xl shadow-inner transition-all duration-300 flex flex-col justify-between min-w-0 text-left ${
              isActive
                ? "bg-white/30 border-white/40 ring-2 ring-white/50 scale-[1.02]"
                : "border-white/20 hover:bg-white/25 hover:border-white/30"
            } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between gap-0.5 mb-1.5">
              <dt className="text-[8.5px] sm:text-xs font-bold text-white/95 uppercase tracking-tight leading-tight">
                {item.name}
              </dt>
              <div className={`p-1 sm:p-1.5 rounded-lg bg-white/20 text-white shadow-xs shrink-0 transition-transform ${isClickable ? 'group-hover:scale-110' : ''}`}>
                <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
            </div>
            <dd className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
                {item.value}
              </span>
            </dd>
            {isClickable && (
              <div className={`mt-1.5 flex items-center gap-1 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <span className="text-[8px] sm:text-[10px] font-semibold text-white/80">
                  {isActive ? "Tutup Detail" : "Lihat Detail"}
                </span>
                <svg className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/70 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardStatsPanel({
  stats,
}: {
  stats: StatItem[];
}) {
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'label' | 'name'>('label');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
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
      if (stat.statusFilter === 'CLASSES') {
        const data = await getClassesWithSchedules();
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

  useEffect(() => {
    if (activeTab && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
    }
  }, [activeTab]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (activeTab === 'CLASSES') {
      return item.name?.toLowerCase().includes(q);
    }
    return (
      item.name?.toLowerCase().includes(q) ||
      item.nickname?.toLowerCase().includes(q)
    );
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (activeTab === 'CLASSES') {
      return (a.name || '').localeCompare(b.name || '');
    }

    if (sortBy === 'label') {
      const labelA = a.label ? `${a.label.main_level || ''} ${a.label.sub_level || ''}`.trim() : 'ZZZ';
      const labelB = b.label ? `${b.label.main_level || ''} ${b.label.sub_level || ''}`.trim() : 'ZZZ';

      if (labelA !== labelB) {
        return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
      }
    }

    const nameA = a.nickname || a.name || '';
    const nameB = b.nickname || b.name || '';
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <>
      {/* Stats Cards - rendered inside the hero banner */}
      <DashboardStatsCards
        stats={stats}
        activeTab={activeTab}
        onCardClick={handleCardClick}
      />

      {/* Detail List Panel - Clean White Card */}
      {activeTab && (
        <div
          ref={panelRef}
          className="mt-5 relative z-10 animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-xs ${
                  activeTab === 'REGISTERED'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : activeTab === 'CG'
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                      : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                }`}>
                  {activeTab === 'REGISTERED' ? (
                    <Icons.users className="h-4 w-4" />
                  ) : activeTab === 'CG' ? (
                    <Icons.sun className="h-4 w-4" />
                  ) : (
                    <Icons.calendar className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-800">
                    {activeTab === 'REGISTERED'
                      ? 'Daftar Siswa Aktif'
                      : activeTab === 'CG'
                        ? 'Daftar Siswa Coba Gratis'
                        : 'Daftar Tipe Kelas'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {activeTab === 'CLASSES'
                      ? `${sortedItems.length} tipe kelas tersedia`
                      : `Jadwal bulan ${getMonthName()} • ${sortedItems.length} siswa`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Sort toggle for students */}
                {activeTab !== 'CLASSES' && (
                  <button
                    type="button"
                    onClick={() => setSortBy(prev => prev === 'label' ? 'name' : 'label')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all cursor-pointer shrink-0 shadow-2xs"
                    title="Ganti Urutan"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    <span>Urut: <strong className="text-brand-600">{sortBy === 'label' ? 'Label' : 'Nama'}</strong></span>
                  </button>
                )}

                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'CLASSES' ? "Cari kelas..." : "Cari nama / panggilan..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs"
                  />
                </div>
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => { setActiveTab(null); setItems([]); setSearchQuery(""); setExpandedItemId(null); }}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer shrink-0"
                  title="Tutup"
                >
                  <Icons.close className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="max-h-[420px] sm:max-h-[520px] overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-[3px] border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                  <span className="text-xs text-slate-500 font-medium">Memuat data...</span>
                </div>
              ) : sortedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Icons.users className="w-8 h-8 text-slate-300" />
                  <span className="text-xs text-slate-400 font-medium">
                    {searchQuery ? "Tidak ada data yang cocok" : "Belum ada data"}
                  </span>
                </div>
              ) : activeTab === 'CLASSES' ? (
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
                          onClick={() => setExpandedItemId(isExpanded ? null : cls.id)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-6 transition-all cursor-pointer text-left ${
                            isExpanded
                              ? 'bg-brand-50/60'
                              : isEven
                                ? 'bg-white hover:bg-slate-50'
                                : 'bg-slate-50/50 hover:bg-slate-100/60'
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

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              scheduleCount > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {scheduleCount} sesi
                            </span>

                            <svg
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-brand-500' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded Class Schedule Detail */}
                        {isExpanded && (
                          <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-3 sm:px-6 sm:py-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="ml-7 pl-3 border-l-2 border-brand-300 space-y-2">
                              {scheduleCount === 0 ? (
                                <p className="text-xs text-slate-400 italic py-1">
                                  Belum ada sesi jadwal untuk kelas ini bulan ini
                                </p>
                              ) : (
                                cls.schedules.map((slot: any, sIdx: number) => {
                                  const today = new Date().toLocaleDateString('sv-SE');
                                  const isPast = slot.date < today;
                                  const isToday = slot.date === today;
                                  const bookingsCount = slot.bookings?.length || 0;

                                  return (
                                    <div
                                      key={sIdx}
                                      className={`p-2.5 rounded-xl border transition-colors ${
                                        isToday
                                          ? 'bg-emerald-50/90 border-emerald-200 shadow-2xs'
                                          : isPast
                                            ? 'bg-white/60 border-slate-200 opacity-60'
                                            : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                            isToday
                                              ? 'bg-emerald-500 animate-pulse'
                                              : isPast
                                                ? 'bg-slate-300'
                                                : 'bg-brand-500'
                                          }`} />
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
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                          bookingsCount >= (cls.max_quota || 4)
                                            ? 'bg-red-50 text-red-600 border border-red-200'
                                            : bookingsCount === 0
                                              ? 'bg-slate-100 text-slate-400'
                                              : 'bg-brand-50 text-brand-700 border border-brand-200'
                                        }`}>
                                          {bookingsCount}/{cls.max_quota || 4} Terisi
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
                                            const hex = b.student?.label?.hex_color || "#94a3b8";
                                            return (
                                              <span
                                                key={b.student_id}
                                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md text-slate-800 bg-white border border-slate-200 shadow-2xs"
                                                style={{
                                                  borderLeft: `3px solid ${hex}`,
                                                }}
                                              >
                                                {b.student?.status === "CG" && (
                                                  <span className="text-amber-600 font-extrabold mr-1">
                                                    (CG)
                                                  </span>
                                                )}
                                                <span>{b.student?.nickname || b.student?.name}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Render Students List - Sorted by Label */
                <div className="divide-y divide-slate-100">
                  {sortedItems.map((student, idx) => {
                    const hex = student.label?.hex_color || "#94a3b8";
                    const isExpanded = expandedItemId === student.id;
                    const scheduleCount = student.schedules?.length || 0;
                    const isEven = idx % 2 === 0;

                    return (
                      <div key={student.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedItemId(isExpanded ? null : student.id)}
                          className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-3 sm:px-6 transition-all cursor-pointer text-left ${
                            isExpanded
                              ? 'bg-brand-50/60'
                              : isEven
                                ? 'bg-white hover:bg-slate-50'
                                : 'bg-slate-50/40 hover:bg-slate-100/60'
                          }`}
                        >
                          {/* Index number & Color Dot */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-slate-400 w-4 text-right tabular-nums">
                              {idx + 1}
                            </span>
                            <div
                              className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 shrink-0"
                              style={{ backgroundColor: hex }}
                            />
                          </div>

                          {/* Student Name & Level Badge */}
                          <div className="flex-1 min-w-0 py-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                                {student.nickname || student.name}
                              </span>
                              {student.label && (
                                <span
                                  className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded text-white shadow-2xs shrink-0"
                                  style={{ backgroundColor: hex }}
                                >
                                  {student.label.main_level}{student.label.sub_level ? `.${student.label.sub_level}` : ''}
                                </span>
                              )}
                            </div>
                            {student.nickname && student.name !== student.nickname && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {student.name}
                              </span>
                            )}
                          </div>

                          {/* Schedule count badge & Chevron */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              scheduleCount > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {scheduleCount} sesi
                            </span>

                            <svg
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-brand-500' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded Student Schedule Detail */}
                        {isExpanded && (
                          <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-3 sm:px-6 sm:py-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="ml-7 pl-3 border-l-2 border-brand-300">
                              {scheduleCount === 0 ? (
                                <p className="text-xs text-slate-400 italic py-1">
                                  Belum ada jadwal bulan ini
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {student.schedules.map((sched: any, sIdx: number) => {
                                    const today = new Date().toLocaleDateString('sv-SE');
                                    const isPast = sched.date < today;
                                    const isToday = sched.date === today;
                                    
                                    return (
                                      <div
                                        key={sIdx}
                                        className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg transition-colors ${
                                          isToday
                                            ? 'bg-emerald-50 border border-emerald-200 shadow-2xs'
                                            : isPast
                                              ? 'opacity-40'
                                              : 'hover:bg-white'
                                        }`}
                                      >
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          isToday
                                            ? 'bg-emerald-500 animate-pulse'
                                            : isPast
                                              ? 'bg-slate-300'
                                              : 'bg-brand-500'
                                        }`} />
                                        <span className="text-xs font-semibold text-slate-600 w-24 shrink-0">
                                          {formatShortDate(sched.date)}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 tabular-nums w-14 shrink-0">
                                          {sched.time}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500 truncate flex-1">
                                          {sched.class?.name || '-'}
                                        </span>
                                        {isToday && (
                                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0 ml-auto">
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
