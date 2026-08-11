"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { StudentScheduleCard } from "./StudentScheduleCard";
import { StudentWorksheetTable } from "@/components/features/worksheets/StudentWorksheetTable";
import { clearParentSession } from "@/lib/actions";
import { formatShortDate } from "@/lib/dateUtils";
import { getGDriveDirectLink, getGDrivePreviewLink } from "@/lib/gdriveUtils";

interface ParentDashboardClientProps {
  student: any;
  upcomingSchedules: any[];
  scheduleHistory: any[];
  worksheets: any[];
}

export function ParentDashboardClient({
  student,
  upcomingSchedules,
  scheduleHistory,
  worksheets,
}: ParentDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"schedule" | "worksheets">("worksheets");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await clearParentSession();
      router.push("/portal-ortu");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const firstLetter = student?.name ? student.name.charAt(0).toUpperCase() : "S";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white rounded-2xl shadow-xs border border-slate-100 p-1 shrink-0">
              <Image
                src="/logo.png"
                alt="ShiningSun Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                Portal Orang Tua & Siswa
              </h1>
              <p className="text-[11px] text-brand-600 dark:text-brand-400 font-bold mt-0.5">
                ShiningSun Preschool & Academy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">{isLoggingOut ? "Keluar..." : "Keluar / Ganti Akses"}</span>
            <span className="sm:hidden">{isLoggingOut ? "..." : "Keluar"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 space-y-6">
        
        {/* Student Profile Card (Ultra-Clean Gradient Banner) */}
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-sky-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          {/* Background Ambient Blur Shapes */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              {/* Student Avatar Icon */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 text-white flex items-center justify-center font-extrabold text-xl sm:text-2xl shadow-lg shrink-0">
                {firstLetter}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 border border-white/25 text-white text-[11px] font-bold backdrop-blur-md">
                    🎓 Profil Siswa
                  </span>
                  {student.branch?.name && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold backdrop-blur-md">
                      📍 Cabang {student.branch.name}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight pt-0.5">
                  {student.name}
                </h2>

                {student.nickname && (
                  <p className="text-sky-100 text-xs sm:text-sm font-medium">
                    Nama Panggilan: <strong className="text-white font-bold">&quot;{student.nickname}&quot;</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Level & Status Chips */}
            <div className="flex sm:flex-col items-start sm:items-end gap-2 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/15">
              {student.label ? (
                <span
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white shadow-sm border border-white/20"
                  style={{ backgroundColor: student.label.hex_color }}
                >
                  Tingkat: {student.label.main_level} {student.label.sub_level}
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white border border-white/20">
                  Tingkat: Belum Diatur
                </span>
              )}

              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/25 text-emerald-100 border border-emerald-300/30 backdrop-blur-md">
                Status: {student.status === 'REGISTERED' ? 'Siswa Reguler' : student.status === 'CG' ? 'Coba Gratis' : 'Nonaktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Segmented Control) */}
        <div className="flex rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("worksheets")}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "worksheets"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>📄 Rapor & Laporan Perkembangan</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === "worksheets" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
              {worksheets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "schedule"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>📅 Jadwal Kelas</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === "schedule" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
              {upcomingSchedules.length}
            </span>
          </button>
        </div>

        {/* Tab Content: Worksheets */}
        {activeTab === "worksheets" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  📄 Laporan Perkembangan & Evaluasi Siswa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Laporan hasil belajar dan catatan perkembangan resmi dari guru.
                </p>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-200/60 dark:border-sky-800/40">
                {worksheets.length} Dokumen
              </span>
            </div>

            {/* Group worksheets by bulan_ke */}
            {(() => {
              const grouped = new Map<string, any[]>();
              worksheets.forEach((w) => {
                const bk = w.bulan_ke ?? 'none';
                const key = String(bk);
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(w);
              });
              const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
                const aNum = a[0] === 'none' ? 0 : parseInt(a[0]);
                const bNum = b[0] === 'none' ? 0 : parseInt(b[0]);
                return aNum - bNum;
              });
              return sortedGroups.map(([bk, wsGroup]) => (
                <StudentWorksheetTable
                  key={`parent_${student.id}_${bk}`}
                  student={student}
                  worksheets={wsGroup}
                  isParentView={true}
                />
              ));
            })()}
          </div>
        )}

        {/* Tab Content: Schedule */}
        {activeTab === "schedule" && (
          <div className="animate-in fade-in duration-200">
            <StudentScheduleCard
              upcomingSchedules={upcomingSchedules}
              scheduleHistory={scheduleHistory}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} ShiningSun Preschool & Academy. Portal Orang Tua & Rapor Digital.</p>
      </footer>
    </div>
  );
}
