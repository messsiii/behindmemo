import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

const RETRYABLE_CODES = new Set(['P1000', 'P1001', 'P1008', 'P1017', 'P2024'])
const RETRYABLE_MESSAGE_KEYWORDS = ['timeout', 'terminat', 'closed connection', 'ecconnreset']

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function isRetryableError(error: unknown) {
  if (!error) return false

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return false
    }
    return RETRYABLE_CODES.has(error.code)
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as any).code
    if (typeof code === 'string' && RETRYABLE_CODES.has(code)) {
      return true
    }
  }

  const message = error instanceof Error ? error.message : String(error)
  if (!message) return false
  const lowered = message.toLowerCase()
  return RETRYABLE_MESSAGE_KEYWORDS.some(keyword => lowered.includes(keyword))
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const recordId = params.id

    console.log('Delete request for record:', recordId, 'by user:', session.user.id)

    const maxAttempts = 3
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const deleted = await prisma.imageGeneration.deleteMany({
          where: {
            id: recordId,
            userId: session.user.id,
          },
        })

        if (deleted.count === 0) {
          return NextResponse.json({ error: 'Record not found or access denied' }, { status: 404 })
        }

        console.log('Successfully deleted record:', recordId, 'on attempt', attempt)
        return NextResponse.json({ success: true, id: recordId })
      } catch (dbError: any) {
        lastError = dbError
        console.error(`Database error during delete (attempt ${attempt}):`, dbError)

        if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 })
        }

        if (attempt < maxAttempts && isRetryableError(dbError)) {
          await wait(attempt * 150)
          continue
        }

        break
      }
    }

    console.error('Delete failed after retries for record:', recordId, 'error:', lastError)
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  } catch (error: any) {
    console.error('Error deleting generation record:', error)

    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
