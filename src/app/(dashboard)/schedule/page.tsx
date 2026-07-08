import { getMonthlySchedules, getClasses, getStudents, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { ScheduleClientWrapper } from "./ScheduleClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  // Cek apakah superadmin belum pilih cabang
  const role = await getCurrentUserRole();
  const branchId = await getBranchId();
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Jadwal Kelas" />;
  }

  const activeBranchName = role === 'SUPERADMIN' ? await getActiveBranchName() : null;

  const params = await searchParams;
  const currentMonth = params.month ? parseInt(params.month) : new Date().getMonth() + 1; // 1-12
  const currentYear = params.year ? parseInt(params.year) : new Date().getFullYear();

  const schedules = await getMonthlySchedules(currentYear, currentMonth);
  const classes = await getClasses();
  const students = await getStudents();

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
