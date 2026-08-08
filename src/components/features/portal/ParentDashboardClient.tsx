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
  const [activeTab, setActiveTab] = useState<"schedule" | "worksheets">("schedule");
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-1 bg-white rounded-xl shadow-xs border border-slate-100">
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
                Portal Orang Tua
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
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
          >
            {isLoggingOut ? "Keluar..." : "Keluar / Ganti Akses"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Student Profile Card */}
        <div className="rounded-3xl bg-gradient-to-r from-brand-600 via-brand-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold backdrop-blur-md">
                  👧 Profil Siswa
                </span>
                {student.branch?.name && (
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold backdrop-blur-md">
                    📍 Cabang {student.branch.name}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {student.name}
              </h2>

              {student.nickname && (
                <p className="text-brand-100 text-sm mt-0.5">
                  Panggilan: <strong>"{student.nickname}"</strong>
                </p>
              )}

              {/* Level Badge */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {student.label ? (
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-extrabold text-white shadow-xs"
                    style={{ backgroundColor: student.label.hex_color }}
                  >
                    Tingkat: {student.label.main_level} - {student.label.sub_level}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white/20 text-white">
                    Tingkat: Belum Diatur
                  </span>
                )}

                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Status: {student.status === 'REGISTERED' ? 'Siswa Reguler' : student.status === 'CG' ? 'Coba Gratis' : 'Nonaktif'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center ${
              activeTab === "schedule"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            📅 Jadwal Kelas Anak ({upcomingSchedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("worksheets")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center ${
              activeTab === "worksheets"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            📄 Lembar Kerja ({worksheets.length})
          </button>
        </div>

        {/* Tab Content: Schedule */}
        {activeTab === "schedule" && (
          <StudentScheduleCard
            upcomingSchedules={upcomingSchedules}
            scheduleHistory={scheduleHistory}
          />
        )}

        {/* Tab Content: Worksheets */}
        {activeTab === "worksheets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                📄 Lembar Kerja & Laporan Belajar
              </h3>
              <span className="text-xs text-slate-500">
                Total: {worksheets.length} dokumen
              </span>
            </div>

            <StudentWorksheetTable
              student={student}
              worksheets={worksheets}
              isParentView={true}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} ShiningSun Penjadwalan & Rapor Digital. All rights reserved.</p>
      </footer>
    </div>
  );
}
