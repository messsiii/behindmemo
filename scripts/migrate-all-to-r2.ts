import { prisma } from '../lib/prisma'
import { downloadImageToStorage } from '../lib/downloadToStorage'
import { isR2Configured } from '../lib/r2-storage'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface MigrationResult {
  id: string
  table: 'Letter' | 'ImageGeneration'
  oldUrl: string
  newUrl?: string
  success: boolean
  error?: string
}

async function migrateAllImages() {
  console.log('=== 开始迁移所有图片到 R2 ===')
  
  // 检查 R2 是否已配置
  if (!isR2Configured()) {
    console.error('错误: R2 未配置，请先配置环境变量')
    process.exit(1)
  }
  
  try {
    const results: MigrationResult[] = []
    let successCount = 0
    let failCount = 0
    
    // 1. 迁移 Letter 表的图片
    console.log('\n===== 第一步：迁移信件图片 (Letter 表) =====')
    
    const letters = await prisma.letter.findMany({
      where: {
        imageUrl: {
          contains: 'blob.vercel-storage.com'
        }
      },
      select: {
        id: true,
        imageUrl: true,
      }
    })
    
    console.log(`找到 ${letters.length} 个信件图片需要迁移`)
    
    // 批量处理 Letter 表
    const letterBatchSize = 5
    for (let i = 0; i < letters.length; i += letterBatchSize) {
      const batch = letters.slice(i, Math.min(i + letterBatchSize, letters.length))
      
      console.log(`\n处理 Letter 第 ${Math.floor(i / letterBatchSize) + 1} 批 (${i + 1}-${Math.min(i + letterBatchSize, letters.length)} / ${letters.length})`)
      
      const batchPromises = batch.map(async (letter) => {
        const result: MigrationResult = {
          id: letter.id,
          table: 'Letter',
          oldUrl: letter.imageUrl || '',
          success: false
        }
        
        try {
          if (!letter.imageUrl) {
            throw new Error('图片URL为空')
          }
          
          console.log(`  迁移信件 ${letter.id} 的图片...`)
          
          // 下载并上传到 R2
          const newUrl = await downloadImageToStorage(letter.imageUrl, {
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
          
          console.log(`  ✓ 成功: ${letter.id}`)
        } catch (error) {
          result.error = error instanceof Error ? error.message : String(error)
          failCount++
          
          console.error(`  ✗ 失败: ${letter.id} - ${result.error}`)
        }
        
        return result
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // 批次间休息
      if (i + letterBatchSize < letters.length) {
        console.log('  等待 2 秒后继续下一批...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // 2. 迁移 ImageGeneration 表的图片
    console.log('\n\n===== 第二步：迁移AI生成图片 (ImageGeneration 表) =====')
    
    const generations = await prisma.imageGeneration.findMany({
      where: {
        OR: [
          {
            outputImageUrl: {
              contains: 'blob.vercel-storage.com'
            }
          },
          {
            localOutputImageUrl: {
              contains: 'blob.vercel-storage.com'
            }
          }
        ]
      },
      select: {
        id: true,
        outputImageUrl: true,
        localOutputImageUrl: true,
      }
    })
    
    console.log(`找到 ${generations.length} 个AI生成图片需要迁移`)
    
    // 批量处理 ImageGeneration 表
    const genBatchSize = 5
    for (let i = 0; i < generations.length; i += genBatchSize) {
      const batch = generations.slice(i, Math.min(i + genBatchSize, generations.length))
      
      console.log(`\n处理 ImageGeneration 第 ${Math.floor(i / genBatchSize) + 1} 批 (${i + 1}-${Math.min(i + genBatchSize, generations.length)} / ${generations.length})`)
      
      const batchPromises = batch.map(async (gen) => {
        const result: MigrationResult = {
          id: gen.id,
          table: 'ImageGeneration',
          oldUrl: gen.localOutputImageUrl || gen.outputImageUrl || '',
          success: false
        }
        
        try {
          // 优先使用 localOutputImageUrl，如果没有则使用 outputImageUrl
          const urlToMigrate = gen.localOutputImageUrl || gen.outputImageUrl
          
          if (!urlToMigrate || !urlToMigrate.includes('blob.vercel-storage.com')) {
            throw new Error('没有需要迁移的Blob URL')
          }
          
          console.log(`  迁移生成记录 ${gen.id} 的图片...`)
          
          // 下载并上传到 R2
          const newUrl = await downloadImageToStorage(urlToMigrate, {
            optimize: false // 保持原图质量
          })
          
          // 更新数据库 - 两个字段都更新
          await prisma.imageGeneration.update({
            where: { id: gen.id },
            data: { 
              outputImageUrl: newUrl,
              localOutputImageUrl: newUrl 
            }
          })
          
          result.newUrl = newUrl
          result.success = true
          successCount++
          
          console.log(`  ✓ 成功: ${gen.id}`)
        } catch (error) {
          result.error = error instanceof Error ? error.message : String(error)
          failCount++
          
          console.error(`  ✗ 失败: ${gen.id} - ${result.error}`)
        }
        
        return result
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // 批次间休息
      if (i + genBatchSize < generations.length) {
        console.log('  等待 2 秒后继续下一批...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // 生成迁移报告
    console.log('\n\n===== 迁移报告 =====')
    console.log(`总计: ${results.length} 个图片`)
    console.log(`成功: ${successCount} 个`)
    console.log(`失败: ${failCount} 个`)
    
    // 按表分组统计
    const letterResults = results.filter(r => r.table === 'Letter')
    const genResults = results.filter(r => r.table === 'ImageGeneration')
    
    console.log(`\nLetter 表:`)
    console.log(`  成功: ${letterResults.filter(r => r.success).length} / ${letterResults.length}`)
    
    console.log(`\nImageGeneration 表:`)
    console.log(`  成功: ${genResults.filter(r => r.success).length} / ${genResults.length}`)
    
    if (failCount > 0) {
      console.log('\n失败详情:')
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`- [${r.table}] ${r.id}: ${r.error}`)
        })
    }
    
    // 保存迁移报告
    const reportPath = path.join(process.cwd(), `migration-report-${Date.now()}.json`)
    const fs = await import('fs')
    await fs.promises.writeFile(reportPath, JSON.stringify({
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
        letterSuccess: letterResults.filter(r => r.success).length,
        letterTotal: letterResults.length,
        generationSuccess: genResults.filter(r => r.success).length,
        generationTotal: genResults.length,
      },
      results
    }, null, 2))
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
  migrateAllImages()
    .then(() => {
      console.log('\n迁移完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n迁移失败:', error)
      process.exit(1)
    })
}