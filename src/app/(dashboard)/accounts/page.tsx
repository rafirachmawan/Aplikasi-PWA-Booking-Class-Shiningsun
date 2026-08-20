import { redirect } from "next/navigation";
import { getCurrentUserRole, getAllUsers } from "@/lib/actions";
import { AccountsClientWrapper } from "./AccountsClientWrapper";
import { ResetDataSection } from "@/components/features/dashboard/ResetDataSection";

export const metadata = {
  title: "Kelola Akun | ShiningSun",
  description: "Manajemen akun cabang dan superadmin",
};

export default async function AccountsPage() {
  const role = await getCurrentUserRole();

  if (role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const users = await getAllUsers();

  return (
    <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 pb-24 lg:pb-8">
      <AccountsClientWrapper initialUsers={users} />

      {/* Reset Semua Data — khusus superadmin, hanya di Kelola Akun */}
      <ResetDataSection isSuperadmin showCache={false} />
    </main>
  );
}
