import { getStudents, getActiveBranchName, getPointRedemptions } from "@/lib/actions";
import { PointsClientWrapper } from "./PointsClientWrapper";

export const dynamic = 'force-dynamic';

export default async function PointsPage() {
  const students = await getStudents();
  const activeBranchName = await getActiveBranchName();
  const redemptions = await getPointRedemptions();

  return (
    <PointsClientWrapper
      students={students}
      activeBranchName={activeBranchName}
      initialRedemptions={redemptions}
    />
  );
}
