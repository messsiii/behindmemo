import { authConfig } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// 获取完整的应用URL
function getAppBaseUrl(req: NextRequest): string {
  // 首选环境变量中的URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // 如果环境变量未设置，从请求中构建URL
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  
  if (!host) {
    // 如果无法从请求中获取主机信息，使用默认域名
    return 'https://behindmemory.com';
  }
  
  return `${protocol}://${host}`;
}

export async function GET(
  req: NextRequest,
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
      // 获取完整的基础URL
      const baseUrl = getAppBaseUrl(req);
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