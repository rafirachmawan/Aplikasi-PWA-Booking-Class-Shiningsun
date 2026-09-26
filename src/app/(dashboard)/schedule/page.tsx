import { Suspense } from "react";
import { getMonthlySchedules, getClasses, getStudents, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { ScheduleClientWrapper } from "./ScheduleClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  // Gate cepat & kecil (hasil sama): superadmin wajib pilih cabang dulu.
  const [role, branchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Jadwal Kelas" />;
  }

  const params = await searchParams;
  const currentMonth = params.month ? parseInt(params.month) : new Date().getMonth() + 1; // 1-12
  const currentYear = params.year ? parseInt(params.year) : new Date().getFullYear();

  // Query berat di-streaming (query & props sama persis, hanya tidak blocking).
  return (
    <Suspense fallback={<SchedulePageSkeleton />}>
      <ScheduleData
        role={role}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </Suspense>
  );
}

async function ScheduleData({
  role,
  currentMonth,
  currentYear,
}: {
  role: string | null;
  currentMonth: number;
  currentYear: number;
}) {
  const [schedules, classes, students, activeBranchName] = await Promise.all([
    getMonthlySchedules(currentYear, currentMonth),
    getClasses(),
    getStudents(),
    role === 'SUPERADMIN' ? getActiveBranchName() : Promise.resolve(null),
  ]);

  return (
    <ScheduleClientWrapper
      schedules={schedules}
      classes={classes}
      students={students}
      currentMonth={currentMonth}
      currentYear={currentYear}
      activeBranchName={activeBranchName}
    />
  );
}

function SchedulePageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div className="h-96 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
    </div>
  );
}
