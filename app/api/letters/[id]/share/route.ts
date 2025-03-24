import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 确保安全地获取id值并使用 await
  const resolvedParams = await params;
  const letterId = resolvedParams.id;
  
  // 解析请求体，获取模板样式和水印设置
  let templateStyle = 'classic';
  let updateTemplate = false;
  let hideWatermark = false;

  try {
    const json = await req.json();
    templateStyle = json.templateStyle || templateStyle;
    updateTemplate = json.updateTemplate || updateTemplate;
    hideWatermark = json.hideWatermark === true; // 确保是布尔值
    
    console.log('Request payload:', { templateStyle, updateTemplate, hideWatermark });
  } catch (parseError) {
    console.error('[SHARE_LETTER_PARSE_ERROR]', parseError);
    // 出错时使用默认值继续
  }
  
  try {
    // 检查信件是否存在并属于当前用户
    const letter = await prisma.letter.findUnique({
      where: {
        id: letterId,
        userId: session.user.id,
      },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found or you do not have permission' }, { status: 404 })
    }

    // 使用用户请求中的设置作为默认值
    let finalTemplateStyle = templateStyle
    let finalHideWatermark = hideWatermark

    // 尝试获取用户对该信件的模板偏好设置
    try {
      // 使用原生SQL查询模板偏好
      const preferences = await prisma.$queryRaw`
        SELECT * FROM letter_template_preferences 
        WHERE "userId" = ${session.user.id} 
        AND "letterId" = ${letterId}
        LIMIT 1
      ` as any[];
      
      // 如果存在偏好记录，使用它
      if (Array.isArray(preferences) && preferences.length > 0) {
        const pref = preferences[0];
        finalTemplateStyle = pref.templateId || templateStyle;
        finalHideWatermark = pref.hideWatermark || false;
        
        console.log('Found template preferences:', {
          templateId: pref.templateId,
          hideWatermark: pref.hideWatermark 
        });
      }
    } catch (prefError) {
      console.error('[TEMPLATE_PREFERENCE_ERROR]', prefError);
      // 出错时继续使用默认值
    }

    // 获取应用基础URL
    const baseUrl = getAppBaseUrl(req);

    // 检查是否已经存在分享记录
    let existingShare = await prisma.sharedLetter.findFirst({
      where: {
        letterId,
        userId: session.user.id,
      },
    })

    // 如果存在分享记录且请求要求更新模板，则更新模板样式
    if (existingShare && updateTemplate) {
      try {
        // 使用Prisma客户端API更新记录，而不是原始SQL
        const updatedShare = await prisma.sharedLetter.update({
          where: { 
            id: existingShare.id 
          },
          data: {
            templateStyle: finalTemplateStyle,
            hideWatermark: finalHideWatermark,
            updatedAt: new Date()
          }
        });
        
        // 使用更新后的记录作为返回数据源
        existingShare = updatedShare;
        
        // 添加调试日志
        console.log('Updated shared letter settings:', {
          id: updatedShare.id,
          templateStyle: updatedShare.templateStyle,
          hideWatermark: updatedShare.hideWatermark
        });
        
        // 使用完整的URL
        const shareUrl = `${baseUrl}/shared/${existingShare.accessToken}`;
        
        return NextResponse.json({
          id: existingShare.id,
          accessToken: existingShare.accessToken,
          templateStyle: existingShare.templateStyle,
          hideWatermark: existingShare.hideWatermark,
          shareUrl,
        })
      } catch (updateError) {
        console.error('[UPDATE_SHARED_LETTER_ERROR]', updateError);
        throw new Error('Failed to update shared letter');
      }
    }

    // 如果不存在分享记录，则创建新的
    if (!existingShare) {
      try {
        // 生成唯一的访问令牌和记录ID
        const accessToken = nanoid(10);
        const shareId = nanoid(24);
        const now = new Date();
        
        // 使用Prisma客户端API而不是原始SQL
        const createdShare = await prisma.sharedLetter.create({
          data: {
            id: shareId,
            letterId,
            userId: session.user.id,
            accessToken,
            templateStyle: finalTemplateStyle,
            hideWatermark: finalHideWatermark,
            viewCount: 0,
            createdAt: now,
            updatedAt: now
          }
        });
        
        // 更新信件的分享计数
        await prisma.letter.update({
          where: { id: letterId },
          data: {
            shareCount: {
              increment: 1,
            },
          },
        });
        
        // 设置返回值
        existingShare = createdShare;
      } catch (createError) {
        console.error('[CREATE_SHARED_LETTER_ERROR]', createError);
        throw new Error('Failed to create shared letter');
      }
    }

    // 使用完整的URL
    const shareUrl = `${baseUrl}/shared/${existingShare.accessToken}`;

    return NextResponse.json({
      id: existingShare.id,
      accessToken: existingShare.accessToken,
      templateStyle: existingShare.templateStyle,
      hideWatermark: existingShare.hideWatermark,
      shareUrl,
    })
  } catch (error) {
    console.error('[SHARE_LETTER_ERROR]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to share letter', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 