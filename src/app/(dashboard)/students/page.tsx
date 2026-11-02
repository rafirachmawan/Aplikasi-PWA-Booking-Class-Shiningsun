import { Suspense } from "react";
import {
  getPaginatedStudents,
  getLabels,
  getClasses,
  getCurrentUserRole,
  getBranchId,
  getActiveBranchName,
} from "@/lib/actions";
import { StudentClientWrapper } from "./StudentClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

// Batch2 hemat: hapus force-dynamic redundan — tetap dynamic otomatis via cookies().
export default async function StudentsPage() {
  // Gate cepat & kecil (hasil sama): superadmin wajib pilih cabang dulu.
  const [role, branchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  if (role === "SUPERADMIN" && !branchId) {
    return <NoBranchSelected pageName="Kelola Siswa" />;
  }

  // Data berat di-streaming (hanya me-load 10 siswa halaman pertama saat awal buka).
  return (
    <Suspense fallback={<StudentsPageSkeleton />}>
      <StudentsData role={role} />
    </Suspense>
  );
}

async function StudentsData({ role }: { role: string | null }) {
  const [initialPagination, labels, classes, activeBranchName] =
    await Promise.all([
      getPaginatedStudents({ page: 1, pageSize: 10 }),
      getLabels(),
      getClasses(),
      role === "SUPERADMIN" ? getActiveBranchName() : Promise.resolve(null),
    ]);

  return (
    <StudentClientWrapper
      initialStudents={initialPagination.students}
      initialPagination={initialPagination}
      labels={labels}
      classes={classes}
      activeBranchName={activeBranchName}
    />
  );
}

function StudentsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-36 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
      <div className="h-24 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
      <div className="h-64 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}
