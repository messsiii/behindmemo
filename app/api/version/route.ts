import packageJson from '@/package.json'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      version: packageJson.version,
      timestamp: Date.now(),
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error getting version:', error)
    return NextResponse.json(
      { error: 'Failed to get version' },
      { status: 500 }
    )
  }
} 