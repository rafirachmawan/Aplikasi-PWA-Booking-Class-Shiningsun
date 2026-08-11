import { getWorksheetsByBranch, getStudents, getLabels, getTeachers, getAssessmentTemplates, getActiveBranchName } from "@/lib/actions";
import { WorksheetClientWrapper } from "./WorksheetClientWrapper";

export const dynamic = 'force-dynamic';

export default async function WorksheetsPage() {
  const worksheets = await getWorksheetsByBranch();
  const students = await getStudents();
  const labels = await getLabels();
  const activeBranchName = await getActiveBranchName();
  const teachers = await getTeachers();
  const templates = await getAssessmentTemplates();

  return (
    <WorksheetClientWrapper
      initialWorksheets={worksheets}
      students={students}
      labels={labels}
      activeBranchName={activeBranchName}
      teachers={teachers}
      templates={templates}
    />
  );
}
