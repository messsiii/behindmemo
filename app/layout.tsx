import { authConfig } from '@/auth'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { Providers } from '@/components/Providers'
import { ChinaRegionNotice } from '@/app/components/ChinaRegionNotice'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// 动态获取站点URL
const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.STORAGE_PROVIDER === 'tencent-cos') {
    return 'https://behindmemory.cn'
  }
  return 'https://www.behindmemory.com'
}

const siteUrl = getSiteUrl()

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
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
    siteName: 'Behind Memory',
    images: [
      {
        url: `${siteUrl}/images/og-image.jpg`,
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
    images: [`${siteUrl}/images/og-image.jpg`],
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

  // 检测是否为中国站点
  const isChinaSite =
    process.env.NEXT_PUBLIC_APP_URL?.includes('behindmemory.cn') ||
    process.env.STORAGE_PROVIDER === 'tencent-cos'

  return (
    <html lang="en">
      <head>
        {/* 仅在非中国站点加载Google字体 */}
        {!isChinaSite && (
          <>
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
              href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:wght@400;700&display=swap"
              rel="stylesheet"
            />
          </>
        )}
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          <ChinaRegionNotice />
          {children}
        </Providers>
        {/* 仅在非中国站点加载Vercel和Google Analytics */}
        {!isChinaSite && (
          <>
            <Analytics />
            <GoogleAnalytics />
          </>
        )}
      </body>
    </html>
  )
}
