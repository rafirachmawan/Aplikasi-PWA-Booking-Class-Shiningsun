import { getStudents, getLabels, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { StudentClientWrapper } from "./StudentClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  // Cek apakah superadmin belum pilih cabang
  const role = await getCurrentUserRole();
  const branchId = await getBranchId();
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Kelola Siswa" />;
  }

  const activeBranchName = role === 'SUPERADMIN' ? await getActiveBranchName() : null;

  const students = await getStudents();
  const labels = await getLabels();
  
  return <StudentClientWrapper initialStudents={students} labels={labels} activeBranchName={activeBranchName} />;
}
