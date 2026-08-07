import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  let supabase;
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase env vars missing');
    }
    
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            const rememberMe = request.cookies.get('remember_me')?.value !== 'false';
            
            cookiesToSet.forEach(({ name, value, options }) => {
              if (!rememberMe) {
                delete options.maxAge;
                delete options.expires;
              }
              request.cookies.set(name, value)
            })
            
            supabaseResponse = NextResponse.next({
              request,
            })
            
            cookiesToSet.forEach(({ name, value, options }) => {
              if (!rememberMe) {
                delete options.maxAge;
                delete options.expires;
              }
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Helper function to create redirect response preserving cookies set during getUser()
    const redirectWithCookies = (pathname: string) => {
      const url = request.nextUrl.clone()
      url.pathname = pathname
      const response = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((c) => {
        response.cookies.set(c.name, c.value, c)
      })
      return response
    }

    // Redirect root / to /dashboard if logged in, or /login if not logged in
    if (request.nextUrl.pathname === '/') {
      return redirectWithCookies(user ? '/dashboard' : '/login')
    }

    // Protect Dashboard and private routes
    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/login-basic')
    ) {
      return redirectWithCookies('/login')
    }

    // Redirect to dashboard if logged in and trying to access /login
    if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/login-basic'))) {
      return redirectWithCookies('/dashboard')
    }

    return supabaseResponse
  } catch (e: any) {
    // If env vars are missing or any other error occurs, return a clear JSON error
    console.error("Middleware Error:", e);
    return new NextResponse(
      JSON.stringify({ 
        error: "Sistem belum dikonfigurasi dengan benar.", 
        message: "Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diisi di Vercel Environment Variables.",
        details: e.message || "Unknown error"
      }),
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }
}
