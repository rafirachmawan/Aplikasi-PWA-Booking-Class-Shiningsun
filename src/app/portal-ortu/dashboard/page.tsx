import { redirect } from "next/navigation";
import {
  getParentSessionStudent,
  getStudentUpcomingSchedule,
  getStudentScheduleHistory,
  getWorksheetsByStudent,
  getPointRedemptions,
} from "@/lib/actions";
import { ParentDashboardClient } from "@/components/features/portal/ParentDashboardClient";

export const dynamic = 'force-dynamic';

export default async function ParentDashboardPage() {
  const student = await getParentSessionStudent();

  if (!student) {
    redirect("/portal-ortu");
  }

  const [upcomingSchedules, scheduleHistory, worksheets, redemptions] = await Promise.all([
    getStudentUpcomingSchedule(student.id),
    getStudentScheduleHistory(student.id),
    getWorksheetsByStudent(student.id),
    getPointRedemptions(student.id),
  ]);

  return (
    <ParentDashboardClient
      student={student}
      upcomingSchedules={upcomingSchedules}
      scheduleHistory={scheduleHistory}
      worksheets={worksheets}
      redemptions={redemptions}
    />
  );
}
