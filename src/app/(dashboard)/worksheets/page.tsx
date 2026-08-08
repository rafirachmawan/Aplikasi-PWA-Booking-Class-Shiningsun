import { getWorksheetsByBranch, getStudents, getLabels, getActiveBranchName } from "@/lib/actions";
import { WorksheetClientWrapper } from "./WorksheetClientWrapper";

export const dynamic = 'force-dynamic';

export default async function WorksheetsPage() {
  const [worksheets, students, labels, activeBranchName] = await Promise.all([
    getWorksheetsByBranch(),
    getStudents(),
    getLabels(),
    getActiveBranchName(),
  ]);

  return (
    <WorksheetClientWrapper
      initialWorksheets={worksheets}
      students={students}
      labels={labels}
      activeBranchName={activeBranchName}
    />
  );
}
