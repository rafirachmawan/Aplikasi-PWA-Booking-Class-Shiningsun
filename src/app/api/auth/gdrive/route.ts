import { NextRequest, NextResponse } from "next/server";

/**
 * Halaman otorisasi Google Drive OAuth2
 * Mengarahkan pengguna ke Google untuk memberikan izin upload ke Drive mereka.
 * Setelah selesai, Google akan redirect ke /api/auth/gdrive/callback
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_ID belum dikonfigurasi" }, { status: 500 });
  }

  // Determine redirect URI based on request origin
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/gdrive/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
