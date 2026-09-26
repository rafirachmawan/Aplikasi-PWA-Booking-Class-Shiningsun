import { getClasses, getLabels, getTeachers, getAssessmentTemplates, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { MasterClientWrapper } from "./MasterClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function MasterDataPage() {
  const [role, branchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Master Data" />;
  }

  // Paralel, hasil gabungan sama
  const [classes, labels, teachers, templates, activeBranchName] =
    await Promise.all([
      getClasses(),
      getLabels(),
      getTeachers(),
      getAssessmentTemplates(),
      role === 'SUPERADMIN' ? getActiveBranchName() : Promise.resolve(null),
    ]);

  return (
    <MasterClientWrapper
      classes={classes}
      labels={labels}
      teachers={teachers}
      templates={templates}
      activeBranchName={activeBranchName}
      role={role}
    />
  );
}

