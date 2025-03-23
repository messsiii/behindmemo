import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // 确保安全地获取token值
  const resolvedParams = await params;
  const token = resolvedParams.token;
  
  // 解析查询参数，确定是否增加阅读次数
  const url = new URL(req.url);
  // 当noIncrement=true时不增加计数，默认增加
  const noIncrement = url.searchParams.get('noIncrement') === 'true';

  try {
    // 获取分享信息和关联的信件
    const sharedLetter = await prisma.sharedLetter.findUnique({
      where: {
        accessToken: token,
      },
      include: {
        letter: true,
      },
    })

    if (!sharedLetter) {
      return NextResponse.json({ error: 'Shared letter not found' }, { status: 404 })
    }

    // 只有在不是noIncrement模式时才更新查看次数
    if (!noIncrement) {
      // 更新查看次数
      await prisma.sharedLetter.update({
        where: {
          id: sharedLetter.id,
        },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      })
      console.log(`Incremented view count for shared letter ${sharedLetter.id}`);
    } else {
      console.log(`Fetched shared letter ${sharedLetter.id} without incrementing view count`);
    }

    // 返回信件内容
    return NextResponse.json({
      letter: {
        content: sharedLetter.letter.content,
        imageUrl: sharedLetter.letter.imageUrl,
        metadata: sharedLetter.letter.metadata,
      },
      templateStyle: sharedLetter.templateStyle,
      hideWatermark: sharedLetter.hideWatermark || false,
      viewCount: sharedLetter.viewCount,
    })
  } catch (error) {
    console.error('[GET_SHARED_LETTER_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to retrieve shared letter' },
      { status: 500 }
    )
  }
} 