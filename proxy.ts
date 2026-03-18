import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const publicPaths = ["/", "/sign-in", "/sign-up", "/api"]

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for the Convex Better Auth JWT cookie
  // On HTTPS (production), Better Auth prefixes cookie names with "__Secure-"
  const hasAuth = request.cookies.getAll().some((cookie) => cookie.name.endsWith("convex_jwt"))

  if (!hasAuth) {
    const signInUrl = new URL("/sign-in", request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files with extensions (.svg, .png, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
