import FluxKontextPro from '@/app/components/FluxKontextPro'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flux Kontext Pro - AI Image Generation Tool | Behind Memory',
  description: 'Transform photos with Flux Kontext Pro AI. Professional quality results with 10 credits per generation. Start with 30 free credits!',
  openGraph: {
    title: 'Flux Kontext Pro - AI Image Generation Tool',
    description: 'Transform your photos with Flux Kontext Pro AI. Professional quality results with advanced AI technology.',
    type: 'website',
    url: 'https://behindmemory.com/ai-image-generation/flux-kontext-pro',
    images: [
      {
        url: 'https://behindmemory.com/images/flux-kontext-pro-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Flux Kontext Pro AI Image Generation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flux Kontext Pro - AI Image Generation',
    description: 'Transform photos with professional AI image generation technology',
    images: ['https://behindmemory.com/images/flux-kontext-pro-twitter.jpg'],
  },
  alternates: {
    canonical: 'https://behindmemory.com/ai-image-generation/flux-kontext-pro',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function FluxKontextProPage() {
  return (
    <div 
      className="min-h-screen overflow-x-hidden bg-gradient-to-br from-black via-slate-950 to-black" 
      data-page="flux-kontext-pro"
    >
      {/* 背景装饰 */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-2000 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-4000 animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <FluxKontextPro initialModel="pro" />
      </div>
    </div>
  )
}