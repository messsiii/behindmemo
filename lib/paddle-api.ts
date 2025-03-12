import { Redis } from '@upstash/redis';

// 初始化Redis客户端（如果有配置）
let redisClient: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('Redis客户端初始化成功');
  } catch (error) {
    console.error('Redis客户端初始化失败:', error);
  }
}

// 内存缓存（兜底方案，如果没有Redis）
const memoryCache: Record<string, { value: any; expires: number }> = {};

// 缓存接口
interface CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

// Redis适配器 - 让Redis实现CacheInterface接口
class RedisAdapter implements CacheInterface {
  private client: Redis;
  
  constructor(client: Redis) {
    this.client = client;
  }
  
  async get(key: string): Promise<string | null> {
    return this.client.get(key) as Promise<string | null>;
  }
  
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { ex: ttlSeconds });
  }
}

// 内存缓存实现
const memCache: CacheInterface = {
  async get(key: string): Promise<string | null> {
    const item = memoryCache[key];
    if (!item) return null;
    if (item.expires < Date.now()) {
      delete memoryCache[key];
      return null;
    }
    return item.value;
  },
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    memoryCache[key] = {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    };
  }
};

// 获取缓存实例（优先使用Redis，否则使用内存缓存）
const getCache = (): CacheInterface => {
  if (redisClient) {
    return new RedisAdapter(redisClient);
  }
  return memCache;
};

/**
 * 智能重试和处理速率限制的Paddle API调用
 */
export async function paddleApiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  cacheKey?: string,
  cacheTtl: number = 300 // 默认缓存5分钟
): Promise<T> {
  // 检查缓存
  if (cacheKey) {
    const cache = getCache();
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  // 准备请求
  const paddleApiKey = process.env.PADDLE_API_KEY;
  if (!paddleApiKey) {
    throw new Error('缺少Paddle API密钥');
  }

  const paddleApiBaseUrl = 'https://api.paddle.com';
  const url = `${paddleApiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // 设置请求默认值
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Authorization': `Bearer ${paddleApiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // 重试逻辑
  let retries = 0;
  const maxRetries = 3;

  while (true) {
    try {
      const response = await fetch(url, requestOptions);

      // 处理速率限制
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        const waitTime = parseInt(retryAfter, 10) * 1000;
        
        console.log(`Paddle API速率限制，等待 ${waitTime/1000} 秒后重试`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // 不计入重试次数，因为这是预期的速率限制
        continue;
      }

      // 处理服务器错误（5xx）
      if (response.status >= 500) {
        if (retries >= maxRetries) {
          throw new Error(`服务器错误，状态码: ${response.status}，已重试${retries}次`);
        }
        
        // 使用指数退避算法
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`服务器错误，${waitTime/1000}秒后重试 (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        retries++;
        continue;
      }

      // 处理成功或客户端错误（4xx，非429）
      const contentType = response.headers.get('content-type');
      let result: any;

      // 解析响应体
      if (contentType?.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      // 如果请求成功且有缓存键，缓存结果
      if (response.ok && cacheKey) {
        const cache = getCache();
        await cache.set(cacheKey, JSON.stringify(result), cacheTtl);
      }

      // 处理错误响应
      if (!response.ok) {
        const error = new Error(`Paddle API错误: ${response.status} ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = result;
        throw error;
      }

      return result;
    } catch (error) {
      // 处理网络错误
      if (!(error instanceof Error) || error.message.includes('fetch failed')) {
        if (retries >= maxRetries) {
          throw new Error(`网络错误，已重试${retries}次: ${error}`);
        }
        
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`网络错误，${waitTime/1000}秒后重试 (${retries + 1}/${maxRetries}): ${error}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        retries++;
        continue;
      }
      
      // 其他错误直接抛出
      throw error;
    }
  }
}

/**
 * 获取订阅详情（带缓存）
 */
export async function getSubscription(subscriptionId: string, includeTxs: boolean = false) {
  const endpoint = `subscriptions/${subscriptionId}${includeTxs ? '?include=transactions' : ''}`;
  const cacheKey = `paddle_sub_${subscriptionId}${includeTxs ? '_with_txs' : ''}`;
  
  return paddleApiRequest(endpoint, {}, cacheKey);
}

/**
 * 获取交易详情（带缓存）
 */
export async function getTransaction(transactionId: string) {
  const endpoint = `transactions/${transactionId}`;
  const cacheKey = `paddle_tx_${transactionId}`;
  
  return paddleApiRequest(endpoint, {}, cacheKey);
}

/**
 * 获取产品详情（带缓存，更长TTL）
 */
export async function getProduct(productId: string, includePrices: boolean = true) {
  const endpoint = `products/${productId}${includePrices ? '?include=prices' : ''}`;
  const cacheKey = `paddle_product_${productId}${includePrices ? '_with_prices' : ''}`;
  
  // 产品信息变化不频繁，可以缓存更长时间
  return paddleApiRequest(endpoint, {}, cacheKey, 3600); // 缓存1小时
}

/**
 * 检查订阅状态（请求类似getSubscription，但更关注状态验证）
 */
export async function verifySubscriptionStatus(subscriptionId: string) {
  try {
    const result = await getSubscription(subscriptionId);
    
    return {
      valid: result.data.status === 'active',
      status: result.data.status,
      subscription: result.data
    };
  } catch (error) {
    console.error('验证订阅状态出错:', error);
    return {
      valid: false,
      status: 'error',
      error
    };
  }
}

/**
 * 日志记录帮助函数
 */
export function logPaddleOperation(operation: string, details: any) {
  // 敏感数据脱敏
  const safeDetails = { ...details };
  
  // 隐藏API密钥等敏感信息
  if (safeDetails.apiKey) safeDetails.apiKey = '********';
  if (safeDetails.token) safeDetails.token = '********';
  
  console.log(`[Paddle] ${operation}:`, safeDetails);
} 