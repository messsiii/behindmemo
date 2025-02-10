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
          credits: 2, // 设置初始配额
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
  debug: true, // 开启调试模式
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
      // 如果是 OAuth 回调 URL，直接使用它
      if (url.startsWith('/api/auth') || url.includes('/api/auth/callback/')) {
        return url
      }

      try {
        const urlObj = new URL(url, baseUrl)
        
        // 处理 OAuth 提供商回调后的重定向
        if (urlObj.pathname.startsWith('/api/auth/callback')) {
          // 从 state 参数中获取原始的 callbackUrl
          const state = urlObj.searchParams.get('state')
          if (state) {
            try {
              const decodedState = JSON.parse(decodeURIComponent(state))
              if (decodedState.callbackUrl) {
                const returnTo = new URL(decodedState.callbackUrl, baseUrl)
                if (returnTo.origin === baseUrl) {
                  return returnTo.toString()
                }
              }
            } catch (e) {
              console.error('Failed to parse state:', e)
            }
          }
        }

        // 处理登录页面的 callbackUrl
        const callbackUrl = urlObj.searchParams.get('callbackUrl')
        if (callbackUrl) {
          const returnTo = new URL(callbackUrl, baseUrl)
          if (returnTo.origin === baseUrl) {
            // 将 callbackUrl 添加到 state 参数中
            const state = encodeURIComponent(JSON.stringify({ callbackUrl }))
            if (urlObj.pathname === '/auth/signin') {
              urlObj.searchParams.set('state', state)
              return urlObj.toString()
            }
            return returnTo.toString()
          }
        }
      } catch (e) {
        console.error('URL parsing error:', e)
      }

      // 默认重定向到首页
      return baseUrl
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
