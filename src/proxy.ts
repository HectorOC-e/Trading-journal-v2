import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Si las vars no están configuradas, dejar pasar sin proteger
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase env vars missing — skipping auth middleware")
    return NextResponse.next({ request })
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Verifies the token's ES256 signature against the JWKS auth-js caches
  // process-wide, so the gate costs no network on a warm process. Do not
  // collapse this into a bare decode: getClaims() still calls getSession()
  // underneath, which rotates an expired token and writes the refreshed cookies
  // through setAll above. That refresh is why the Supabase docs warn against
  // dropping the auth call here.
  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims.sub)

  if (!isAuthenticated && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Exclude framework internals, public PWA assets (sw.js, manifest, icons)
    // and unauthenticated endpoints so they are served directly instead of
    // being redirected to /login.
    //
    // `monitoring` is Sentry's browser tunnel (next.config.ts tunnelRoute). Left
    // in, the gate would redirect it to /login for anyone without a session — so
    // errors from logged-out users, including failures on the login screen
    // itself, would vanish. Authenticated traffic would still work, which is
    // what makes it worth excluding explicitly: it would look fine.
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/trpc|api/cron|monitoring|sw\\.js|manifest\\.json|icons/).*)",
  ],
}
