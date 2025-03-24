import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60 // 设置最大执行时间为 60 秒

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const TARGET_QUALITY = 80
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080

export async function POST(request: Request): Promise<NextResponse> {
  try {
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

      // 计算目标尺寸，保持宽高比
      let targetWidth = metadata.width || 0
      let targetHeight = metadata.height || 0

      if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
        const aspectRatio = targetWidth / targetHeight

        if (aspectRatio > MAX_WIDTH / MAX_HEIGHT) {
          // 宽度超出限制
          targetWidth = MAX_WIDTH
          targetHeight = Math.round(MAX_WIDTH / aspectRatio)
        } else {
          // 高度超出限制
          targetHeight = MAX_HEIGHT
          targetWidth = Math.round(MAX_HEIGHT * aspectRatio)
        }
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
      
      // 上传到 Vercel Blob
      try {
        console.log('开始上传到Blob存储...');
        const blob = await put(file.name, optimizedBuffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: 'image/jpeg', // 统一使用 JPEG 格式
          addRandomSuffix: true, // 添加随机后缀避免文件名冲突
        })
        
        console.log(`上传成功, URL: ${blob.url.substring(0, 60)}...`);
        console.log(`URL长度: ${blob.url.length}字符`);

        // 添加额外的日志信息
        console.log('=== 图片处理后分析 ===');
        console.log(`Blob URL长度: ${blob.url.length} 字符`);
        
        // 创建返回数据
        const responseData = {
          success: true,
          url: blob.url,
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
