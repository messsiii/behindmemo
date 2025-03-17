import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  // 确保安全地获取token值
  const { token } = params

  try {
    // 查找分享记录
    const sharedLetter = await prisma.sharedLetter.findUnique({
      where: { accessToken: token },
      include: {
        letter: true,
      },
    })

    if (!sharedLetter) {
      return NextResponse.json({ error: 'Shared letter not found' }, { status: 404 })
    }

    // 更新查看次数
    await prisma.sharedLetter.update({
      where: { id: sharedLetter.id },
      data: { viewCount: { increment: 1 } },
    })

    // 返回信件内容
    return NextResponse.json({
      letter: {
        content: sharedLetter.letter.content,
        imageUrl: sharedLetter.letter.imageUrl,
        metadata: sharedLetter.letter.metadata,
      },
      templateStyle: sharedLetter.templateStyle,
      hideWatermark: sharedLetter.hideWatermark || false,
    })
  } catch (error) {
    console.error('[GET_SHARED_LETTER_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to retrieve shared letter' },
      { status: 500 }
    )
  }
} 