import { prisma } from '../lib/prisma'
import { downloadImageToStorage } from '../lib/downloadToStorage'
import { isR2Configured } from '../lib/r2-storage'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface MigrationResult {
  letterId: string
  oldUrl: string
  newUrl?: string
  success: boolean
  error?: string
}

async function migrateImages() {
  console.log('=== 开始迁移图片到 R2 ===')
  
  // 检查 R2 是否已配置
  if (!isR2Configured()) {
    console.error('错误: R2 未配置，请先配置环境变量')
    process.exit(1)
  }
  
  try {
    // 获取所有使用 Vercel Blob 的信件
    const letters = await prisma.letter.findMany({
      where: {
        imageUrl: {
          contains: 'blob.vercel-storage.com'
        }
      },
      select: {
        id: true,
        imageUrl: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })
    
    console.log(`找到 ${letters.length} 个需要迁移的图片`)
    
    if (letters.length === 0) {
      console.log('没有需要迁移的图片')
      return
    }
    
    const results: MigrationResult[] = []
    let successCount = 0
    let failCount = 0
    
    // 批量处理，每批 5 个
    const batchSize = 5
    for (let i = 0; i < letters.length; i += batchSize) {
      const batch = letters.slice(i, Math.min(i + batchSize, letters.length))
      
      console.log(`\n处理第 ${Math.floor(i / batchSize) + 1} 批 (${i + 1}-${Math.min(i + batchSize, letters.length)} / ${letters.length})`)
      
      const batchPromises = batch.map(async (letter) => {
        const result: MigrationResult = {
          letterId: letter.id,
          oldUrl: letter.imageUrl || '',
          success: false
        }
        
        try {
          console.log(`  迁移信件 ${letter.id} 的图片...`)
          
          // 下载并上传到 R2
          const newUrl = await downloadImageToStorage(letter.imageUrl || '', {
            optimize: false // 保持原图质量
          })
          
          // 更新数据库
          await prisma.letter.update({
            where: { id: letter.id },
            data: { imageUrl: newUrl }
          })
          
          result.newUrl = newUrl
          result.success = true
          successCount++
          
          console.log(`  ✓ 成功: ${letter.id} -> ${newUrl}`)
        } catch (error) {
          result.error = error instanceof Error ? error.message : String(error)
          failCount++
          
          console.error(`  ✗ 失败: ${letter.id} - ${result.error}`)
        }
        
        return result
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // 批次间休息，避免请求过快
      if (i + batchSize < letters.length) {
        console.log('  等待 2 秒后继续下一批...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // 生成迁移报告
    console.log('\n=== 迁移报告 ===')
    console.log(`总计: ${letters.length} 个图片`)
    console.log(`成功: ${successCount} 个`)
    console.log(`失败: ${failCount} 个`)
    
    if (failCount > 0) {
      console.log('\n失败详情:')
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`- ${r.letterId}: ${r.error}`)
        })
    }
    
    // 保存迁移报告
    const reportPath = path.join(process.cwd(), `migration-report-${Date.now()}.json`)
    const fs = await import('fs')
    await fs.promises.writeFile(reportPath, JSON.stringify(results, null, 2))
    console.log(`\n迁移报告已保存到: ${reportPath}`)
    
  } catch (error) {
    console.error('迁移过程出错:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行迁移
if (require.main === module) {
  migrateImages()
    .then(() => {
      console.log('\n迁移完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n迁移失败:', error)
      process.exit(1)
    })
}