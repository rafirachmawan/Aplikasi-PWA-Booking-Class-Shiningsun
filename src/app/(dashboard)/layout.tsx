import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BackButtonHandler } from "@/components/layout/BackButtonHandler";
import { SessionKeepAlive } from "@/components/features/auth/SessionKeepAlive";
import { SidebarProvider } from "@/lib/SidebarContext";
import {
  getCurrentUserRole,
  getBranchId,
  syncUserIdentity,
} from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Parallelkan panggilan yang saling bebas agar durasi fungsi Vercel
  // tetap pendek (aman dari limit 10 detik) dan halaman lebih cepat.
  const supabase = await createClient();
  const [, role, currentBranchId, userRes] = await Promise.all([
    syncUserIdentity(),
    getCurrentUserRole(),
    getBranchId(),
    supabase.auth.getUser(),
  ]);
  const user = userRes.data.user;

  let effectiveBranchId = currentBranchId;
  if (!effectiveBranchId && role === "SUPERADMIN") {
    effectiveBranchId = "";
  }

  // Fetch nama dan nama cabang (parallel)
  let userName = "Admin";
  let branchName = "Pusat";

  const profilePromise = user
    ? supabase.from("users").select("name").eq("id", user.id).single()
    : Promise.resolve({ data: null });
  const branchPromise =
    effectiveBranchId && effectiveBranchId !== "ALL"
      ? supabase
          .from("branches")
          .select("name")
          .eq("id", effectiveBranchId)
          .single()
      : Promise.resolve({ data: null });

  const [profileRes, branchRes] = await Promise.all([
    profilePromise,
    branchPromise,
  ]);
  if ((profileRes.data as any)?.name) userName = (profileRes.data as any).name;
  if ((branchRes.data as any)?.name) branchName = (branchRes.data as any).name;

  if (effectiveBranchId === "ALL") {
    branchName = "Semua Cabang";
  } else if (!effectiveBranchId) {
    branchName = "Pilih Cabang";
  }

  return (
    <SidebarProvider>
      <BackButtonHandler />
      <SessionKeepAlive />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Native HTML checkbox for CSS-only sidebar toggle fallback */}
        <input
          type="checkbox"
          id="sidebar-drawer-toggle"
          className="peer/sidebar hidden"
        />

        <Sidebar userName={userName} branchName={branchName} role={role} />
        <div className="lg:pl-72 flex flex-col min-h-screen">
          <Header role={role} branchName={branchName} />
          <main className="flex-1">
            <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
