import { Suspense } from "react";
import { getStudents, getLabels, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { StudentClientWrapper } from "./StudentClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

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
      <div className="h-40 rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div className="h-64 rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
    </div>
  );
}
