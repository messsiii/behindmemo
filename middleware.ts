import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// 不需要登录的路由
const publicRoutes = ['/', '/auth/signin', '/about', '/terms', '/privacy']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查是否是公开路由
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // 检查是否是API路由
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 检查是否是静态资源
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    })

    // 如果用户未登录且访问需要认证的路由，重定向到登录页面
    if (!token && !publicRoutes.includes(pathname)) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // 如果用户已登录且访问登录页面，重定向到写作页面
    if (token && pathname === '/auth/signin') {
      return NextResponse.redirect(new URL('/write', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

// 配置需要运行中间件的路由
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
