import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { uploadFile, getStorageInfo } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 60 // 设置最大执行时间为 60 秒

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const TARGET_QUALITY = 80

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 检查用户认证
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 记录请求头信息
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.log('=== 图片上传请求头信息 ===');
    console.log('Content-Type:', headersObj['content-type']);
    console.log('Content-Length:', headersObj['content-length']);
    console.log('User-Agent:', headersObj['user-agent']?.substring(0, 100));
    
    // 如果Content-Length超过某个阈值，发出警告
    if (headersObj['content-length'] && parseInt(headersObj['content-length']) > 5 * 1024 * 1024) {
      console.warn(`警告: 请求大小 ${(parseInt(headersObj['content-length']) / (1024 * 1024)).toFixed(2)}MB 可能导致413错误`);
    }
    
    let formData;
    try {
      formData = await request.formData();
      console.log('FormData解析成功');
    } catch (error) {
      console.error('FormData解析失败:', error);
      return NextResponse.json(
        { error: 'Failed to parse form data', details: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }
    
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;
    const userMetadata = metadataStr ? JSON.parse(metadataStr) : null;

    // 添加日志记录请求大小
    console.log('=== 图片上传请求分析 ===');
    console.log(`原始文件名: ${file?.name}`);
    console.log(`原始文件大小: ${file?.size / 1024 / 1024} MB`);
    console.log(`元数据字符串大小: ${metadataStr?.length || 0} 字符`);
    
    if (metadataStr && metadataStr.length > 10000) {
      console.warn('警告: 元数据字符串过大，可能导致问题');
      console.log('元数据内容:', userMetadata);
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      // 获取原始图片信息
      console.log('开始处理图片...');
      const metadata = await sharp(buffer).metadata();
      console.log(`原始图片信息: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}, 通道: ${metadata.channels}`);

      // 计算目标尺寸，短边固定为1080像素
      const originalWidth = metadata.width || 0
      const originalHeight = metadata.height || 0
      const SHORT_SIDE = 1080
      
      let targetWidth: number
      let targetHeight: number
      
      // 计算宽高比
      const aspectRatio = originalWidth / originalHeight
      
      // 判断哪边是短边，将短边设置为1080像素
      if (originalWidth <= originalHeight) {
        // 宽度是短边
        targetWidth = SHORT_SIDE
        targetHeight = Math.round(SHORT_SIDE / aspectRatio)
      } else {
        // 高度是短边
        targetHeight = SHORT_SIDE
        targetWidth = Math.round(SHORT_SIDE * aspectRatio)
      }

      // 优化图片
      const optimizedBuffer = await sharp(buffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true,
          fastShrinkOnLoad: true,
        })
        .jpeg({
          quality: TARGET_QUALITY,
          progressive: true,
          optimizeScans: true,
          mozjpeg: true,
        })
        .toBuffer()

      // 获取优化后的图片信息
      const optimizedInfo = await sharp(optimizedBuffer).metadata()
      console.log(`优化后图片信息: ${optimizedInfo.width}x${optimizedInfo.height}, 大小: ${(optimizedBuffer.length/1024).toFixed(2)}KB`);

      // 计算压缩率
      const compressionRatio = (file.size / optimizedBuffer.length).toFixed(2)
      const savedSpace = ((file.size - optimizedBuffer.length) / 1024).toFixed(2)
      console.log(`压缩率: ${compressionRatio}倍, 节省空间: ${savedSpace}KB`);

      // 准备上传到Blob存储
      console.log(`准备上传到Blob存储, 文件名: ${file.name}, 大小: ${(optimizedBuffer.length/1024).toFixed(2)}KB`);
      
      // 上传到存储服务
      try {
        const storageInfo = getStorageInfo();
        console.log(`开始上传到${storageInfo.provider}存储...`);
        
        // 生成安全的文件名，使用时间戳和更长的随机字符串
        const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        const secureFileName = `img-${Date.now()}-${randomString}.jpg`
        
        const { url, provider } = await uploadFile(optimizedBuffer, secureFileName, {
          contentType: 'image/jpeg', // 统一使用 JPEG 格式
        })
        
        console.log(`上传成功到 ${provider}, URL: ${url.substring(0, 60)}...`);
        console.log(`URL长度: ${url.length}字符`);

        // 添加额外的日志信息
        console.log('=== 图片处理后分析 ===');
        console.log(`${provider} URL长度: ${url.length} 字符`);
        
        // 创建返回数据
        const responseData = {
          success: true,
          url,
          size: optimizedBuffer.length,
          dimensions: {
            width: optimizedInfo.width,
            height: optimizedInfo.height,
          },
          optimization: {
            savedSpace: `${savedSpace}KB`,
            compressionRatio,
          },
          metadata: userMetadata || {},
          storageProvider: provider,
        };
        
        // 计算响应大小
        const responseJson = JSON.stringify(responseData);
        const responseSizeBytes = new TextEncoder().encode(responseJson).length;
        console.log(`响应大小: ${responseSizeBytes} 字节 (${(responseSizeBytes/1024).toFixed(2)} KB)`);
        
        if (responseSizeBytes > 500000) {
          console.warn('警告: 响应数据大小超过500KB，后续请求可能出现问题');
        }

        return NextResponse.json(responseData)
      } catch (error) {
        console.error('Image processing failed:', error)
        return NextResponse.json(
          {
            error: 'Failed to process image',
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Image processing failed:', error)
      return NextResponse.json(
        {
          error: 'Failed to process image',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Error in upload API:', error)
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
