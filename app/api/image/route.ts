import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageData = searchParams.get("data")

  if (!imageData) {
    return new NextResponse("Image data is missing", { status: 400 })
  }

  const buffer = Buffer.from(imageData, "base64")

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

