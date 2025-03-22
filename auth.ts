import { verifyCode } from '@/lib/auth-utils'
import {
    isAccountLocked,
    recordFailedLoginAttempt,
    recordLoginAttempt,
    recordSuccessfulLogin,
    resetFailedLoginAttempts
} from '@/lib/login-monitoring'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import type { DefaultSession, Session, User } from 'next-auth'
import NextAuth from 'next-auth'
import type { Adapter, AdapterUser } from 'next-auth/adapters'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
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
    CredentialsProvider({
      id: 'email-login',
      name: 'Email Verification',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        code: { label: '验证码', type: 'text' }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.code) {
            return null
          }
          
          // 验证邮箱和验证码
          const { email, code } = credentials
          
          // 获取客户端IP
          const clientIp = 
            req?.headers?.['x-forwarded-for']?.split(',')[0] || 
            req?.headers?.['x-real-ip'] || 
            '127.0.0.1'
          
          // 检查账户是否被锁定
          const locked = await isAccountLocked(email)
          if (locked) {
            console.warn(`账户 ${email} 已被锁定，拒绝登录尝试`)
            recordLoginAttempt(email, clientIp, false)
            return null
          }
          
          // 查询验证码记录
          const verificationToken = await prisma.verificationToken.findUnique({
            where: {
              identifier_token: {
                identifier: email,
                token: code
              }
            }
          })
          
          // 验证码不存在或已过期
          if (!verificationToken || new Date() > verificationToken.expires) {
            console.log('验证码无效或已过期')
            // 增加失败计数
            await recordFailedLoginAttempt(email)
            // 记录失败尝试
            recordLoginAttempt(email, clientIp, false)
            return null
          }
          
          // 验证通过后删除验证码
          await prisma.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: email,
                token: code
              }
            }
          })
          
          // 重置失败次数
          await resetFailedLoginAttempts(email)
          
          // 查找或创建用户
          let user = await prisma.user.findUnique({
            where: { email }
          })
          
          if (!user) {
            // 创建新用户
            user = await prisma.user.create({
              data: {
                email,
                name: email.split('@')[0], // 使用邮箱前缀作为默认名称
                emailVerified: new Date(),
                credits: 30, // 初始积分
                totalUsage: 0,
                lastLoginAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                isVIP: false,
              }
            })
            console.log(`新用户已创建: ${email}`)
          } else {
            // 更新现有用户的登录时间和邮箱验证时间
            await prisma.user.update({
              where: { id: user.id },
              data: {
                lastLoginAt: new Date(),
                emailVerified: user.emailVerified || new Date()
              }
            })
          }
          
          // 记录成功登录
          recordLoginAttempt(email, clientIp, true)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            credits: user.credits
          }
        } catch (error) {
          console.error('Email login error:', error)
          return null
        }
      }
    }),
    CredentialsProvider({
      id: 'email-verification',
      name: 'Email Verification',
      credentials: {
        email: { label: 'Email', type: 'email' },
        verificationCode: { label: 'Verification Code', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.verificationCode) {
          throw new Error('Missing email or verification code')
        }
        
        const { email, verificationCode } = credentials
        
        try {
          // 检查账户是否被锁定
          const accountStatus = await isAccountLocked(email)
          if (accountStatus.locked) {
            throw new Error(`Account is locked. Try again in ${Math.ceil(accountStatus.remainingTime! / 60)} minutes.`)
          }
          
          // 验证验证码
          const isValid = await verifyCode(email, verificationCode)
          
          if (!isValid) {
            // 记录失败尝试
            const remainingAttempts = await recordFailedLoginAttempt(email)
            if (remainingAttempts === 0) {
              throw new Error('Account locked due to too many failed attempts. Try again in 1 hour.')
            } else {
              throw new Error(`Invalid verification code. ${remainingAttempts} attempts remaining.`)
            }
          }
          
          // 验证成功，查找或创建用户
          let user = await prisma.user.findUnique({
            where: { email }
          })
          
          if (!user) {
            // 创建新用户
            user = await prisma.user.create({
              data: {
                email,
                emailVerified: new Date()
              }
            })
          } else {
            // 更新用户的 emailVerified 字段
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: new Date() }
            })
          }
          
          // 记录成功登录
          await recordSuccessfulLogin(email)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image
          }
        } catch (error) {
          console.error('Email verification error:', error)
          throw error
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

export const { auth, signIn, signOut } = NextAuth(authConfig)
