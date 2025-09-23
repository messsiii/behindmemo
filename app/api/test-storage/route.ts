import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 检查环境变量
    const config = {
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
      hasR2AccountId: !!process.env.R2_ACCOUNT_ID,
      hasR2AccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasR2SecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasR2Bucket: !!process.env.R2_BUCKET_NAME,
      hasR2PublicUrl: !!process.env.R2_PUBLIC_URL,
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      nodeEnv: process.env.NODE_ENV,
    }

    // 尝试加载 AWS SDK
    let awsSdkStatus = 'not tested'
    try {
      const { S3Client } = await import('@aws-sdk/client-s3')
      awsSdkStatus = 'loaded successfully'

      // 尝试创建客户端
      if (process.env.R2_ACCOUNT_ID) {
        const client = new S3Client({
          region: 'auto',
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
          },
        })
        awsSdkStatus = 'client created'
      }
    } catch (error: any) {
      awsSdkStatus = `error: ${error.message}`
    }

    // 尝试加载 Vercel Blob
    let blobStatus = 'not tested'
    try {
      const { put } = await import('@vercel/blob')
      blobStatus = 'loaded successfully'
    } catch (error: any) {
      blobStatus = `error: ${error.message}`
    }

    return NextResponse.json({
      success: true,
      config,
      awsSdkStatus,
      blobStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
