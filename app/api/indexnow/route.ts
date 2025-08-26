import { NextRequest, NextResponse } from 'next/server'

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'your-indexnow-key-here'
const INDEXNOW_API_URL = 'https://api.indexnow.org/indexnow'

interface IndexNowSubmission {
  host: string
  key: string
  urlList: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json()
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'No URLs provided' },
        { status: 400 }
      )
    }

    const submission: IndexNowSubmission = {
      host: 'www.behindmemory.com',
      key: INDEXNOW_KEY,
      urlList: urls
    }

    // Submit to IndexNow
    const response = await fetch(INDEXNOW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(submission)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`IndexNow submission failed: ${response.status} - ${errorText}`)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully submitted ${urls.length} URLs to IndexNow`
    })

  } catch (error) {
    console.error('IndexNow submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit URLs to IndexNow' },
      { status: 500 }
    )
  }
}

// GET method to trigger submission of all pages
export async function GET() {
  try {
    // Get all pages from sitemap
    const sitemapModule = await import('@/app/sitemap')
    const sitemap = sitemapModule.default()
    
    const urls = sitemap.map(page => page.url)
    
    const submission: IndexNowSubmission = {
      host: 'www.behindmemory.com',
      key: INDEXNOW_KEY,
      urlList: urls
    }

    // Submit to IndexNow
    const response = await fetch(INDEXNOW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(submission)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`IndexNow submission failed: ${response.status} - ${errorText}`)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully submitted ${urls.length} URLs to IndexNow`,
      urls
    })

  } catch (error) {
    console.error('IndexNow submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit URLs to IndexNow' },
      { status: 500 }
    )
  }
}