import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { syncUserIdentity } from '@/lib/actions';

export const dynamic = 'force-dynamic';

async function handleLogin(formData: FormData) {
  "use server";
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    redirect('/login-basic?error=Isi+email+dan+password');
  }

  const cookieStore = await cookies();
  cookieStore.set('remember_me', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.includes('Invalid login credentials')
      ? 'Email+atau+password+salah'
      : encodeURIComponent(error.message);
    redirect(`/login-basic?error=${msg}`);
  }

  cookieStore.delete('superadmin_branch_id');
  
  try {
    await syncUserIdentity();
  } catch {}
  
  redirect('/dashboard');
}

export default async function LoginBasicPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; prefill?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params?.error || '';
  const prefillEmail = params?.prefill || '';
  
  // Check if already logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }

  const accounts = [
    { label: 'Superadmin', email: 'superadmin@shiningsun.com' },
    { label: 'Cabang Ngunut', email: 'ngunut@shiningsun.com' },
    { label: 'Cabang Balesono', email: 'balesono@shiningsun.com' },
    { label: 'Cabang Gragalan', email: 'gragalan@shiningsun.com' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '32px 24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 4px 0',
          }}>ShiningSun</h1>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
          }}>Login Kompatibel — Khusus HP Bermasalah</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        {/* Quick Account Links — Pure HTML anchor/form, NO JavaScript */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            margin: '0 0 8px 0',
          }}>Pilih Akun Cepat:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {accounts.map((acc) => (
              <a
                key={acc.email}
                href={`/login-basic?prefill=${encodeURIComponent(acc.email)}`}
                style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: '#475569',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                }}
              >
                {acc.label}
              </a>
            ))}
          </div>
        </div>

        {/* Login Form — Pure HTML, zero JavaScript needed */}
        <form action={handleLogin} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={prefillEmail}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                background: '#f8fafc',
                boxSizing: 'border-box',
              }}
              placeholder="email@shiningsun.com"
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                background: '#f8fafc',
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Masuk ke Dashboard
          </button>
        </form>

        {/* Link to Parent Portal */}
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <a
            href="/portal-ortu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#047857',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            👨‍👩‍👧 Portal Orang Tua & Siswa
          </a>
        </div>

        {/* Link back to main login */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <a
            href="/login"
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              textDecoration: 'underline',
            }}
          >
            Kembali ke Login Utama
          </a>
        </div>
      </div>
    </div>
  );
}
