import { NextRequest, NextResponse } from "next/server";

/**
 * Callback dari Google OAuth2.
 * Menerima authorization code, menukarnya dengan refresh_token,
 * lalu menampilkan halaman sukses berisi refresh_token untuk disimpan ke .env.local
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;"><h1 style="color:#dc2626;">❌ Error</h1><p>${error}</p><a href="/" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">Kembali</a></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;"><h1 style="color:#dc2626;">❌ Error</h1><p>Tidak ada kode otorisasi.</p><a href="/" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">Kembali</a></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;"><h1 style="color:#dc2626;">❌ Error</h1><p>OAuth credentials belum dikonfigurasi.</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/gdrive/callback`;

  try {
    // Tukar authorization code dengan access_token + refresh_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "Token exchange failed");
    }

    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      return new NextResponse(
        `<!DOCTYPE html><html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;">
          <h1 style="color:#f59e0b;">⚠️ Tidak mendapatkan Refresh Token</h1>
          <p>Google tidak mengembalikan refresh_token. Silakan coba otorisasi ulang.</p>
          <a href="/api/auth/gdrive" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">Coba Otorisasi Lagi</a>
        </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Update memory & environment
    const { setMemoryGDriveRefreshToken } = await import("@/app/api/upload-gdrive/route");
    setMemoryGDriveRefreshToken(refreshToken);
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN = refreshToken;

    // Simpan otomatis ke database Supabase (tabel system_settings)
    let savedToDb = false;
    let dbErrorDetail = "";
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const { createClient: createSupabaseDirect } = await import("@supabase/supabase-js");
        const supabaseDirect = createSupabaseDirect(supabaseUrl, supabaseKey);
        const { error: dbErr } = await supabaseDirect.from("system_settings").upsert(
          {
            key: "gdrive_refresh_token",
            value: refreshToken,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

        if (!dbErr) {
          savedToDb = true;
        } else {
          dbErrorDetail = dbErr.message;
          console.error("Direct upsert error to system_settings:", dbErr.message);
        }
      }

      if (!savedToDb) {
        const { createClient } = await import("@/lib/supabase/server");
        const supabaseServer = await createClient();
        const { error: dbErr } = await supabaseServer.from("system_settings").upsert(
          {
            key: "gdrive_refresh_token",
            value: refreshToken,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
        if (!dbErr) {
          savedToDb = true;
        } else if (!dbErrorDetail) {
          dbErrorDetail = dbErr.message;
          console.error("Server client upsert error to system_settings:", dbErr.message);
        }
      }
    } catch (e: any) {
      dbErrorDetail = e?.message || String(e);
      console.error("Exception saving gdrive_refresh_token to DB:", e?.message);
    }

    // Tampilkan halaman sukses berisi konfirmasi otomatis
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Google Drive Terhubung!</title>
      </head>
      <body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;background:${savedToDb ? "#f0fdf4" : "#fffbeb"};">
        <div style="background:white;padding:32px;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <h1 style="color:${savedToDb ? "#16a34a" : "#d97706"};font-size:24px;">
            ${savedToDb ? "🎉 Google Drive Berhasil Terhubung!" : "⚠️ Drive Terhubung (Memori)"}
          </h1>
          <p style="color:#334155;font-size:15px;line-height:1.6;">
            ${
              savedToDb
                ? "Akses Google Drive telah diperbarui dan <strong>tersimpan permanen ke database Supabase</strong>. Miss / Guru sekarang dapat langsung mengunggah foto Laporan Perkembangan!"
                : `Token terhubung ke memori server tetapi <strong>gagal tersimpan ke database Supabase</strong> (${dbErrorDetail}). Mohon pastikan tabel <code>system_settings</code> di Supabase memiliki izin/policy.`
            }
          </p>
          <br>
          <a href="/worksheets" style="display:inline-block;padding:14px 28px;background:${savedToDb ? "#16a34a" : "#d97706"};color:white;text-decoration:none;border-radius:12px;font-weight:bold;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
            🏠 Kembali ke Laporan Perkembangan (Worksheets)
          </a>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    return new NextResponse(
      `<!DOCTYPE html><html>
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;">
        <h1 style="color:#dc2626;">❌ Error</h1>
        <p style="color:#475569;font-weight:bold;">${err.message}</p>
        <br>
        <a href="/api/auth/gdrive" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">Coba Lagi</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
