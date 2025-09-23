import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 随机名字列表
const adjectives = ['快乐的', '聪明的', '勇敢的', '温暖的', '可爱的', '活泼的', '友好的', '阳光的']
const nouns = ['小熊', '小猫', '小狗', '小鸟', '小兔', '小鹿', '小象', '小狮']

function generateNameFromFingerprint(fingerprint: string) {
  // 使用指纹生成稳定的名字
  let hash1 = 0,
    hash2 = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    if (i % 2 === 0) {
      hash1 = (hash1 << 5) - hash1 + char
      hash1 = hash1 & hash1
    } else {
      hash2 = (hash2 << 5) - hash2 + char
      hash2 = hash2 & hash2
    }
  }

  const adjIndex = Math.abs(hash1) % adjectives.length
  const nounIndex = Math.abs(hash2) % nouns.length
  return `${adjectives[adjIndex]}${nouns[nounIndex]}`
}

function generateAvatarFromFingerprint(fingerprint: string) {
  const styles = [
    'adventurer',
    'avataaars',
    'big-smile',
    'bottts',
    'croodles',
    'fun-emoji',
    'lorelei',
    'micah',
    'miniavs',
    'personas',
    'pixel-art',
  ]

  // 使用指纹的哈希值来选择样式和生成种子，保证同一指纹生成相同的头像
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const styleIndex = Math.abs(hash) % styles.length
  const style = styles[styleIndex]
  // 使用指纹本身作为种子，确保稳定性
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${fingerprint}`
}

// 创建或获取临时用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { browserFingerprint } = body

    if (!browserFingerprint) {
      return NextResponse.json({ error: '缺少浏览器指纹' }, { status: 400 })
    }

    // 查找已存在的临时用户
    let tempUser = await prisma.tempUser.findUnique({
      where: { browserFingerprint },
    })

    // 如果不存在，创建新的临时用户
    if (!tempUser) {
      tempUser = await prisma.tempUser.create({
        data: {
          browserFingerprint,
          randomName: generateNameFromFingerprint(browserFingerprint),
          randomAvatar: generateAvatarFromFingerprint(browserFingerprint),
        },
      })
    } else {
      // 更新最后活跃时间
      tempUser = await prisma.tempUser.update({
        where: { id: tempUser.id },
        data: { lastActiveAt: new Date() },
      })
    }

    return NextResponse.json(tempUser)
  } catch (error) {
    console.error('临时用户创建失败:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
