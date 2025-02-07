import Image from "next/image"
import { cookies } from "next/headers"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { redirect } from "next/navigation"

export default function ResultPage({ params }: { params: { id: string } }) {
  console.log("Rendering ResultPage with id:", params.id)

  const letterDataCookie = cookies().get("letterData")
  console.log("Cookie data:", letterDataCookie?.value)

  if (!letterDataCookie?.value) {
    console.log("No letterData cookie found")
    redirect("/")
  }

  let letterData
  try {
    letterData = JSON.parse(letterDataCookie.value)
    console.log("Parsed letter data:", letterData)
  } catch (error) {
    console.error("Error parsing cookie data:", error)
    redirect("/")
  }

  if (letterData.id !== params.id) {
    console.log("Letter ID mismatch:", { cookieId: letterData.id, paramsId: params.id })
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50 p-4">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="relative h-[300px] md:h-[600px] md:w-1/2">
              <Image
                src={`data:image/jpeg;base64,${letterData.photo}`}
                alt="Your shared moment"
                fill
                className="object-cover"
                priority
              />
            </div>
            <CardContent className="p-8 md:w-1/2 overflow-y-auto max-h-[600px]">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Your Love Letter</h2>
                <div className="prose prose-lg">
                  {letterData.letter.split("\n").map(
                    (paragraph: string, index: number) =>
                      paragraph.trim() && (
                        <p key={index} className="text-lg leading-relaxed">
                          {paragraph}
                        </p>
                      ),
                  )}
                </div>
                <div className="pt-6 text-center">
                  <Link href="/">
                    <Button variant="outline" className="rounded-full px-8">
                      Create Another Letter
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}

