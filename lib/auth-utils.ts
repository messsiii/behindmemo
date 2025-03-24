import { prisma } from '@/lib/prisma';

// 验证码有效期（10分钟）
const CODE_EXPIRY_MINUTES = 10;

/**
 * 生成6位随机数字验证码
 * @returns 6位数字验证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 为指定邮箱生成并存储验证码
 * @param email 用户邮箱
 * @returns 生成的验证码
 */
export async function getVerificationCode(email: string): Promise<string> {
  // 生成6位验证码
  const code = generateVerificationCode();
  console.log(`为邮箱 ${email} 生成验证码: ${code}`);
  
  // 计算过期时间
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + CODE_EXPIRY_MINUTES);
  
  try {
    // 先尝试删除已有的记录
    const deletedTokens = await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
      }
    });
    console.log(`已删除旧验证码记录: ${deletedTokens.count} 条`);
    
    // 使用时间戳确保token唯一性
    const tokenValue = `email-login-${Date.now()}`;
    
    // 创建新的验证码记录
    const newToken = await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: tokenValue,
        expires,
        code
      }
    });
    
    console.log(`已创建新的验证码记录:`, {
      identifier: newToken.identifier,
      tokenCreated: !!newToken.token,
      codeSet: !!newToken.code,
      expiresAt: newToken.expires.toISOString()
    });
    
    // 验证记录是否正确保存
    const savedToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: tokenValue
        }
      }
    });
    
    console.log(`验证保存的记录:`, {
      found: !!savedToken,
      codeMatches: savedToken?.code === code,
      tokenMatches: savedToken?.token === tokenValue
    });
    
    return code;
  } catch (error) {
    console.error('Error storing verification code:', error);
    throw new Error('Failed to generate verification code');
  }
}

/**
 * 检查用户是否有有效的验证码
 * @param email 用户邮箱
 * @returns 如果有有效的验证码返回true，否则返回false
 */
export async function isVerificationCodeExist(email: string): Promise<boolean> {
  try {
    // 查询数据库中是否有未过期的验证码
    const existingToken = await prisma.verificationToken.findFirst({
      where: { 
        identifier: email,
        expires: {
          gt: new Date() // 只查找未过期的验证码
        }
      }
    });

    // 如果不存在验证码记录，返回false
    if (!existingToken) {
      return false;
    }

    // 检查验证码是否过期
    const now = new Date();
    
    // 如果验证码还有3分钟以上有效期，认为它还有效
    // 这允许用户在验证码即将过期的情况下请求新的验证码
    if (existingToken.expires > new Date(now.getTime() + 3 * 60 * 1000)) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking verification code existence:', error);
    return false;
  }
}

/**
 * 验证用户提交的验证码
 * @param email 用户邮箱
 * @param code 用户提交的验证码
 * @returns 验证结果，成功返回true，失败返回false
 */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  try {
    // 查询数据库中的验证码记录
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { 
        identifier: email,
        expires: {
          gt: new Date() // 只查找未过期的验证码
        }
      }
    });

    // 如果不存在验证码记录或验证码已过期，返回false
    if (!verificationToken) {
      return false;
    }

    // 验证码是否匹配
    const isValid = verificationToken.code === code;
    
    // 如果验证成功，删除该验证码记录
    if (isValid) {
      await prisma.verificationToken.delete({
        where: {
          token: verificationToken.token
        }
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying code:', error);
    return false;
  }
}

/**
 * 检查用户是否有有效的验证码，并判断是否可以重新发送
 * @param email 用户邮箱
 * @returns 返回检查结果，包含是否存在验证码、是否可以重新发送、剩余等待时间
 */
export async function checkVerificationCodeStatus(email: string): Promise<{
  exists: boolean;
  canResend: boolean;
  remainingTime?: number;
}> {
  try {
    // 查询数据库中是否有未过期的验证码
    const existingToken = await prisma.verificationToken.findFirst({
      where: { 
        identifier: email,
        expires: {
          gt: new Date()
        }
      }
    });

    // 如果不存在验证码记录，可以直接发送
    if (!existingToken) {
      return {
        exists: false,
        canResend: true
      };
    }

    // 获取当前时间
    const now = new Date();
    
    // 计算验证码剩余有效期（秒）
    const remainingSeconds = Math.floor((existingToken.expires.getTime() - now.getTime()) / 1000);
    
    // 验证码创建时间（如果不存在code字段，说明是旧记录，允许重新发送）
    if (!existingToken.code) {
      return {
        exists: true,
        canResend: true
      };
    }
    
    // 检查是否可以重新发送
    // 条件1：验证码已创建超过30秒
    // 条件2：验证码剩余有效期不足2分钟
    const canResend = remainingSeconds <= 120; // 剩余时间小于2分钟才允许重新发送
    
    return {
      exists: true,
      canResend,
      remainingTime: canResend ? 0 : remainingSeconds
    };
  } catch (error) {
    console.error('检查验证码状态错误:', error);
    // 出错时默认允许发送，避免阻止用户操作
    return {
      exists: false,
      canResend: true
    };
  }
} 