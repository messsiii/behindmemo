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
      console.log('Redirect called with:', { url, baseUrl })

      try {
        const urlObj = new URL(url, baseUrl)
        console.log('URL object:', urlObj.toString())

        // 处理 OAuth 回调
        if (urlObj.pathname.includes('/api/auth/callback')) {
          // 从 state 参数中获取原始的 callbackUrl
          const state = urlObj.searchParams.get('state')
          console.log('State from callback:', state)
          if (state) {
            try {
              const decodedState = JSON.parse(decodeURIComponent(state))
              console.log('Decoded state:', decodedState)
              if (decodedState.callbackUrl) {
                return decodedState.callbackUrl.startsWith('/') 
                  ? `${baseUrl}${decodedState.callbackUrl}`
                  : decodedState.callbackUrl
              }
            } catch (e) {
              console.error('Failed to parse state:', e)
            }
          }
          return baseUrl
        }

        // 处理登录页面的 callbackUrl
        if (urlObj.pathname === '/auth/signin') {
          const callbackUrl = urlObj.searchParams.get('callbackUrl')
          console.log('Callback URL from params:', callbackUrl)
          if (callbackUrl) {
            // 将 callbackUrl 添加到 state 参数中
            const state = encodeURIComponent(JSON.stringify({ callbackUrl }))
            urlObj.searchParams.set('state', state)
            console.log('Setting state and redirecting to:', urlObj.toString())
            return urlObj.toString()
          }
        }

        // 如果 URL 包含 callbackUrl 参数
        const callbackUrl = urlObj.searchParams.get('callbackUrl')
        if (callbackUrl) {
          return callbackUrl.startsWith('/') 
            ? `${baseUrl}${callbackUrl}`
            : callbackUrl
        }

        // 默认重定向到首页
        console.log('Falling back to base URL:', baseUrl)
        return baseUrl
      } catch (e) {
        console.error('URL parsing error:', e)
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
