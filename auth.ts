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
      console.log('Redirect called with:', { url, baseUrl })

      try {
        // 1. 规范化 URL
        const urlObj = new URL(url, baseUrl)
        console.log('Processing URL:', urlObj.toString())

        // 2. 获取并处理 callbackUrl
        let finalCallbackUrl = urlObj.searchParams.get('callbackUrl')
        console.log('Initial callbackUrl:', finalCallbackUrl)

        // 3. 如果是 OAuth 回调
        if (urlObj.pathname.includes('/api/auth/callback')) {
          console.log('Handling OAuth callback')
          
          // 尝试从 state 获取 callbackUrl
          const state = urlObj.searchParams.get('state')
          console.log('OAuth callback state:', state)
          
          if (state) {
            try {
              const decodedState = JSON.parse(decodeURIComponent(state))
              console.log('Decoded state:', decodedState)
              if (decodedState.callbackUrl) {
                finalCallbackUrl = decodedState.callbackUrl
                console.log('Found callbackUrl in state:', finalCallbackUrl)
              }
            } catch (e) {
              console.error('Failed to parse state:', e)
            }
          }

          // 如果在 state 中没找到，尝试从 URL 参数获取
          if (!finalCallbackUrl) {
            finalCallbackUrl = urlObj.searchParams.get('callbackUrl')
            console.log('Fallback to URL callbackUrl:', finalCallbackUrl)
          }
        }

        // 4. 如果是登录页面
        if (urlObj.pathname === '/auth/signin') {
          console.log('Handling signin page')
          const callbackUrl = urlObj.searchParams.get('callbackUrl')
          console.log('Signin page callbackUrl:', callbackUrl)
          
          if (callbackUrl) {
            // 确保 state 包含 callbackUrl
            const state = encodeURIComponent(JSON.stringify({ callbackUrl }))
            urlObj.searchParams.set('state', state)
            console.log('Added callbackUrl to state:', urlObj.toString())
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
          
          console.log('Final redirect URL:', redirectUrl)
          return redirectUrl
        }

        // 6. 如果 URL 本身包含路径，使用该路径
        if (urlObj.pathname !== '/' && urlObj.pathname !== '/auth/signin') {
          console.log('Using URL pathname as redirect:', urlObj.pathname)
          return `${baseUrl}${urlObj.pathname}`
        }

        // 7. 默认返回首页
        console.log('No redirect target found, returning to base URL:', baseUrl)
        return baseUrl
      } catch (e) {
        console.error('Error in redirect callback:', e)
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
