import { Suspense } from "react";
import { getStudents, getLabels, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { StudentClientWrapper } from "./StudentClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

// Batch2 hemat: hapus force-dynamic redundan — tetap dynamic otomatis via cookies().
export default async function StudentsPage() {
  // Gate cepat & kecil (hasil sama): superadmin wajib pilih cabang dulu.
  const [role, branchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Kelola Siswa" />;
  }

  // Data berat di-streaming (query & props sama persis, hanya tidak blocking).
  return (
    <Suspense fallback={<StudentsPageSkeleton />}>
      <StudentsData role={role} />
    </Suspense>
  );
}

// Query & props sama persis seperti sebelumnya.
async function StudentsData({ role }: { role: string | null }) {
  const [students, labels, activeBranchName] = await Promise.all([
    getStudents(),
    getLabels(),
    role === 'SUPERADMIN' ? getActiveBranchName() : Promise.resolve(null),
  ]);

  return <StudentClientWrapper initialStudents={students} labels={labels} activeBranchName={activeBranchName} />;
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
