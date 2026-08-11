import { getAssessmentTemplates, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { TemplateClientWrapper } from "./TemplateClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const role = await getCurrentUserRole();
  const branchId = await getBranchId();
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Template Penilaian" />;
  }

  const activeBranchName = role === 'SUPERADMIN' ? await getActiveBranchName() : null;
  const templates = await getAssessmentTemplates();

  return <TemplateClientWrapper templates={templates} activeBranchName={activeBranchName} role={role} />;
}
