import { Suspense } from "react";
import { getWorksheetsByBranch, getStudents, getLabels, getTeachers, getAssessmentTemplates, getActiveBranchName } from "@/lib/actions";
import { WorksheetClientWrapper } from "./WorksheetClientWrapper";

// Batch2 hemat: hapus force-dynamic redundan — tetap dynamic otomatis via cookies().
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
      <div className="h-36 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
      <div className="h-24 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
      <div className="h-96 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}
