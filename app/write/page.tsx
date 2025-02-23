import { QuotaDisplay } from '@/components/QuotaDisplay'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import LoveLetterForm from '../components/LoveLetterForm'

export const metadata: Metadata = {
  title: 'Write a Love Letter',
  description: 'Create a heartfelt love letter with AI assistance',
}

export default function WritePage() {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <QuotaDisplay />
      </div>
      <div className="fixed top-[14px] left-4 z-50">
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            <Home className="h-[18px] w-[18px]" />
          </Button>
        </Link>
      </div>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50 p-4">
        <LoveLetterForm />
      </main>
    </>
  )
}
