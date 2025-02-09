import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'History - Behind Memo',
  description: 'View your love letter history',
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
