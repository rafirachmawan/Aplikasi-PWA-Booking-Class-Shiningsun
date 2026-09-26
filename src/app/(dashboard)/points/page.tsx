import { Suspense } from "react";
import { getStudents, getActiveBranchName, getPointRedemptions, getWorksheetAttendanceHistory } from "@/lib/actions";
import { PointsClientWrapper } from "./PointsClientWrapper";

export const dynamic = 'force-dynamic';

export default async function PointsPage() {
  // 4 query independen di-streaming (hasil & props sama persis).
  return (
    <Suspense fallback={<PointsPageSkeleton />}>
      <PointsData />
    </Suspense>
  );
}

async function PointsData() {
  const [students, activeBranchName, redemptions, attendanceHistory] =
    await Promise.all([
      getStudents(),
      getActiveBranchName(),
      getPointRedemptions(),
      getWorksheetAttendanceHistory(),
    ]);

  return (
    <PointsClientWrapper
      students={students}
      activeBranchName={activeBranchName}
      initialRedemptions={redemptions}
      initialAttendanceHistory={attendanceHistory}
    />
  );
}

function PointsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div className="h-64 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
    </div>
  );
}
