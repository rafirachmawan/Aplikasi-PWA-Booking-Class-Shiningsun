import { getMonthlySchedules, getClasses, getStudents } from "@/lib/actions";
import { ScheduleClientWrapper } from "./ScheduleClientWrapper";

export const dynamic = 'force-dynamic';

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
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
    />
  );
}
