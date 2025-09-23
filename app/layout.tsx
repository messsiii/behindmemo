import { authConfig } from '@/auth'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { Providers } from '@/components/Providers'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Behind Memory - AI Memory Generator',
  description:
    'Turn Photos into Letters, Memories into Words. Create heartfelt letters from your precious moments with AI assistance.',
  authors: [{ name: 'Behind Memory Team' }],
  generator: 'Next.js',
  applicationName: 'Behind Memory',
  referrer: 'origin-when-cross-origin',
  creator: 'Behind Memory',
  publisher: 'Behind Memory',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://behindmemo.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
      'zh-CN': '/zh',
    },
  },
  openGraph: {
    title: 'Behind Memory - AI Memory Generator',
    description:
      'Turn Photos into Letters, Memories into Words. Create heartfelt letters from your precious moments with AI assistance.',
    url: 'https://behindmemo.com',
    siteName: 'Behind Memory',
    images: [
      {
        url: 'https://behindmemo.com/images/og-image.jpg', // 替换为实际OG图片
        width: 1200,
        height: 630,
        alt: 'Behind Memory - Turn Photos into Letters',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Behind Memory - AI Memory Generator',
    description: 'Turn Photos into Letters, Memories into Words',
    images: ['https://behindmemo.com/images/og-image.jpg'], // 替换为实际Twitter卡片图片
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: [{ url: '/icon-192x192.png' }],
  },
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session = null
  try {
    session = await getServerSession(authConfig)
  } catch (error) {
    // Ignore decryption errors in development
    console.log('Session fetch error (likely old cookie):', error)
  }

  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <Providers session={session}>{children}</Providers>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
