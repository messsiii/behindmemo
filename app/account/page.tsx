'use client'

export const dynamic = 'force-dynamic'

import dynamicImport from 'next/dynamic'

const AccountPage = dynamicImport(() => import('@/components/AccountPage'), {
  ssr: false,
})

export default function Account() {
  return <AccountPage />
}
