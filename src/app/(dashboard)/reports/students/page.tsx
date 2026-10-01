import { getCurrentUserRole } from "@/lib/actions";
import { getRegisteredStudentsReport } from "@/lib/studentReport";
import { getStudentScheduleWorksheetReport } from "@/lib/studentScheduleReport";
import { REPORT_DEFAULT_FROM_DATE } from "@/lib/studentReportTypes";
import { ReportClient } from "./ReportClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Laporan Siswa | ShiningSun",
  description: "Laporan siswa REGISTERED semua cabang sejak 1 September",
};

export default async function StudentReportPage() {
  const role = await getCurrentUserRole();

  if (role !== "SUPERADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Akses Dibatasi
          </h2>
          <p className="text-slate-600 dark:text-zinc-400">
            Halaman ini hanya dapat diakses oleh Super Admin.
          </p>
        </div>
      </div>
    );
  }

  const [{ data }, { data: scheduleData }] = await Promise.all([
    getRegisteredStudentsReport(),
    getStudentScheduleWorksheetReport(REPORT_DEFAULT_FROM_DATE),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">Super Admin</p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Laporan Siswa Semua Cabang
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
            Seluruh siswa REGISTERED di semua cabang (tanggal daftar berapa pun
            ikut tampil). Jadwal + isian laporan dibatasi sejak 1 September
            2026. Gunakan pencarian / filter cabang lalu unduh CSV.
          </p>
        </div>
      </div>

      <ReportClient
        initialData={data}
        scheduleData={scheduleData}
        fromDate={REPORT_DEFAULT_FROM_DATE}
      />
    </div>
  );
}
