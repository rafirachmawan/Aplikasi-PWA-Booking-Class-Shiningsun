import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWebPushNotification } from "@/lib/push";

export async function GET(req: Request) {
  // Authorization check (Verify CRON_SECRET or allow GET in dev)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "shiningsun_daily_cron_secret_key_2026";

  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized cron call" }, { status: 401 });
  }

  try {
    // 1. Get today's date string (YYYY-MM-DD) in WIB timezone (+07:00)
    const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    const dayName = new Date().toLocaleDateString("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" });

    // 2. Fetch all schedule slots for today
    const { data: todaySlots, error: slotErr } = await supabase
      .from("schedule_slots")
      .select("id, branch_id")
      .eq("date", todayStr);

    if (slotErr) {
      console.error("Cron slot fetch error:", slotErr);
      return NextResponse.json({ error: slotErr.message }, { status: 500 });
    }

    const slotIds = (todaySlots || []).map((s) => s.id);

    // Map branch_id -> slot_id array
    const branchSlotsMap: Record<string, string[]> = {};
    for (const slot of todaySlots || []) {
      const bId = slot.branch_id || "ALL";
      if (!branchSlotsMap[bId]) branchSlotsMap[bId] = [];
      branchSlotsMap[bId].push(slot.id);
    }

    // 3. Fetch schedule bookings for today's slots
    let totalBookingsCount = 0;
    const branchBookingCountMap: Record<string, number> = {};

    if (slotIds.length > 0) {
      const { data: bookings } = await supabase
        .from("schedule_student")
        .select("student_id, slot_id")
        .in("slot_id", slotIds);

      if (bookings) {
        totalBookingsCount = bookings.length;

        // Group count by slot -> branch
        const slotBranchMap: Record<string, string> = {};
        for (const slot of todaySlots || []) {
          slotBranchMap[slot.id] = slot.branch_id || "ALL";
        }

        for (const b of bookings) {
          const bId = slotBranchMap[b.slot_id] || "ALL";
          branchBookingCountMap[bId] = (branchBookingCountMap[bId] || 0) + 1;
        }
      }
    }

    // 4. Fetch all active device push subscriptions
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subErr || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: "Cron finished. No device subscriptions registered.",
        today: todayStr,
        totalScheduledStudents: totalBookingsCount,
      });
    }

    // 5. Send Web Push to all devices
    let sentCount = 0;

    for (const sub of subscriptions) {
      const branchCount =
        sub.branch_id && sub.branch_id !== "ALL"
          ? branchBookingCountMap[sub.branch_id] || 0
          : totalBookingsCount;

      const title = `ShiningSun - Jadwal Hari ${dayName}`;
      const body =
        branchCount > 0
          ? `Hari ini ada ${branchCount} siswa terdaftar untuk kelas les!`
          : `Tidak ada jadwal siswa untuk hari ini.`;

      const result = await sendWebPushNotification(sub, {
        title,
        body,
        badgeCount: branchCount,
        url: "/dashboard",
      });

      if (result.success) sentCount++;
    }

    return NextResponse.json({
      success: true,
      today: todayStr,
      dayName,
      totalScheduledStudents: totalBookingsCount,
      totalSubscribers: subscriptions.length,
      notificationsSent: sentCount,
    });
  } catch (error: any) {
    console.error("Cron execution error:", error);
    return NextResponse.json({ error: error.message || "Cron error" }, { status: 500 });
  }
}
