import { getAssessmentTemplates, getLabels, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { TemplateClientWrapper } from "./TemplateClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const [role, branchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Template Penilaian" />;
  }

  const [activeBranchName, templates, labels] = await Promise.all([
    role === 'SUPERADMIN' ? getActiveBranchName() : Promise.resolve(null),
    getAssessmentTemplates(),
    getLabels(),
  ]);

  return (
    <TemplateClientWrapper
      templates={templates}
      labels={labels}
      activeBranchName={activeBranchName}
      role={role}
    />
  );
}
