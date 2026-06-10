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

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Pass userId as header so tRPC context can skip a redundant auth.getUser() call
  if (user) {
    response.headers.set("x-user-id", user.id)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/trpc).*)",
  ],
}
