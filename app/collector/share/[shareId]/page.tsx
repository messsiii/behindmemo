import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import CollectorShareClient from './CollectorShareClient'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ shareId: string }>
}

// 生成页面元数据
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params

  try {
    const collection = await prisma.collection.findUnique({
      where: { shareUrl: shareId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    if (!collection) {
      return {
        title: '收集不存在 | Behind Memory',
        description: 'Behind Memory - AI情书生成器，收集美好回忆',
      }
    }

    const creatorName = collection.creator.name || '朋友'

    // 中文版本
    const titleCN = `${creatorName}请你一起完成回忆`
    const descriptionCN = `来参与「${collection.title}」的记忆收集吧！一起上传照片和录制语音，记录美好时刻。`

    // 英文版本
    const titleEN = `${creatorName} invites you to complete the memory`
    const descriptionEN = `Join "${collection.title}" memory collection! Upload photos and record audio to capture beautiful moments together.`

    const url = `https://www.behindmemory.com/collector/share/${shareId}`
    const image = collection.mainImage || 'https://www.behindmemory.com/default-share-image.png'

    return {
      title: titleCN,
      description: descriptionCN,
      openGraph: {
        title: titleCN,
        description: descriptionCN,
        url,
        siteName: 'Behind Memory',
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: collection.title,
          },
        ],
        locale: 'zh_CN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: titleCN,
        description: descriptionCN,
        images: [image],
      },
      alternates: {
        canonical: url,
        languages: {
          'zh-CN': url,
          'en-US': url,
        },
      },
      // 添加备用英文版本的元数据
      other: {
        'og:title:en': titleEN,
        'og:description:en': descriptionEN,
        'twitter:title:en': titleEN,
        'twitter:description:en': descriptionEN,
      },
    }
  } catch (error) {
    console.error('生成元数据失败:', error)
    return {
      title: 'Behind Memory - 记忆收集',
      description: 'Behind Memory - AI情书生成器，收集美好回忆',
    }
  }
}

export default async function CollectorSharePage({ params }: PageProps) {
  const { shareId } = await params

  try {
    const collection = await prisma.collection.findUnique({
      where: { shareUrl: shareId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            tempUser: {
              select: {
                id: true,
                randomName: true,
                randomAvatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!collection) {
      notFound()
    }

    return <CollectorShareClient shareId={shareId} initialCollection={collection} />
  } catch (error) {
    console.error('获取收集数据失败:', error)
    notFound()
  }
}
