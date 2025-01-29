"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface LoveLetterData {
  letter: string
  blobUrl: string
  name: string
  loverName: string
  timestamp: number
  metadata: any
}

export default function ResultContent() {
  const [letterData, setLetterData] = useState<LoveLetterData | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const storedData = localStorage.getItem("loveLetterData")
    if (!storedData) {
      router.push("/")
      return
    }

    const data = JSON.parse(storedData) as LoveLetterData

    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("loveLetterData")
      router.push("/")
      return
    }

    setLetterData(data)

    // 删除或注释掉这行
    // if (data.metadata) {
    //   console.log("Image Metadata:", data.metadata)
    // }
  }, [router])

  if (!letterData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="max-w-[1600px] mx-auto pb-20">
        <div className="relative min-h-screen">
          {/* Background blur effect */}
          <div className="absolute inset-0 opacity-30">
            <Image
              src={imageError ? "/placeholder.svg" : letterData.blobUrl}
              alt="Background"
              fill
              className="filter blur-xl scale-110 object-cover"
              priority
            />
          </div>

          {/* Main content */}
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl">
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative"
                >
                  {/* Image container with aspect ratio box */}
                  <div className="relative w-full overflow-hidden rounded-xl bg-black/40" style={{ maxHeight: "85vh" }}>
                    <div
                      className={`relative transition-opacity duration-500 ${
                        imageLoaded ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <Image
                        src={imageError ? "/placeholder.svg" : letterData.blobUrl}
                        alt="Your special moment"
                        width={730}
                        height={910}
                        priority
                        className="w-full h-auto max-h-[85vh] object-contain"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageLoaded(true)}
                      />
                    </div>

                    {/* Title overlay with gradient */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none rounded-t-xl" />
                    <motion.h1
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                      className="absolute top-6 left-0 right-0 text-4xl md:text-5xl font-bold text-white text-center px-4 font-display"
                    >
                      Your Love Letter
                    </motion.h1>
                  </div>

                  {/* Letter content */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="mt-6 px-6 md:px-10 py-8 bg-black/90 backdrop-blur-md rounded-xl shadow-xl"
                  >
                    <div className="prose prose-lg max-w-none prose-invert">
                      {letterData.letter.split("\n").map(
                        (paragraph, index) =>
                          paragraph.trim() && (
                            <p
                              key={index}
                              style={{ fontFamily: '"Cormorant Garamond", serif' }}
                              className="text-lg md:text-xl leading-relaxed italic text-gray-100 mb-6 last:mb-0"
                            >
                              {paragraph}
                            </p>
                          ),
                      )}
                    </div>
                    <div className="mt-10 text-center">
                      <Link href="/">
                        <Button
                          variant="outline"
                          className="rounded-full px-8 py-6 text-lg bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white hover:text-white transition-colors"
                        >
                          Create Another Letter
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

