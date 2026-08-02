import { NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, branchId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Objek notifikasi tidak valid" },
        { status: 400 }
      );
    }

    await savePushSubscription(subscription, branchId);

    return NextResponse.json({ success: true, message: "Berhasil mendaftarkan notifikasi PWA" });
  } catch (error: any) {
    console.error("Error in /api/push/subscribe:", error);

    const errorMessage = error?.message || "";
    if (errorMessage.includes("push_subscriptions") || error?.code === "PGRST205") {
      return NextResponse.json(
        {
          error: "Tabel 'push_subscriptions' belum dibuat di Supabase SQL Editor. Silakan jalankan script dari file 'supabase/push_subscriptions.sql'.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Gagal menyimpan notifikasi" },
      { status: 500 }
    );
  }
}
