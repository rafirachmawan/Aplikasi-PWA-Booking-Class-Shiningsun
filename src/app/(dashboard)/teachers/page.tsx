import { getTeachers, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { TeacherClientWrapper } from "./TeacherClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

// Batch2 hemat: hapus force-dynamic redundan — tetap dynamic otomatis via cookies().
export default async function TeachersPage() {
  const [role, branchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Kelola Guru" />;
  }

  const [activeBranchName, teachers] = await Promise.all([
    role === 'SUPERADMIN' ? getActiveBranchName() : Promise.resolve(null),
    getTeachers(),
  ]);

  return <TeacherClientWrapper teachers={teachers} activeBranchName={activeBranchName} role={role} />;
}
