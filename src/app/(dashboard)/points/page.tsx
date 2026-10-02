import { Suspense } from "react";
import { getStudents, getActiveBranchName, getPointRedemptions, getWorksheetAttendanceHistory } from "@/lib/actions";
import { PointsClientWrapper } from "./PointsClientWrapper";

// Batch2 hemat: hapus force-dynamic redundan — tetap dynamic otomatis via cookies().
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
      <div className="h-40 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
      <div className="h-64 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}
