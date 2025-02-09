'use client'

import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/contexts/LanguageContext'

export function Providers({ children, session }: { children: React.ReactNode; session: any }) {
  return (
    <SessionProvider session={session}>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  )
}
