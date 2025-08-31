// IndexedDB 图片缓存管理
const DB_NAME = 'flux-image-cache'
const DB_VERSION = 1
const STORE_NAME = 'images'

interface CachedImage {
  id: string
  blob: Blob
  metadata: {
    name: string
    type: string
    size: number
    timestamp: number
  }
}

class ImageCache {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  async saveImage(id: string, blob: Blob, metadata?: any): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const data: CachedImage = {
        id,
        blob,
        metadata: {
          name: metadata?.name || 'image.png',
          type: blob.type || 'image/png',
          size: blob.size,
          timestamp: Date.now(),
          ...metadata
        }
      }

      const request = store.put(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getImage(id: string): Promise<CachedImage | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteImage(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 清理旧数据（超过7天）
  async cleanup(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.openCursor()

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const data = cursor.value as CachedImage
          if (data.metadata.timestamp < sevenDaysAgo) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })
  }
}

export const imageCache = new ImageCache()

// 工具函数：Blob 转 base64
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 工具函数：base64 转 Blob
export async function base64ToBlob(base64: string): Promise<Blob> {
  const response = await fetch(base64)
  return response.blob()
}

// 工具函数：URL 转 Blob
export async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  return response.blob()
}