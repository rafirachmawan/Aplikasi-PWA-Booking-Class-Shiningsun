import { getStudents, getActiveBranchName, getPointRedemptions, getWorksheetAttendanceHistory } from "@/lib/actions";
import { PointsClientWrapper } from "./PointsClientWrapper";

export const dynamic = 'force-dynamic';

export default async function PointsPage() {
  const students = await getStudents();
  const activeBranchName = await getActiveBranchName();
  const redemptions = await getPointRedemptions();
  const attendanceHistory = await getWorksheetAttendanceHistory();

  return (
    <PointsClientWrapper
      students={students}
      activeBranchName={activeBranchName}
      initialRedemptions={redemptions}
      initialAttendanceHistory={attendanceHistory}
    />
  );
}
