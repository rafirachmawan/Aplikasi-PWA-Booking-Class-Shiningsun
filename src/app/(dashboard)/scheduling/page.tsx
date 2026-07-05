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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Penjadwalan Siswa
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola jadwal pendaftaran siswa ke kelas secara manual ataupun otomatis.
        </p>
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
