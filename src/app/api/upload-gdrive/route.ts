import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

let memoryGDriveRefreshToken: string | null = null;

export function setMemoryGDriveRefreshToken(token: string | null) {
  memoryGDriveRefreshToken = token;
}

async function getStoredRefreshToken(): Promise<string | null> {
  if (memoryGDriveRefreshToken) return memoryGDriveRefreshToken;

  // 1. Cek database Supabase terlebih dahulu (token aktif terbaru tersimpan di sini)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const { createClient: createSupabaseDirect } = await import("@supabase/supabase-js");
      const supabaseDirect = createSupabaseDirect(supabaseUrl, supabaseKey);
      const { data } = await supabaseDirect
        .from("system_settings")
        .select("value")
        .eq("key", "gdrive_refresh_token")
        .maybeSingle();

      if (data?.value) {
        memoryGDriveRefreshToken = data.value;
        return data.value;
      }
    }
  } catch (e) {
    console.warn("Direct query failed for gdrive_refresh_token:", e);
  }

  try {
    const supabaseServer = await createClient();
    const { data } = await supabaseServer
      .from("system_settings")
      .select("value")
      .eq("key", "gdrive_refresh_token")
      .maybeSingle();

    if (data?.value) {
      memoryGDriveRefreshToken = data.value;
      return data.value;
    }
  } catch (err) {
    console.warn("Could not read gdrive_refresh_token from system_settings DB:", err);
  }

  // 2. Fallback ke process.env jika belum ada di database
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    return process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  }

  return null;
}

/**
 * Mendapatkan access_token baru dari refresh_token via OAuth2
 */
async function getAccessTokenFromRefreshToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.error === "invalid_grant" || (data.error_description && data.error_description.includes("grant"))) {
      setMemoryGDriveRefreshToken(null);
      throw new Error(
        "Akses Google Drive telah kadaluarsa atau dicabut. Silakan buka /api/auth/gdrive untuk menghubungkan kembali."
      );
    }
    throw new Error(
      `Google OAuth refresh error: ${data.error_description || data.error || JSON.stringify(data)}`
    );
  }

  // JIKA GOOGLE MENGEMBALIKAN REFRESH TOKEN BARU (TOKEN ROTATION), SIMPAN AUTOMATIS KE DB & MEMORI
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    console.log("Google issued a rotated refresh token. Updating DB & memory...");
    setMemoryGDriveRefreshToken(data.refresh_token);
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN = data.refresh_token;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const { createClient: createSupabaseDirect } = await import("@supabase/supabase-js");
        const supabaseDirect = createSupabaseDirect(supabaseUrl, supabaseKey);
        await supabaseDirect.from("system_settings").upsert(
          {
            key: "gdrive_refresh_token",
            value: data.refresh_token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }
    } catch (e) {
      console.warn("Failed to persist rotated refresh token to DB:", e);
    }
  }

  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = await getStoredRefreshToken();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        {
          error:
            "Google Drive belum terhubung. Silakan buka /api/auth/gdrive untuk otorisasi terlebih dahulu.",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Tidak ada file yang diunggah" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = `lampiran_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const mimeType = file.type || "image/jpeg";

    // 1. Dapatkan access token dari refresh token
    const accessToken = await getAccessTokenFromRefreshToken(
      clientId,
      clientSecret,
      refreshToken
    );

    // 2. Upload file ke Google Drive (multipart)
    const metadata: Record<string, unknown> = { name: fileName };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = Buffer.concat([
      Buffer.from(
        delimiter +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n`
      ),
      fileBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    const fileData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(
        `GDrive Upload Error: ${fileData.error?.message || JSON.stringify(fileData.error) || "Gagal mengunggah file"}`
      );
    }

    // 3. Set izin file ke publik (anyone reader) agar orang tua bisa melihat
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );

    const webViewLink = `https://drive.google.com/file/d/${fileData.id}/view`;
    const directLink = `https://drive.google.com/uc?export=download&id=${fileData.id}`;

    return NextResponse.json({
      success: true,
      provider: "gdrive",
      fileId: fileData.id,
      gdriveLink: webViewLink,
      directLink: directLink,
    });
  } catch (err: any) {
    console.error("GDrive OAuth2 Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah file ke Google Drive" },
      { status: 500 }
    );
  }
}
