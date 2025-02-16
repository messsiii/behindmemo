import { startWorker } from '@/lib/worker'

// 在开发环境中启动工作进程
if (process.env.NODE_ENV === 'development') {
  startWorker().catch(console.error)
}

// 在生产环境中，工作进程将由 Vercel Cron 启动
export const config = {
  runtime: 'nodejs',
} 