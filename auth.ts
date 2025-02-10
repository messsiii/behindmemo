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
      // 如果是回调URL，直接使用它
      if (url.startsWith('/api/auth') || url.includes('/api/auth/callback/')) {
        return url
      }

      // 如果URL包含callbackUrl参数，提取并使用它
      try {
        const callbackUrl = new URL(url, baseUrl).searchParams.get('callbackUrl')
        if (callbackUrl) {
          // 确保回调URL是安全的
          const returnTo = new URL(callbackUrl, baseUrl)
          if (returnTo.origin === baseUrl) {
            return returnTo.toString()
          }
        }
      } catch (e) {
        console.error('URL parsing error:', e)
      }

      // 允许内部URL重定向
      if (url.startsWith(baseUrl)) return url
      // 允许相对URL重定向
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // 默认重定向到写作页面
      return `${baseUrl}/write`
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
