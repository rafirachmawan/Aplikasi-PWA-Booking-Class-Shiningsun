import { getTeachers, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { TeacherClientWrapper } from "./TeacherClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function TeachersPage() {
  const role = await getCurrentUserRole();
  const branchId = await getBranchId();
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Kelola Guru" />;
  }

  const activeBranchName = role === 'SUPERADMIN' ? await getActiveBranchName() : null;
  const teachers = await getTeachers();

  return <TeacherClientWrapper teachers={teachers} activeBranchName={activeBranchName} role={role} />;
}
