import { redis } from '@/lib/redis';

// 环境检查
const isDev = process.env.NODE_ENV !== 'production';

// 频率限制配置
const MAX_EMAIL_ATTEMPTS = isDev ? 20 : 5;      // 开发环境：20次，生产环境：5次
const MAX_IP_ATTEMPTS = isDev ? 50 : 10;        // 开发环境：50次，生产环境：10次
const RATE_LIMIT_WINDOW = isDev ? 300 : 3600;   // 开发环境：5分钟，生产环境：1小时

/**
 * 频率限制结果接口
 */
interface RateLimitResult {
  /** 是否通过频率限制 */
  success: boolean;
  /** 剩余可用尝试次数 */
  remaining: number;
  /** 重置时间（秒） */
  remainingTime?: number;
}

/**
 * 基于邮箱的频率限制
 * @param email 用户邮箱
 * @returns 频率限制结果
 */
export async function rateLimitByEmail(email: string): Promise<RateLimitResult> {
  const key = `rate:email:${email}`;
  return checkRateLimit(key, MAX_EMAIL_ATTEMPTS);
}

/**
 * 基于IP的频率限制
 * @param ip 用户IP地址
 * @returns 频率限制结果
 */
export async function rateLimitByIP(ip: string): Promise<RateLimitResult> {
  const key = `rate:ip:${ip}`;
  return checkRateLimit(key, MAX_IP_ATTEMPTS);
}

/**
 * 检查频率限制
 * @param key Redis键
 * @param maxAttempts 最大尝试次数
 * @returns 频率限制结果
 */
async function checkRateLimit(key: string, maxAttempts: number): Promise<RateLimitResult> {
  // 获取当前计数
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount.toString(), 10) : 0;
  
  // 如果超出限制
  if (count >= maxAttempts) {
    // 获取剩余时间
    const ttl = await redis.ttl(key);
    return {
      success: false,
      remaining: 0,
      remainingTime: ttl > 0 ? ttl : RATE_LIMIT_WINDOW
    };
  }
  
  // 增加计数
  await redis.incr(key);
  
  // 首次设置键时设置过期时间
  if (count === 0) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }
  
  return {
    success: true,
    remaining: maxAttempts - (count + 1)
  };
}

/**
 * 重置邮箱频率限制
 * @param email 用户邮箱
 */
export async function resetEmailRateLimit(email: string): Promise<void> {
  const key = `rate:email:${email}`;
  await redis.del(key);
}

/**
 * 重置IP频率限制
 * @param ip 用户IP地址
 */
export async function resetIPRateLimit(ip: string): Promise<void> {
  const key = `rate:ip:${ip}`;
  await redis.del(key);
} 