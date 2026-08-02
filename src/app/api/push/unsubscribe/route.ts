import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
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
