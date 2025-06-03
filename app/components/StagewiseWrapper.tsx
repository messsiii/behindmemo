'use client'

import { useEffect } from 'react'

const StagewiseWrapper = () => {
  useEffect(() => {
    // 只在开发模式和客户端环境下加载
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
      return
    }

    const loadStagewise = async () => {
      try {
        // 等待主应用完全加载和样式渲染完成
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            // 额外延迟确保所有样式都已应用
            setTimeout(resolve, 1000)
          } else {
            window.addEventListener('load', () => {
              setTimeout(resolve, 1000)
            }, { once: true })
          }
        })

        const { StagewiseToolbar } = await import('@stagewise/toolbar-next')
        
        // 基础配置
        const stagewiseConfig = {
          plugins: []
        }

        // 创建工具栏容器并添加样式隔离
        const toolbarContainer = document.createElement('div')
        toolbarContainer.id = 'stagewise-toolbar-container'
        
        // 添加样式隔离和高优先级定位
        toolbarContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 999999 !important;
          pointer-events: none !important;
          width: 100% !important;
          height: 100% !important;
          contain: layout style paint !important;
          isolation: isolate !important;
        `
        
        document.body.appendChild(toolbarContainer)

        // 动态创建 React root 并渲染工具栏
        const { createRoot } = await import('react-dom/client')
        const root = createRoot(toolbarContainer)
        
        const ToolbarComponent = () => (
          <div style={{ 
            pointerEvents: 'auto',
            contain: 'layout style paint',
            isolation: 'isolate'
          }}>
            <StagewiseToolbar config={stagewiseConfig} />
          </div>
        )
        
        root.render(<ToolbarComponent />)
      } catch (error) {
        console.warn('Failed to load Stagewise toolbar:', error)
      }
    }

    loadStagewise()

    // 清理函数
    return () => {
      const container = document.getElementById('stagewise-toolbar-container')
      if (container) {
        container.remove()
      }
    }
  }, [])

  // 开发模式下返回 null
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return null // 组件本身不渲染任何内容
}

export default StagewiseWrapper 