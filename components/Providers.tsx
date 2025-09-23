'use client'

import { UnsafeBrowserWarning } from '@/app/components/UnsafeBrowserWarning'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { NavigationEventsHandler } from './NavigationEventsHandler'

export function Providers({ children, session }: { children: React.ReactNode; session: any }) {
  return (
    <SessionProvider session={session}>
      <LanguageProvider>
        <NavigationEventsHandler />
        {children}
        <UnsafeBrowserWarning />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '10px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </LanguageProvider>
    </SessionProvider>
  )
}
