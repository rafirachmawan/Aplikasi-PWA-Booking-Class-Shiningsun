import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/lib/SidebarContext";
import { getCurrentUserRole, getBranches, getBranchId } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentUserRole();
  const currentBranchId = await getBranchId();
  let branches = [];
  
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
  
  const { data: currentBranch } = await supabase.from('branches').select('name').eq('id', currentBranchId).single();
  if (currentBranch) branchName = currentBranch.name;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar userName={userName} branchName={branchName} />
        <div className="lg:pl-72 flex flex-col min-h-screen">
          <Header role={role} branches={branches} currentBranchId={currentBranchId} />
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
