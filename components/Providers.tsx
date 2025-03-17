'use client'

import { UnsafeBrowserWarning } from '@/app/components/UnsafeBrowserWarning';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SessionProvider } from 'next-auth/react';
import { NavigationEventsHandler } from './NavigationEventsHandler';

export function Providers({ children, session }: { children: React.ReactNode; session: any }) {
  return (
    <SessionProvider session={session}>
      <LanguageProvider>
        <NavigationEventsHandler />
        {children}
        <UnsafeBrowserWarning />
      </LanguageProvider>
    </SessionProvider>
  )
}
