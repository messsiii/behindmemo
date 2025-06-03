import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const recordId = params.id

    // 验证记录是否存在且属于当前用户
    const existingRecord = await prisma.imageGeneration.findFirst({
      where: {
        id: recordId,
        userId: session.user.id,
      },
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Record not found or access denied' },
        { status: 404 }
      )
    }

    // 删除记录
    await prisma.imageGeneration.delete({
      where: {
        id: recordId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting generation record:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 