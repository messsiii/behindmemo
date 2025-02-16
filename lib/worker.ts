import { letterQueue } from './queue'

export async function startWorker() {
  console.debug('Worker: starting')
  
  const processQueue = async () => {
    try {
      await letterQueue.processNext()
    } catch (error) {
      console.error('Worker error:', error)
    }
    
    // 使用固定间隔检查队列
    setTimeout(processQueue, 500) // 500ms 间隔，确保不超过 RPM 限制
  }

  // 开始处理队列
  processQueue()
}

export { letterQueue }
