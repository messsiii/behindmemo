-- CreateIndex
CREATE INDEX IF NOT EXISTS "image_generations_userId_createdAt_idx" ON "image_generations"("userId", "createdAt" DESC);

-- Analyze table to update statistics
ANALYZE "image_generations";