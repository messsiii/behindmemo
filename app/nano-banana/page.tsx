import FluxKontektPro from '@/app/components/FluxKontextPro'

export const metadata = {
  title: 'Nano Banana - AI Image Generation | Behind Memory',
  description:
    "Experience Google's playful AI image generation with Nano Banana - powered by Gemini 2.5 Flash Image",
}

export default function NanoBananaPage() {
  return <FluxKontektPro initialModel="banana" />
}
