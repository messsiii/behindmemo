import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('[DB_RECONNECT] Attempting to disconnect and reconnect...')
    
    // 先断开所有连接
    await prisma.$disconnect()
    console.log('[DB_RECONNECT] Disconnected successfully')
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 重新连接
    await prisma.$connect()
    console.log('[DB_RECONNECT] Reconnected successfully')
    
    // 测试连接
    await prisma.$queryRaw`SELECT 1`
    console.log('[DB_RECONNECT] Connection test passed')
    
    return NextResponse.json({ success: true, message: 'Database reconnected successfully' })
  } catch (error) {
    console.error('[DB_RECONNECT] Failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}