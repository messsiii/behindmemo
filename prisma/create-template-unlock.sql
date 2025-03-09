-- 创建模板解锁表
CREATE TABLE IF NOT EXISTS "template_unlocks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "letterId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "template_unlocks_pkey" PRIMARY KEY ("id")
);

-- 添加唯一索引，确保每个用户对每个信件的每个模板只解锁一次
CREATE UNIQUE INDEX IF NOT EXISTS "template_unlocks_userId_letterId_templateId_key" ON "template_unlocks"("userId", "letterId", "templateId");

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS "template_unlocks_userId_idx" ON "template_unlocks"("userId");
CREATE INDEX IF NOT EXISTS "template_unlocks_letterId_idx" ON "template_unlocks"("letterId");

-- 添加外键约束
ALTER TABLE "template_unlocks" ADD CONSTRAINT "template_unlocks_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; 