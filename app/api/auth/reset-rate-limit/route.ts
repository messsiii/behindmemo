import { resetEmailRateLimit, resetIPRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 开发环境API端点，用于重置频率限制
 * 仅在开发环境下有效
 */
export async function POST(req: NextRequest) {
  // 生产环境下禁用此接口
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '此接口仅在开发环境可用' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, ip } = body;

    if (!email && !ip) {
      return NextResponse.json(
        { error: '需要提供email或ip参数' },
        { status: 400 }
      );
    }

    if (email) {
      await resetEmailRateLimit(email);
    }

    if (ip) {
      await resetIPRateLimit(ip);
    }

    return NextResponse.json({
      success: true,
      message: '频率限制已重置',
      resetEmail: email || null,
      resetIP: ip || null
    });
  } catch (error) {
    console.error('重置频率限制错误:', error);
    
    return NextResponse.json(
      { error: '重置频率限制失败' },
      { status: 500 }
    );
  }
} 