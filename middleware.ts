import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// 不需要登录的路由
const publicRoutes = ['/', '/auth/signin', '/about', '/terms', '/privacy', '/pricing', '/checkout/success']

// 静态资源路径
const staticRoutes = ['/_next/', '/images/', '/fonts/', '/favicon.ico']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. 检查是否是静态资源或API路由
  if (
    staticRoutes.some(route => pathname.startsWith(route)) ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 2. 检查是否是公开路由
  if (
    publicRoutes.includes(pathname) || 
    pathname.startsWith('/shared/')
  ) {
    return NextResponse.next()
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET, // 使用 NEXTAUTH_SECRET
    })

    // 3. 处理需要认证的路由
    if (!token && !publicRoutes.includes(pathname)) {
      // 保存当前路径作为回调URL
      const callbackUrl = encodeURIComponent(pathname)
      const signInUrl = new URL(`/auth/signin?callbackUrl=${callbackUrl}`, request.url)
      return NextResponse.redirect(signInUrl)
    }

    // 4. 已登录用户访问登录页面时的处理
    if (token && pathname === '/auth/signin') {
      // 检查是否有 callbackUrl
      const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
      if (callbackUrl) {
        return NextResponse.redirect(new URL(decodeURIComponent(callbackUrl), request.url))
      }
      // 默认重定向到写作页面
      return NextResponse.redirect(new URL('/write', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // 发生错误时，允许请求继续，让应用层处理错误
    return NextResponse.next()
  }
}

// 配置需要运行中间件的路由
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - api/auth (NextAuth 路由)
     * - _next (Next.js 静态文件)
     * - public 文件夹下的静态资源
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
