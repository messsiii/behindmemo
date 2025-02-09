import Image from 'next/image'

interface FeatureSectionProps {
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  reverse: boolean
  language: 'en' | 'zh'
}

export default function FeatureSection({
  title,
  description,
  imageSrc,
  imageAlt,
  reverse,
  language,
}: FeatureSectionProps) {
  return (
    <div className="h-full flex items-center">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
        <div className={`md:w-1/2 ${reverse ? 'md:order-last' : ''}`}>
          <Image
            src={imageSrc || '/placeholder.svg'}
            alt={imageAlt}
            width={1200}
            height={800}
            className="rounded-2xl shadow-lg"
          />
        </div>
        <div className="md:w-1/2">
          <h2 className={`text-3xl mb-4 ${language === 'en' ? 'font-literary' : 'font-serif-zh'}`}>
            {title}
          </h2>
          <p className={`text-lg text-gray-600 ${language === 'en' ? 'font-literary' : ''}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
