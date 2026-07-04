import { getStudents, getLabels } from "@/lib/actions";
import { StudentClientWrapper } from "./StudentClientWrapper";

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const students = await getStudents();
  const labels = await getLabels();
  
  return <StudentClientWrapper initialStudents={students} labels={labels} />;
}
