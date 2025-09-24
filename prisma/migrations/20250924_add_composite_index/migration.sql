-- CreateIndex
CREATE INDEX IF NOT EXISTS "image_generations_userId_createdAt_idx" ON "image_generations"("userId", "createdAt" DESC);

-- 分析表以更新统计信息
ANALYZE "image_generations";