import { resetFailedLoginAttempts, unlockAccount } from '@/lib/login-monitoring';
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
    const { email, ip, secret } = body;

    if (!email && !ip) {
      return NextResponse.json(
        { error: '需要提供email或ip参数' },
        { status: 400 }
      );
    }

    // 验证安全密钥
    const API_SECRET = process.env.ADMIN_API_SECRET;
    if (!secret || secret !== API_SECRET) {
      console.warn(`未授权的重置尝试: ${email}`);
      return NextResponse.json(
        { error: '未授权的请求' },
        { status: 401 }
      );
    }

    if (email) {
      await resetEmailRateLimit(email);
    }

    if (ip) {
      await resetIPRateLimit(ip);
    }

    // 解锁账户
    await unlockAccount(email);
    
    // 重置失败尝试次数
    await resetFailedLoginAttempts(email);
    
    console.log(`账户已解锁: ${email}`);

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