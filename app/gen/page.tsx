import { featureFlags } from '@/lib/featureFlags'
import { redirect } from 'next/navigation'

export default function GenDefaultPage() {
  if (!featureFlags.enableAiImages) {
    redirect('/')
  }

  redirect('/flux-kontext-pro')
}
