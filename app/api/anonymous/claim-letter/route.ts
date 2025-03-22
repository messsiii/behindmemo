import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/anonymous/claim-letter
 * 将匿名信件转换为用户账户下的正式信件
 */
export async function POST(req: NextRequest) {
  console.log('[CLAIM_LETTER_API] 接收到认领请求')
  let requestBody = null
  
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      console.log('[CLAIM_LETTER_API] 未授权操作，用户未登录');
      return NextResponse.json(
        { error: '未授权操作', message: '请先登录再尝试认领信件' },
        { status: 401 }
      )
    }
    
    console.log('[CLAIM_LETTER_API] 用户已认证:', session.user.id);
    
    // 2. 获取请求数据
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('[CLAIM_LETTER_API] 解析请求体失败:', error);
      return NextResponse.json(
        { error: '请求格式错误', message: '无法解析请求数据' },
        { status: 400 }
      )
    }
    
    const { letterId } = requestBody || {};
    
    if (!letterId) {
      console.log('[CLAIM_LETTER_API] 参数错误，缺少信件ID');
      return NextResponse.json(
        { error: '参数错误', message: '缺少信件ID' },
        { status: 400 }
      )
    }
    
    console.log(`[CLAIM_LETTER_API] 开始处理信件认领, ID: ${letterId}, 用户ID: ${session.user.id}`);
    
    // 3. 查找信件
    let letter = null;
    try {
      letter = await prisma.letter.findUnique({
        where: {
          id: letterId,
        },
        include: {
          user: true,
        },
      });
    } catch (dbError) {
      console.error('[CLAIM_LETTER_API] 数据库查询错误:', dbError);
      return NextResponse.json(
        { error: '数据库错误', message: '查询信件时发生错误' },
        { status: 500 }
      );
    }
    
    // 检查信件是否存在
    if (!letter) {
      console.log(`[CLAIM_LETTER_API] 信件不存在: ${letterId}`);
      return NextResponse.json(
        { error: '信件不存在', message: '无法找到指定的信件' },
        { status: 404 }
      )
    }
    
    // 从metadata中检查信件是否为匿名信件
    const isAnonymous = letter.metadata ? (letter.metadata as any).isAnonymous === true : false
    
    if (!isAnonymous) {
      // 如果已经是用户自己的信件，直接返回成功
      if (letter.userId === session.user.id) {
        console.log(`[CLAIM_LETTER_API] 信件已经属于当前用户: ${letter.id}`);
        return NextResponse.json({
          message: '信件已经归属于您的账户',
          newLetterId: letter.id,
        })
      }
      
      // 如果是其他用户的信件，拒绝请求
      console.log(`[CLAIM_LETTER_API] 尝试认领非匿名信件: ${letter.id}, 属于用户: ${letter.userId}`);
      return NextResponse.json(
        { error: '非匿名信件', message: '您无法认领其他用户的信件' },
        { status: 403 }
      )
    }
    
    console.log(`[CLAIM_LETTER_API] 确认是匿名信件，准备复制内容`);
    
    // 4. 创建用户信件 (复制匿名信件的内容)
    const metadata = letter.metadata as Record<string, any> || {}
    // 移除isAnonymous标记，添加认领时间
    const newMetadata = {
      ...metadata,
      isAnonymous: false,
      claimedAt: new Date().toISOString(),
      claimedFrom: letter.id
    }
    
    console.log(`[CLAIM_LETTER_API] 创建新信件，源自匿名信件: ${letter.id}`);
    
    // 记录原始信件内容，便于调试
    console.log('[CLAIM_LETTER_API] 原始信件内容:', {
      content: typeof letter.content === 'string' ? `${letter.content.substring(0, 50)}...` : null,
      imageUrl: letter.imageUrl,
      status: letter.status,
    });
    
    // 创建新信件
    let newLetter = null;
    try {
      newLetter = await prisma.letter.create({
        data: {
          content: letter.content || '', // 确保内容不为null
          imageUrl: letter.imageUrl || '',
          status: letter.status === 'generating' ? 'completed' : letter.status, // 确保状态为completed
          prompt: letter.prompt || '',
          language: letter.language || 'zh',
          metadata: newMetadata,
          user: {
            connect: {
              id: session.user.id,
            },
          },
        },
      });
    } catch (createError) {
      console.error('[CLAIM_LETTER_API] 创建新信件失败:', createError);
      return NextResponse.json(
        { error: '创建失败', message: '无法创建新信件' },
        { status: 500 }
      );
    }
    
    console.log(`[CLAIM_LETTER_API] 新信件创建成功: ${newLetter.id}`);
    
    // 5. 删除原匿名信件
    try {
      await prisma.letter.delete({
        where: {
          id: letterId,
        },
      });
      console.log(`[CLAIM_LETTER_API] 匿名信件已删除: ${letterId}`);
    } catch (deleteError) {
      console.error('[CLAIM_LETTER_API] 删除原信件失败，但新信件已创建:', deleteError);
      // 继续处理，不要因为删除失败而中断流程
    }
    
    // 6. 返回成功信息和新信件ID
    console.log(`[CLAIM_LETTER_API] 认领流程完成，返回新ID: ${newLetter.id}`);
    
    // 确保返回正确的JSON格式
    const response = {
      message: '信件已成功保存到您的账户',
      newLetterId: newLetter.id,
    };
    
    console.log('[CLAIM_LETTER_API] 返回响应:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[CLAIM_LETTER_API] 信件认领失败:', error, '请求体:', requestBody)
    return NextResponse.json(
      { error: '服务器错误', message: '信件认领过程中发生错误，请稍后重试' },
      { status: 500 }
    )
  }
} 