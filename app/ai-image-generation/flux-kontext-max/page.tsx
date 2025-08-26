import FluxKontextPro from '@/app/components/FluxKontextPro'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flux Kontext Max - Premium AI Image Generation | Behind Memory',
  description: 'Experience premium AI image generation with Flux Kontext Max. Superior quality transformations at 20 credits per generation.',
  openGraph: {
    title: 'Flux Kontext Max - Premium AI Image Generation',
    description: 'Premium AI image generation with Flux Kontext Max. Superior quality results for professional use.',
    type: 'website',
    url: 'https://behindmemory.com/ai-image-generation/flux-kontext-max',
    images: [
      {
        url: 'https://behindmemory.com/images/flux-kontext-max-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Flux Kontext Max Premium AI Image Generation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flux Kontext Max - Premium AI Image Generation',
    description: 'Transform photos with premium AI technology for exceptional results',
    images: ['https://behindmemory.com/images/flux-kontext-max-twitter.jpg'],
  },
  alternates: {
    canonical: 'https://behindmemory.com/ai-image-generation/flux-kontext-max',
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

export default function FluxKontextMaxPage() {
  return (
    <div 
      className="min-h-screen overflow-x-hidden bg-gradient-to-br from-black via-slate-950 to-black" 
      data-page="flux-kontext-max"
    >
      {/* 背景装饰 */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-2000 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-4000 animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <FluxKontextPro initialModel="max" />
      </div>
    </div>
  )
}