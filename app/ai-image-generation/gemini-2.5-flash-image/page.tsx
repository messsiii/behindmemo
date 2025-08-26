import FluxKontextPro from '@/app/components/FluxKontextPro'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gemini 2.5 Flash Image - AI Image Generation | Behind Memory',
  description: 'Experience Google Gemini 2.5 Flash for AI image generation. Premium quality transformations at 30 credits per generation.',
  openGraph: {
    title: 'Gemini 2.5 Flash Image - AI Image Generation',
    description: 'Transform photos with Google Gemini 2.5 Flash. Fast and efficient AI image generation.',
    type: 'website',
    url: 'https://behindmemory.com/ai-image-generation/gemini-2.5-flash-image',
    images: [
      {
        url: 'https://behindmemory.com/images/gemini-flash-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Gemini 2.5 Flash Image AI Generation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gemini 2.5 Flash Image - AI Generation',
    description: 'Fast AI image generation with Google Gemini 2.5 Flash',
    images: ['https://behindmemory.com/images/gemini-flash-twitter.jpg'],
  },
  alternates: {
    canonical: 'https://behindmemory.com/ai-image-generation/gemini-2.5-flash-image',
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

export default function GeminiFlashImagePage() {
  return (
    <div 
      className="min-h-screen overflow-x-hidden bg-gradient-to-br from-black via-slate-950 to-black" 
      data-page="gemini-2.5-flash-image"
    >
      {/* 背景装饰 */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-2000 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animation-delay-4000 animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <FluxKontextPro initialModel="gemini" />
      </div>
    </div>
  )
}