import { getClasses, getLabels, getTeachers, getAssessmentTemplates, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { MasterClientWrapper } from "./MasterClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function MasterDataPage() {
  const role = await getCurrentUserRole();
  const branchId = await getBranchId();
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Master Data" />;
  }

  const activeBranchName = role === 'SUPERADMIN' ? await getActiveBranchName() : null;

  const classes = await getClasses();
  const labels = await getLabels();
  const teachers = await getTeachers();
  const templates = await getAssessmentTemplates();

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

