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
      `<html><body><h1>Error</h1><p>${error}</p><a href="/">Kembali</a></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<html><body><h1>Error</h1><p>Tidak ada kode otorisasi.</p><a href="/">Kembali</a></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      `<html><body><h1>Error</h1><p>OAuth credentials belum dikonfigurasi.</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
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
        `<html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;">
          <h1 style="color:#f59e0b;">⚠️ Tidak mendapatkan Refresh Token</h1>
          <p>Google tidak mengembalikan refresh_token. Coba ulangi proses otorisasi.</p>
          <a href="/api/auth/gdrive" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">Coba Lagi</a>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Tampilkan halaman sukses berisi refresh token
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Google Drive Terhubung!</title>
      </head>
      <body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;background:#f0fdf4;">
        <div style="background:white;padding:32px;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <h1 style="color:#16a34a;font-size:24px;">✅ Google Drive Berhasil Terhubung!</h1>
          <p style="color:#64748b;">Salin Refresh Token di bawah ini dan masukkan ke file <code>.env.local</code> di proyek Anda:</p>
          <div style="background:#f1f5f9;padding:16px;border-radius:12px;word-break:break-all;font-family:monospace;font-size:13px;text-align:left;border:2px solid #e2e8f0;">
            GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}
          </div>
          <br>
          <button onclick="navigator.clipboard.writeText('${refreshToken}').then(()=>this.textContent='✅ Tersalin!')" 
            style="padding:12px 24px;background:#2563eb;color:white;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;">
            📋 Salin Refresh Token
          </button>
          <p style="margin-top:20px;color:#94a3b8;font-size:12px;">Setelah disimpan, restart server development Anda lalu upload foto akan otomatis masuk ke Google Drive!</p>
          <a href="/worksheets" style="display:inline-block;margin-top:10px;padding:12px 24px;background:#16a34a;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">🏠 Kembali ke Aplikasi</a>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err: any) {
    return new NextResponse(
      `<html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;text-align:center;">
        <h1 style="color:#dc2626;">❌ Error</h1>
        <p>${err.message}</p>
        <a href="/api/auth/gdrive" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">Coba Lagi</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
