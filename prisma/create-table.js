const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 创建Prisma客户端实例
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('开始创建模板解锁表...');
    
    // 创建表
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "template_unlocks" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "letterId" TEXT NOT NULL,
        "templateId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "template_unlocks_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('- 表创建成功');
    
    // 添加唯一索引
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "template_unlocks_userId_letterId_templateId_key" 
      ON "template_unlocks"("userId", "letterId", "templateId");
    `);
    console.log('- 唯一索引创建成功');
    
    // 添加用户ID索引
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "template_unlocks_userId_idx" ON "template_unlocks"("userId");
    `);
    console.log('- 用户ID索引创建成功');
    
    // 添加信件ID索引
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "template_unlocks_letterId_idx" ON "template_unlocks"("letterId");
    `);
    console.log('- 信件ID索引创建成功');
    
    // 添加外键约束
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "template_unlocks" ADD CONSTRAINT "template_unlocks_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    console.log('- 外键约束创建成功');
    
    console.log('模板解锁表创建成功！');
  } catch (error) {
    console.error('创建表时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 