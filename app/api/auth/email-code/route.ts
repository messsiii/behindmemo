import { checkVerificationCodeStatus, getVerificationCode } from '@/lib/auth-utils';
import { sendVerificationCode } from '@/lib/email';
import { rateLimitByEmail, rateLimitByIP } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 验证输入模式
const requestSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  language: z.enum(['en', 'zh']).optional().default('en'),
});

export async function POST(req: NextRequest) {
  try {
    // 验证请求体
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, language } = result.data;
    
    // 防止频繁请求 - IP 限制
    const ip = req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') ||
                'unknown';
    const ipLimitResult = await rateLimitByIP(ip);
    
    if (!ipLimitResult.success) {
      return NextResponse.json(
        { 
          error: language === 'en' 
            ? `Too many requests from your IP, try again in ${ipLimitResult.remainingTime} seconds` 
            : `请求过于频繁，请在 ${ipLimitResult.remainingTime} 秒后重试` 
        },
        { status: 429 }
      );
    }
    
    // 防止频繁请求 - 邮箱限制
    const emailLimitResult = await rateLimitByEmail(email);
    
    if (!emailLimitResult.success) {
      return NextResponse.json(
        { 
          error: language === 'en'
            ? `Too many verification codes sent to this email, try again in ${emailLimitResult.remainingTime} seconds`
            : `验证码发送过于频繁，请在 ${emailLimitResult.remainingTime} 秒后重试`
        },
        { status: 429 }
      );
    }
    
    // 检查是否已有有效的验证码
    const codeStatus = await checkVerificationCodeStatus(email);
    
    // 如果存在有效验证码且不能重新发送
    if (codeStatus.exists && !codeStatus.canResend) {
      return NextResponse.json(
        { 
          error: language === 'en'
            ? `A verification code has already been sent. You can request a new one in ${codeStatus.remainingTime} seconds.`
            : `验证码已发送并仍然有效，请在 ${codeStatus.remainingTime} 秒后再次请求`
        },
        { status: 400 }
      );
    }
    
    // 生成并发送验证码
    const verificationCode = await getVerificationCode(email);
    const emailSent = await sendVerificationCode(email, verificationCode, language);
    
    if (!emailSent) {
      return NextResponse.json(
        { 
          success: false,
          error: language === 'en'
            ? 'Failed to send verification code email. Please check your email address or try again later.'
            : '发送验证码邮件失败。请检查您的邮箱地址或稍后重试。'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: language === 'en'
        ? 'Verification code sent successfully'
        : '验证码发送成功'
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // 确保返回有效的错误消息
    let errorMessage = '发送验证码失败，请稍后重试';
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: language === 'en' 
          ? 'Failed to send verification code, please try again later' 
          : errorMessage 
      },
      { status: 500 }
    );
  }
} 