import ImageGenerationResults from '@/app/components/ImageGenerationResults'
import { authConfig } from '@/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Generation Results - Behind Memory',
  description: 'View your AI image generation history and results',
}

export default async function GenerationResultsPage() {
  const session = await getServerSession(authConfig)
  
  // 需要用户登录才能访问
  if (!session) {
    redirect('/login?redirect=/gen/results')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 背景装饰 */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-2000 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-4000 animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <ImageGenerationResults />
      </div>
    </div>
  )
} 