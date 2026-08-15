import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BackButtonHandler } from "@/components/layout/BackButtonHandler";
import { SidebarProvider } from "@/lib/SidebarContext";
import { getCurrentUserRole, getBranches, getBranchId, syncUserIdentity } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await syncUserIdentity();
  const role = await getCurrentUserRole();
  const currentBranchId = await getBranchId();
  let branches = [];
  
  // Set default empty branch selection instead of "ALL" initially if not set
  let effectiveBranchId = currentBranchId;
  if (!effectiveBranchId && role === 'SUPERADMIN') {
    effectiveBranchId = ""; 
  }

  if (role === 'SUPERADMIN') {
    branches = await getBranches();
  }

  // Fetch nama dan nama cabang
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userName = "Admin";
  let branchName = "Pusat";
  
  if (user) {
    const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single();
    if (profile) userName = profile.name;
  }
  
  if (effectiveBranchId && effectiveBranchId !== "ALL") {
    const { data: currentBranch } = await supabase.from('branches').select('name').eq('id', effectiveBranchId).single();
    if (currentBranch) branchName = currentBranch.name;
  } else if (effectiveBranchId === "ALL") {
    branchName = "Semua Cabang";
  } else {
    branchName = "Pilih Cabang";
  }

  return (
    <SidebarProvider>
      <BackButtonHandler />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Native HTML checkbox for CSS-only sidebar toggle fallback */}
        <input type="checkbox" id="sidebar-drawer-toggle" className="peer/sidebar hidden" />

        <Sidebar 
          userName={userName} 
          branchName={branchName} 
          role={role} 
        />
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
