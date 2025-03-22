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
  description: 'Turn Photos into Letters, Memories into Words',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authConfig)

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
