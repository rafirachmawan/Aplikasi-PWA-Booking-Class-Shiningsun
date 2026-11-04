import { NextRequest, NextResponse } from "next/server";
import {
  verifyParentAccess,
  confirmParentStudentSelection,
} from "@/lib/actions/portal";

/**
 * Fallback NATIVE untuk login portal orang tua.
 *
 * Kenapa ada file ini:
 * Di sebagian perangkat (mayoritas iOS lama), JavaScript bundle gagal dimuat /
 * hydrate. Saat itu terjadi, handler onSubmit tidak pernah terpasang sehingga
 * <form> jatuh ke submit HTML biasa. Sebelumnya itu menghasilkan GET yang
 * memuat ulang halaman login — terlihat seperti "mental" tanpa pesan error.
 *
 * Route ini menerima submit form biasa (POST), menjalankan verifikasi yang
 * SAMA dengan server action, lalu 303-redirect ke dashboard. Jadi:
 *   - JS hidup   → onSubmit + preventDefault → server action (alur lama, utuh)
 *   - JS mati    → POST ke sini → tetap bisa masuk
 *
 * Tidak ada logika bisnis baru: semuanya memakai fungsi yang sudah ada.
 */

const BASE = "/portal-ortu";

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

type Candidate = {
  id: string;
  name: string;
  nickname?: string | null;
  branch?: { name?: string | null } | null;
};

function selectionPage(opts: {
  candidates: Candidate[];
  name: string;
  pin: string;
  branchId: string;
}): string {
  const rows = opts.candidates
    .map(
      (c) => `
      <form method="post" action="${BASE}/masuk" style="margin:0 0 10px">
        <input type="hidden" name="student_name" value="${esc(opts.name)}" />
        <input type="hidden" name="access_pin" value="${esc(opts.pin)}" />
        <input type="hidden" name="branch_id" value="${esc(opts.branchId)}" />
        <input type="hidden" name="student_id" value="${esc(c.id)}" />
        <button type="submit" style="width:100%;display:flex;gap:12px;align-items:center;text-align:left;padding:14px 16px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;font:inherit;cursor:pointer">
          <span style="flex:none;width:40px;height:40px;border-radius:999px;background:#e0f2fe;color:#0369a1;display:flex;align-items:center;justify-content:center;font-weight:800">${esc(
            (c.name || "?").trim().charAt(0).toUpperCase(),
          )}</span>
          <span style="min-width:0">
            <span style="display:block;font-weight:700;color:#0f172a">${esc(c.name)}</span>
            <span style="display:block;font-size:13px;color:#64748b">Panggilan: ${esc(
              c.nickname || "-",
            )}${c.branch?.name ? ` &middot; Unit ${esc(c.branch.name)}` : ""}</span>
          </span>
        </button>
      </form>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pilih Anak - ShiningSun</title>
</head>
<body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
  <main style="max-width:480px;margin:0 auto;padding:24px 18px 40px">
    <h1 style="font-size:20px;margin:0 0 6px">Pilih Anak Anda</h1>
    <p style="font-size:14px;color:#64748b;margin:0 0 18px">Ditemukan ${opts.candidates.length} siswa dengan nama &amp; PIN yang sama. Ketuk salah satu untuk masuk.</p>
    ${rows}
    <p style="text-align:center;margin-top:18px"><a href="${BASE}" style="color:#475569;font-size:13px">Kembali</a></p>
  </main>
</body></html>`;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const name = String(form.get("student_name") ?? "").trim();
  const pin = String(form.get("access_pin") ?? "").trim();
  const branchId = String(form.get("branch_id") ?? "").trim();
  const studentId = String(form.get("student_id") ?? "").trim();
  const origin = req.nextUrl.origin;

  // Diagnosa: jalur ini HANYA terpakai kalau JavaScript gagal hydrate.
  // Catat perangkatnya supaya ketahuan versi iOS yang bermasalah.
  // Hapus setelah kasus selesai.
  try {
    console.log(
      `[PORTAL] NATIVE-POST ${new Date().toISOString()} | ${JSON.stringify({
        ua: req.headers.get("user-agent"),
        nama: name,
        pilih: studentId ? "ya" : "tidak",
      })}`,
    );
  } catch {
    // logger tidak boleh mengganggu login
  }

  try {
    // Langkah 2: orang tua memilih salah satu anak.
    if (studentId) {
      const picked = await confirmParentStudentSelection(
        studentId,
        pin,
        name,
        branchId || undefined,
      );
      if (picked.success) {
        return NextResponse.redirect(`${origin}${BASE}/dashboard`, 303);
      }
      return NextResponse.redirect(
        `${origin}${BASE}?err=${encodeURIComponent(
          picked.error || "Gagal memilih siswa.",
        )}`,
        303,
      );
    }

    // Langkah 1: verifikasi nama + PIN (fungsi yang sama dengan server action).
    const result = await verifyParentAccess(name, pin, branchId || undefined);

    if (result.success) {
      return NextResponse.redirect(`${origin}${BASE}/dashboard`, 303);
    }

    const candidates = (result.candidates ?? []) as Candidate[];
    if (result.needSelection && candidates.length > 0) {
      return new NextResponse(
        selectionPage({ candidates, name, pin, branchId }),
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.redirect(
      `${origin}${BASE}?err=${encodeURIComponent(
        result.error || "Gagal masuk. Periksa nama siswa dan PIN.",
      )}`,
      303,
    );
  } catch {
    return NextResponse.redirect(
      `${origin}${BASE}?err=${encodeURIComponent(
        "Terjadi kesalahan koneksi. Silakan coba lagi.",
      )}`,
      303,
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(`${req.nextUrl.origin}${BASE}`, 303);
}
