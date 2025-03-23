import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 安全地获取id值并使用 await
  const resolvedParams = await params;
  const letterId = resolvedParams.id;
  
  try {
    // 检查是否已经存在分享记录
    const existingShare = await prisma.sharedLetter.findFirst({
      where: {
        letterId,
        userId: session.user.id,
      },
    })

    if (existingShare) {
      // 添加回退逻辑 - 如果环境变量不存在，使用相对路径
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const shareUrl = `${baseUrl}/shared/${existingShare.accessToken}`;
      
      return NextResponse.json({
        isShared: true,
        shareId: existingShare.id,
        accessToken: existingShare.accessToken,
        templateStyle: existingShare.templateStyle,
        hideWatermark: existingShare.hideWatermark || false,
        shareUrl,
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