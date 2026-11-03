import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/actions/_internal";

export async function POST(req: Request) {
  try {
    // Hanya admin yang login (tabel push_subscriptions tidak lagi publik).
    try {
      await requireUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
      // Service role: tabel push_subscriptions tidak dapat diakses anon
      // setelah RLS diketatkan. Perilaku endpoint tidak berubah.
      const supabase = getAdminClient();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }

    return NextResponse.json({ success: true, message: "Unsubscribed successfully" });
  } catch (error: any) {
    console.error("Error in /api/push/unsubscribe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
