import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Add security headers
  const headers = new Headers(request.headers)

  // Only allow same origin requests
  headers.set("X-Frame-Options", "SAMEORIGIN")

  // Prevent browsers from performing MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff")

  // Enable strict XSS protection
  headers.set("X-XSS-Protection", "1; mode=block")

  return NextResponse.next({
    request: {
      headers,
    },
  })
}

export const config = {
  matcher: "/result/:path*",
}

