import { Suspense } from "react";
import { getWorksheetsByBranch, getStudents, getLabels, getTeachers, getAssessmentTemplates, getActiveBranchName } from "@/lib/actions";
import { WorksheetClientWrapper } from "./WorksheetClientWrapper";

export default async function WorksheetsPage(props: {
  searchParams?: Promise<{ student_id?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const studentId = typeof searchParams?.student_id === "string" ? searchParams.student_id : undefined;

  return (
    <Suspense fallback={<WorksheetsPageSkeleton />}>
      <WorksheetsData studentId={studentId} />
    </Suspense>
  );
}

async function WorksheetsData({ studentId }: { studentId?: string }) {
  const [
    worksheets,
    students,
    labels,
    activeBranchName,
    teachers,
    templates,
  ] = await Promise.all([
    getWorksheetsByBranch(studentId),
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
