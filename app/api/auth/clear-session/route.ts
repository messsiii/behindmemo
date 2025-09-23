import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()

  // 清除所有 NextAuth 相关的 cookies
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    'next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
  ]

  for (const name of cookieNames) {
    cookieStore.delete(name)
  }

  return NextResponse.json({
    message: 'Session cookies cleared. Please refresh the page.',
  })
}
