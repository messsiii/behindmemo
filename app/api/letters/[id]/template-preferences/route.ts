import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

// 获取用户对特定信件的模板偏好
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 确保安全地获取id值
    const { id: letterId } = params
    
    // 检查信件是否属于当前用户
    const letter = await prisma.letter.findUnique({
      where: {
        id: letterId,
        userId: session.user.id,
      },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found or you do not have permission' }, { status: 404 })
    }

    // 使用原始 SQL 查询获取模板偏好记录
    const templatePreferences = await prisma.$queryRaw`
      SELECT * FROM letter_template_preferences 
      WHERE "userId" = ${session.user.id} 
      AND "letterId" = ${letterId}
      LIMIT 1
    `;

    // 如果没有找到记录，返回默认值
    if (!Array.isArray(templatePreferences) || templatePreferences.length === 0) {
      return NextResponse.json({
        templateId: 'classic',
        hideWatermark: false,
      })
    }

    const pref = templatePreferences[0] as any;
    return NextResponse.json({
      templateId: pref.templateId || 'classic',
      hideWatermark: pref.hideWatermark || false,
    })
  } catch (error) {
    console.error('[GET_TEMPLATE_PREFERENCE_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to get template preference' },
      { status: 500 }
    )
  }
}

// 保存用户对特定信件的模板偏好
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 确保安全地获取id值
    const { id: letterId } = params
    const { templateId, hideWatermark } = await req.json()
    
    // 检查信件是否属于当前用户
    const letter = await prisma.letter.findUnique({
      where: {
        id: letterId,
        userId: session.user.id,
      },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found or you do not have permission' }, { status: 404 })
    }

    // 检查是否已存在偏好记录
    const existingPreferences = await prisma.$queryRaw`
      SELECT * FROM letter_template_preferences 
      WHERE "userId" = ${session.user.id} 
      AND "letterId" = ${letterId}
      LIMIT 1
    `;
    
    const now = new Date();
    let result;
    
    // 如果存在，则更新
    if (Array.isArray(existingPreferences) && existingPreferences.length > 0) {
      const existingPref = existingPreferences[0] as any;
      await prisma.$executeRaw`
        UPDATE letter_template_preferences
        SET "templateId" = ${templateId},
            "hideWatermark" = ${hideWatermark},
            "updatedAt" = ${now}
        WHERE id = ${existingPref.id}
      `;
      result = {
        templateId,
        hideWatermark,
      };
    } else {
      // 不存在则创建新记录
      const id = crypto.randomUUID ? crypto.randomUUID() : 
                 Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      
      await prisma.$executeRaw`
        INSERT INTO letter_template_preferences (
          "id", "userId", "letterId", "templateId", "hideWatermark", "createdAt", "updatedAt"
        ) VALUES (
          ${id}, ${session.user.id}, ${letterId}, ${templateId}, ${hideWatermark}, ${now}, ${now}
        )
      `;
      result = {
        templateId,
        hideWatermark,
      };
    }

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[SAVE_TEMPLATE_PREFERENCE_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to save template preference' },
      { status: 500 }
    )
  }
} 