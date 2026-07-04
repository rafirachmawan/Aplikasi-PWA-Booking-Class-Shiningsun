import { getClasses, getLabels } from "@/lib/actions";
import { MasterClientWrapper } from "./MasterClientWrapper";

export const dynamic = 'force-dynamic';

export default async function MasterDataPage() {
  const classes = await getClasses();
  const labels = await getLabels();

  return <MasterClientWrapper classes={classes} labels={labels} />;
}
