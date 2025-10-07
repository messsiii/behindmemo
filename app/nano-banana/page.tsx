import FluxKontektPro from '@/app/components/FluxKontextPro'
import { featureFlags } from '@/lib/featureFlags'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Nano Banana - AI Image Generation | Behind Memory',
  description:
    "Experience Google's playful AI image generation with Nano Banana - powered by Gemini 2.5 Flash Image",
}

export default function NanoBananaPage() {
  if (!featureFlags.enableAiImages) {
    redirect('/')
  }

  return <FluxKontektPro initialModel="banana" />
}
