import { getStudents, getClasses, getMonthlySchedules } from "@/lib/actions";
import { SchedulingClientWrapper } from "./SchedulingClientWrapper";

export const dynamic = 'force-dynamic';

export default async function SchedulingPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams;
  const currentMonth = params.month ? parseInt(params.month) : new Date().getMonth() + 1; // 1-12
  const currentYear = params.year ? parseInt(params.year) : new Date().getFullYear();

  const students = await getStudents();
  const classes = await getClasses();
  const schedules = await getMonthlySchedules(currentYear, currentMonth);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card - Unified Design */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Penjadwalan Siswa
          </h2>
          <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
            Kelola jadwal pendaftaran siswa ke kelas secara manual ataupun otomatis.
          </p>
        </div>
      </div>

      <SchedulingClientWrapper 
        students={students} 
        classes={classes} 
        schedules={schedules}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </div>
  );
}
