import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Batch2 hemat (tanpa ubah logika auth): migrasi middleware → proxy sesuai
// Next 16 (node_modules/next/dist/docs/.../proxy.md). Isi fungsi sama persis,
// hanya nama export diganti. Matcher disempitkan agar tidak memicu Function
// untuk aset statis/API (tetap lindungi /dashboard, /schedule, dll).
export async function proxy(request: NextRequest) {
  // Pertahanan lapis-2 (matcher sudah exclude, tapi biarkan early-return ini
  // agar perilaku 100% sama seperti sebelumnya).
  const path = request.nextUrl.pathname;
  if (path.startsWith('/_next') || path.startsWith('/api') || path.startsWith('/public') || path.includes('.')) {
    return;
  }

  // ── DIAGNOSA SEMENTARA (portal orang tua) ────────────────────────────────
  // Kalau form login terkirim sebagai GET biasa (bukan Server Action), berarti
  // JavaScript gagal hydrate di perangkat itu. Gejalanya: halaman "mental"
  // kembali ke login tanpa pesan error. Baris log ini membuktikannya.
  // Hapus blok ini setelah kasus selesai.
  if (path.startsWith('/portal-ortu') && request.nextUrl.searchParams.has('student_name')) {
    console.log(
      `[PORTAL] NATIVE-SUBMIT ${new Date().toISOString()} | ${JSON.stringify({
        path,
        ua: request.headers.get('user-agent'),
        accept: request.headers.get('accept'),
      })}`,
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match semua kecuali:
     * - api (API routes — auth API tidak perlu session refresh per-request)
     * - _next/static, _next/image, _next/data (static + image optimizer)
     * - sw.js, manifest, icon.png, logo.png, logo.webp, favicon, sitemap, robots
     * - file berekstensi gambar (.svg/.png/.jpg/.webp/.ico/.gif)
     * Auth coverage untuk /dashboard, /schedule, /scheduling, /login,
     * /portal-ortu, /students, /teachers, /worksheets tetap penuh.
     */
    '/((?!api|_next/static|_next/image|_next/data|sw\\.js|manifest\\.webmanifest|icon\\.png|logo\\.png|logo\\.webp|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
