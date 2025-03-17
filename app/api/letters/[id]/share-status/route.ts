import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authConfig)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 安全地获取id值
  const { id: letterId } = params
  
  try {
    // 检查是否已经存在分享记录
    const existingShare = await prisma.sharedLetter.findFirst({
      where: {
        letterId,
        userId: session.user.id,
      },
    })

    if (existingShare) {
      return NextResponse.json({
        isShared: true,
        shareId: existingShare.id,
        accessToken: existingShare.accessToken,
        templateStyle: existingShare.templateStyle,
        hideWatermark: existingShare.hideWatermark || false,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/shared/${existingShare.accessToken}`,
        viewCount: existingShare.viewCount,
      })
    } else {
      return NextResponse.json({
        isShared: false,
      })
    }
  } catch (error) {
    console.error('[SHARE_STATUS_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to get share status' },
      { status: 500 }
    )
  }
} 