import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWebPushNotification } from "@/lib/push";
import { formatShortDate } from "@/lib/dateUtils";

type CGSessionItem = {
  studentName: string;
  branchId: string;
  date: string;
  time: string;
};

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
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayName = DAYS[now.getDay()];

    // 2. Fetch all CG students and their scheduled slots
    const { data: cgStudents, error: cgErr } = await supabase
      .from("students")
      .select(`
        id, name, nickname, status, branch_id,
        schedule_student (
          slot_id,
          schedule_slots ( id, date, time, branch_id )
        )
      `)
      .eq("status", "CG");

    if (cgErr) {
      console.error("Cron CG student fetch error:", cgErr);
      return NextResponse.json({ error: cgErr.message }, { status: 500 });
    }

    const allTodaySessions: CGSessionItem[] = [];
    const allUpcomingSessions: CGSessionItem[] = [];

    if (cgStudents && cgStudents.length > 0) {
      cgStudents.forEach((student) => {
        const displayName = student.nickname || student.name || "Siswa CG";
        const studentBranch = student.branch_id || "ALL";
        const bookings = student.schedule_student || [];

        bookings.forEach((b: any) => {
          const slot = Array.isArray(b.schedule_slots) ? b.schedule_slots[0] : b.schedule_slots;
          if (!slot || !slot.date) return;

          const slotBranch = slot.branch_id || studentBranch;
          const timeShort = slot.time ? slot.time.substring(0, 5) : "";

          const session: CGSessionItem = {
            studentName: displayName,
            branchId: slotBranch,
            date: slot.date,
            time: timeShort,
          };

          if (slot.date === todayStr) {
            allTodaySessions.push(session);
          } else if (slot.date > todayStr) {
            allUpcomingSessions.push(session);
          }
        });
      });
    }

    // 3. Fetch all active device push subscriptions
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subErr || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: "Cron finished. No device subscriptions registered.",
        today: todayStr,
        totalCGToday: allTodaySessions.length,
        totalCGUpcoming: allUpcomingSessions.length,
      });
    }

    // 4. Helper function to generate custom CG notification payload
    const getNotificationPayload = (branchId: string) => {
      const todaySessions =
        branchId && branchId !== "ALL"
          ? allTodaySessions.filter((s) => s.branchId === branchId)
          : allTodaySessions;

      const upcomingSessions =
        branchId && branchId !== "ALL"
          ? allUpcomingSessions.filter((s) => s.branchId === branchId)
          : allUpcomingSessions;

      if (todaySessions.length > 0) {
        const title = `🎯 Jadwal CG Hari Ini (${dayName})`;
        let bodyList = "";
        if (todaySessions.length <= 3) {
          bodyList = todaySessions.map((s) => `${s.studentName} (${s.time})`).join(", ");
        } else {
          const firstTwo = todaySessions.slice(0, 2).map((s) => `${s.studentName} (${s.time})`).join(", ");
          bodyList = `${firstTwo}, +${todaySessions.length - 2} lainnya`;
        }

        const body = `Hari ini ada ${todaySessions.length} siswa CG: ${bodyList}. Silakan persiapkan sesi CG!`;
        return { title, body, badgeCount: todaySessions.length };
      }

      if (upcomingSessions.length > 0) {
        // Sort by date asc, then time asc
        const sortedUpcoming = [...upcomingSessions].sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        });

        const nextSession = sortedUpcoming[0];
        const formattedNextDate = formatShortDate(nextSession.date);

        const title = `📅 Status CG Hari Ini (${dayName})`;
        const body = `Hari ini tidak ada sesi CG. Sesi CG berikutnya: ${nextSession.studentName} pada ${formattedNextDate} (${nextSession.time} WIB).`;
        return { title, body, badgeCount: 0 };
      }

      const title = `📅 Status CG Hari Ini (${dayName})`;
      const body = `Hari ini & mendatang tidak ada jadwal siswa Coba Gratis (CG).`;
      return { title, body, badgeCount: 0 };
    };

    // 5. Send Web Push to all devices
    let sentCount = 0;

    for (const sub of subscriptions) {
      const { title, body, badgeCount } = getNotificationPayload(sub.branch_id || "ALL");

      const result = await sendWebPushNotification(sub, {
        title,
        body,
        badgeCount,
        url: "/dashboard",
      });

      if (result.success) sentCount++;
    }

    return NextResponse.json({
      success: true,
      today: todayStr,
      dayName,
      totalCGToday: allTodaySessions.length,
      totalCGUpcoming: allUpcomingSessions.length,
      totalSubscribers: subscriptions.length,
      notificationsSent: sentCount,
    });
  } catch (error: any) {
    console.error("Cron execution error:", error);
    return NextResponse.json({ error: error.message || "Cron error" }, { status: 500 });
  }
}
