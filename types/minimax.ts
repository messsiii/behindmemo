interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

interface CompletionOptions {
  model: string
  messages: Message[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
  reply_constraints?: {
    sender_type: string
    sender_name: string
  }
  plugins?: string[]
}

export class MiniMax {
  private apiKey: string
  private groupId: string

  constructor(groupId: string, apiKey: string) {
    if (!groupId || !apiKey) {
      throw new Error('MiniMax API credentials are required')
    }
    this.groupId = groupId
    this.apiKey = apiKey
  }

  chat = {
    completions: {
      create: async (options: CompletionOptions): Promise<Response> => {
        try {
          console.log('[MINIMAX_API_REQUEST]', {
            url: `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${this.groupId}`,
            options,
          })

          const response = await fetch(
            `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${this.groupId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify({
                ...options,
                stream: true, // 强制使用流式响应
                reply_constraints: {
                  sender_type: 'BOT',
                  sender_name: 'AI',
                },
              }),
            }
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            console.error('[MINIMAX_API_ERROR]', {
              status: response.status,
              statusText: response.statusText,
              errorData,
            })
            throw new Error(`MiniMax API error: ${response.status} ${response.statusText}`)
          }

          return response
        } catch (error) {
          console.error('[MINIMAX_API_REQUEST_ERROR]', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
          })
          throw error
        }
      },
    },
  }
}
