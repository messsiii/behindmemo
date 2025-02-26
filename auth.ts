import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import type { DefaultSession, Session, User } from 'next-auth'
import NextAuth from 'next-auth'
import type { Adapter, AdapterUser } from 'next-auth/adapters'
import type { JWT } from 'next-auth/jwt'
import Google from 'next-auth/providers/google'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      credits: number
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    credits?: number
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 扩展 Prisma 适配器以支持初始配额
const PrismaAdapterWithCredits = (p: PrismaClient): Adapter => {
  const adapter = PrismaAdapter(p)
  return {
    ...adapter,
    createUser: async (data: Omit<AdapterUser, 'id'>) => {
      const user = await p.user.create({
        data: {
          ...data,
          credits: 30, // 修改初始点数为 30
          totalUsage: 0,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          isVIP: false,
        },
      })
      return user as AdapterUser
    },
  }
}

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  logger: {
    error: (code: string, ...message: unknown[]) => {
      console.error(code, ...message)
    },
    warn: (code: string, ...message: unknown[]) => {
      console.warn(code, ...message)
    },
    debug: (code: string, ...message: unknown[]) => {
      console.debug(code, ...message)
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User | undefined }) {
      if (user) {
        token.id = user.id
        token.credits = (user as any).credits || 2
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.id) {
        session.user.id = token.id
        session.user.credits = token.credits || 2
      }
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      try {
        // 1. 规范化 URL
        const urlObj = new URL(url, baseUrl)
        const pathname = urlObj.pathname
        
        // 只记录路径名，不记录完整 URL
        console.debug('Processing redirect:', pathname)

        // 特殊处理支付成功页面，避免重定向循环
        if (pathname === '/checkout/success' || pathname.startsWith('/checkout/success')) {
          console.debug('检测到支付成功页面，保持原始URL:', url)
          return url
        }

        // 防止重定向循环
        if (url.includes('/api/auth/session') || url.includes('/api/auth/csrf')) {
          console.debug('检测到认证API调用，保持原始URL:', url)
          return url
        }

        // 2. 获取并处理 callbackUrl
        let finalCallbackUrl = urlObj.searchParams.get('callbackUrl')
        
        // 3. 如果是 OAuth 回调
        if (pathname.includes('/api/auth/callback')) {
          // 尝试从 state 获取 callbackUrl
          const state = urlObj.searchParams.get('state')
          
          if (state) {
            try {
              const decodedState = JSON.parse(decodeURIComponent(state))
              if (decodedState.callbackUrl) {
                finalCallbackUrl = decodedState.callbackUrl
              }
            } catch (e) {
              console.error('Failed to parse state')
            }
          }
        }

        // 4. 如果是登录页面
        if (pathname === '/auth/signin') {
          const callbackUrl = urlObj.searchParams.get('callbackUrl')
          if (callbackUrl) {
            // 确保 state 包含 callbackUrl
            const state = encodeURIComponent(JSON.stringify({ callbackUrl }))
            urlObj.searchParams.set('state', state)
            return urlObj.toString()
          }
        }

        // 5. 处理最终的重定向
        if (finalCallbackUrl) {
          // 确保 callbackUrl 是完整的 URL 或相对路径
          const redirectUrl = finalCallbackUrl.startsWith('http') 
            ? finalCallbackUrl 
            : finalCallbackUrl.startsWith('/') 
              ? `${baseUrl}${finalCallbackUrl}`
              : `${baseUrl}/${finalCallbackUrl}`
          
          return redirectUrl
        }

        // 6. 如果 URL 本身包含路径，使用该路径
        if (pathname !== '/' && pathname !== '/auth/signin') {
          return `${baseUrl}${pathname}`
        }

        // 7. 默认返回首页
        return baseUrl
      } catch (error) {
        console.error('Redirect error')
        return baseUrl
      }
    },
  },
  adapter: PrismaAdapterWithCredits(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          state: undefined,
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

export const { auth, signIn, signOut } = NextAuth(authConfig)
