import { getClasses, getLabels, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { MasterClientWrapper } from "./MasterClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function MasterDataPage() {
  // Cek apakah superadmin belum pilih cabang
  const role = await getCurrentUserRole();
  const branchId = await getBranchId();
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Master Data" />;
  }

  const activeBranchName = role === 'SUPERADMIN' ? await getActiveBranchName() : null;

  const classes = await getClasses();
  const labels = await getLabels();

  return <MasterClientWrapper classes={classes} labels={labels} activeBranchName={activeBranchName} />;
}
