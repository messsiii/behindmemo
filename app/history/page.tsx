'use client'

import dynamic from 'next/dynamic'

const HistoryPage = dynamic(() => import('../components/HistoryPage'), {
  ssr: false,
})

export default function History() {
  return <HistoryPage />
}
