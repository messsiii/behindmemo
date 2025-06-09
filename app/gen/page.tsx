import FluxKontextPro from '@/app/components/FluxKontextPro'
import { authConfig } from '@/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'AI Image Generation - Behind Memory',
  description: 'Transform your images with AI-powered generation using Flux Kontext Pro',
}

export default async function GenPage() {
  const session = await getServerSession(authConfig)
  
  // 需要用户登录才能访问
  if (!session) {
    redirect('/login?redirect=/gen')
  }

  return (
    <div 
      className="min-h-screen !bg-gradient-to-br !from-black !via-slate-950 !to-black" 
      data-page="gen"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #020617 50%, #000000 100%)'
      }}
    >
      {/* 背景装饰 */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-2000 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-4000 animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <FluxKontextPro />
      </div>
    </div>
  )
} 