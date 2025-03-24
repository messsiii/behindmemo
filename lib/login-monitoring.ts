import { redis } from '@/lib/redis';

// 登录安全配置
const MAX_FAILED_ATTEMPTS = 20;      // 最大失败尝试次数
const ACCOUNT_LOCK_TIME = 60 * 60;  // 账户锁定时间（1小时，单位：秒）

/**
 * 记录登录尝试，用于检测异常登录活动
 * @param email 用户邮箱
 * @param ip 用户IP地址
 * @param success 是否登录成功
 */
export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  const now = Date.now();
  const key = `login:${email}:attempts`;
  
  try {
    // 记录登录尝试，使用哈希表存储
    await redis.hset(key, {
      [`${now}`]: `${success ? 'success' : 'failed'}:${ip}`
    });
    
    // 设置7天过期
    await redis.expire(key, 60 * 60 * 24 * 7);
    
    // 如果登录失败，增加失败计数
    if (!success) {
      await recordFailedLoginAttempt(email);
    } else {
      // 登录成功，重置失败计数
      await resetFailedLoginAttempts(email);
    }
  } catch (error) {
    console.error('记录登录尝试失败:', error);
  }
}

/**
 * 记录失败的登录尝试
 * @param email 用户邮箱
 * @returns 剩余尝试次数，如果返回0表示账户已被锁定
 */
export async function recordFailedLoginAttempt(email: string): Promise<number> {
  const key = `failed:login:${email}`;
  
  // 获取当前失败次数
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount.toString(), 10) : 0;
  
  // 增加失败计数
  const newCount = count + 1;
  await redis.set(key, newCount.toString());
  
  // 首次设置失败计数时设置过期时间
  if (count === 0) {
    await redis.expire(key, ACCOUNT_LOCK_TIME);
  }
  
  // 如果达到最大失败次数，锁定账户
  if (newCount >= MAX_FAILED_ATTEMPTS) {
    await lockAccount(email);
    return 0;
  }
  
  // 返回剩余尝试次数
  return MAX_FAILED_ATTEMPTS - newCount;
}

/**
 * 重置失败的登录尝试
 * @param email 用户邮箱
 */
export async function resetFailedLoginAttempts(email: string): Promise<void> {
  const key = `failed:login:${email}`;
  await redis.del(key);
}

/**
 * 锁定账户
 * @param email 用户邮箱
 * @param duration 锁定时间（秒），默认为设置的账户锁定时间
 */
export async function lockAccount(email: string, duration: number = ACCOUNT_LOCK_TIME): Promise<void> {
  const key = `locked:account:${email}`;
  await redis.set(key, 'locked');
  await redis.expire(key, duration);
}

/**
 * 检查账户是否被锁定
 * @param email 用户邮箱
 * @returns 账户锁定状态，true表示已锁定，false表示未锁定，如果锁定则返回剩余锁定时间
 */
export async function isAccountLocked(email: string): Promise<{ locked: boolean; remainingTime?: number }> {
  const key = `locked:account:${email}`;
  const isLocked = await redis.get(key);
  
  if (isLocked) {
    const ttl = await redis.ttl(key);
    return {
      locked: true,
      remainingTime: ttl > 0 ? ttl : ACCOUNT_LOCK_TIME
    };
  }
  
  return { locked: false };
}

/**
 * 解锁账户
 * @param email 用户邮箱
 */
export async function unlockAccount(email: string): Promise<void> {
  const key = `locked:account:${email}`;
  await redis.del(key);
  
  // 同时重置失败尝试计数
  await resetFailedLoginAttempts(email);
}

/**
 * 记录成功的登录
 * @param email 用户邮箱
 */
export async function recordSuccessfulLogin(email: string): Promise<void> {
  // 重置失败尝试
  await resetFailedLoginAttempts(email);
  
  // 记录最后登录时间
  const key = `last:login:${email}`;
  await redis.set(key, Date.now().toString());
}

/**
 * 获取最近一次成功登录的时间
 * @param email 用户邮箱
 * @returns 最近登录时间的时间戳，如果没有记录则返回null
 */
export async function getLastLoginTime(email: string): Promise<number | null> {
  const key = `last:login:${email}`;
  const lastLogin = await redis.get(key);
  
  return lastLogin ? parseInt(lastLogin.toString(), 10) : null;
} 