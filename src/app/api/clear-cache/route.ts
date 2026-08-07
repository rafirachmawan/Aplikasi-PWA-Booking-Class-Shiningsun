import { NextResponse } from 'next/server';

// This returns a plain HTML page with INLINE JavaScript (not from a bundle)
// to forcefully clear the Service Worker and all caches on the device.
// Since the script is inline, it does NOT depend on any cached JS bundle.
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Membersihkan Cache...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      border: 1px solid #334155;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #f8fafc; }
    #status { font-size: 14px; color: #94a3b8; margin-bottom: 16px; line-height: 1.6; }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid #334155;
      border-top: 4px solid #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .done { color: #34d399; font-weight: 700; }
    a.btn {
      display: inline-block;
      margin-top: 16px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div id="spinner" class="spinner"></div>
    <h1>Membersihkan Cache Aplikasi</h1>
    <p id="status">Menghapus Service Worker dan cache lama...</p>
    <div id="done-section" class="hidden">
      <a class="btn" href="/login-basic">Lanjut ke Login</a>
    </div>
  </div>

  <script>
    (async function() {
      var statusEl = document.getElementById('status');
      var spinnerEl = document.getElementById('spinner');
      var doneSection = document.getElementById('done-section');
      var steps = [];

      // 1. Unregister ALL service workers
      try {
        if ('serviceWorker' in navigator) {
          var regs = await navigator.serviceWorker.getRegistrations();
          for (var i = 0; i < regs.length; i++) {
            await regs[i].unregister();
          }
          steps.push('Service Worker dihapus (' + regs.length + ')');
        }
      } catch(e) { steps.push('SW: ' + e.message); }

      statusEl.textContent = 'Menghapus cache storage...';

      // 2. Delete ALL caches
      try {
        if ('caches' in window) {
          var keys = await caches.keys();
          for (var j = 0; j < keys.length; j++) {
            await caches.delete(keys[j]);
          }
          steps.push('Cache Storage dihapus (' + keys.length + ' cache)');
        }
      } catch(e) { steps.push('Cache: ' + e.message); }

      statusEl.textContent = 'Menghapus data lokal...';

      // 3. Clear localStorage & sessionStorage
      try {
        localStorage.clear();
        sessionStorage.clear();
        steps.push('Local/Session Storage dihapus');
      } catch(e) {}

      // 4. Clear cookies
      try {
        var cookies = document.cookie.split(';');
        for (var k = 0; k < cookies.length; k++) {
          var name = cookies[k].split('=')[0].trim();
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        }
        steps.push('Cookies dihapus (' + cookies.length + ')');
      } catch(e) {}

      // Done
      spinnerEl.style.display = 'none';
      statusEl.innerHTML = '<span class="done">✅ Berhasil dibersihkan!</span><br><br>' + steps.join('<br>');
      doneSection.classList.remove('hidden');
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}
