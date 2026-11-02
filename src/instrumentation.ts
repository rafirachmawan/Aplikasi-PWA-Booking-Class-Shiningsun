export async function register() {
  // Hanya jalankan di runtime Node.js, mode production, dan BUKAN di Vercel
  // (di Vercel, jadwal sudah dijalankan oleh Vercel Cron melalui vercel.json).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.VERCEL) return;
  if (process.env.NODE_ENV !== "production") return;

  const globalWithCron = globalThis as typeof globalThis & {
    __shiningsunDailyCronStarted?: boolean;
    __shiningsunLastCronDateWib?: string;
  };

  if (globalWithCron.__shiningsunDailyCronStarted) return;
  globalWithCron.__shiningsunDailyCronStarted = true;

  const checkAndRunDailyCron = async () => {
    try {
      // Waktu Indonesia Barat (WIB / UTC+7)
      const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const wibHour = wibNow.getUTCHours();
      const todayWibStr = `${wibNow.getUTCFullYear()}-${String(
        wibNow.getUTCMonth() + 1,
      ).padStart(2, "0")}-${String(wibNow.getUTCDate()).padStart(2, "0")}`;

      // Jalankan sekali sehari pada pukul 05:00 WIB (sama dengan "0 22 * * *" UTC di vercel.json)
      if (
        wibHour === 5 &&
        globalWithCron.__shiningsunLastCronDateWib !== todayWibStr
      ) {
        globalWithCron.__shiningsunLastCronDateWib = todayWibStr;
        const cronSecret =
          process.env.CRON_SECRET || "shiningsun_daily_cron_secret_key_2026";
        const { GET } = await import(
          "./app/api/cron/daily-notification/route"
        );
        const req = new Request(
          "http://localhost/api/cron/daily-notification",
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${cronSecret}`,
            },
          },
        );
        await GET(req);
      }
    } catch (err) {
      console.error("[VPS Cron Scheduler] Error running daily cron:", err);
    }
  };

  const timer = setInterval(checkAndRunDailyCron, 60 * 1000);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

