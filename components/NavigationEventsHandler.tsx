'use client'

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// 为 Window 对象添加自定义属性声明
declare global {
  interface Window {
    preventReloadOnVisibilityChange?: boolean;
  }
}

/**
 * 处理页面导航事件的组件，确保在应用内部导航时重置特定标志
 */
export function NavigationEventsHandler() {
  const pathname = usePathname()

  useEffect(() => {
    // 当路径变化时，说明在应用内部导航
    // 重置标志，确保从其他页面返回 history 页面时不会触发不必要的重新加载
    if (window.preventReloadOnVisibilityChange) {
      window.preventReloadOnVisibilityChange = false;
    }
  }, [pathname]);

  // 这个组件不渲染任何内容
  return null;
} 