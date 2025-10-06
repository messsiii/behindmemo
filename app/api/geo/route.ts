import { NextRequest, NextResponse } from 'next/server'

/**
 * IP地理位置检测API
 * 使用Cloudflare的cf对象或请求头判断用户地理位置
 */
export async function GET(request: NextRequest) {
  try {
    // 方法1: 优先使用Cloudflare的国家代码（如果通过CF代理）
    const cfCountry = request.headers.get('cf-ipcountry')

    // 方法2: 使用X-Forwarded-For获取真实IP
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // 方法3: Vercel地理位置信息 (如果存在)
    // @ts-expect-error - geo属性仅在Vercel环境可用
    const vercelCountry = request.geo?.country

    // 判断是否为中国大陆
    const countryCode = cfCountry || vercelCountry || ''
    const isChina = countryCode === 'CN'

    // 检测当前访问的域名
    const host = request.headers.get('host') || ''
    const isChinaSite = host.includes('cn.behindmemory.com')

    return NextResponse.json({
      ip,
      country: countryCode,
      isChina,
      isChinaSite,
      shouldSuggestSwitch: isChina && !isChinaSite, // 中国用户访问海外站，建议切换
      suggestedUrl: isChina && !isChinaSite ? 'https://cn.behindmemory.com' : null,
    })
  } catch (error) {
    console.error('Geo detection error:', error)
    return NextResponse.json(
      {
        error: 'Failed to detect location',
        isChina: false,
        isChinaSite: false,
        shouldSuggestSwitch: false,
      },
      { status: 500 }
    )
  }
}
