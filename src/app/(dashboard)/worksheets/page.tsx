import { Suspense } from "react";
import { getWorksheetsByBranch, getStudents, getLabels, getTeachers, getAssessmentTemplates, getActiveBranchName } from "@/lib/actions";
import { WorksheetClientWrapper } from "./WorksheetClientWrapper";

export const dynamic = 'force-dynamic';

export default async function WorksheetsPage() {
  // 6 query berat di-streaming (query & props sama persis, hanya tidak blocking).
  return (
    <Suspense fallback={<WorksheetsPageSkeleton />}>
      <WorksheetsData />
    </Suspense>
  );
}

async function WorksheetsData() {
  const [
    worksheets,
    students,
    labels,
    activeBranchName,
    teachers,
    templates,
  ] = await Promise.all([
    getWorksheetsByBranch(),
    getStudents(),
    getLabels(),
    getActiveBranchName(),
    getTeachers(),
    getAssessmentTemplates(),
  ]);

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

function WorksheetsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div className="h-96 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
    </div>
  );
}
