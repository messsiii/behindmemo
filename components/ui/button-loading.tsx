'use client'

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { ButtonHTMLAttributes, forwardRef } from "react"

export interface ButtonLoadingProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  children: React.ReactNode
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

/**
 * 带有加载状态的按钮组件
 * 
 * 当isLoading为true时，展示加载图标并禁用按钮
 */
export const ButtonLoading = forwardRef<HTMLButtonElement, ButtonLoadingProps>(
  ({ className, children, isLoading = true, size = 'default', variant = 'default', disabled, ...props }, ref) => {
    return (
      <Button
        className={cn(className)}
        disabled={isLoading || disabled}
        size={size}
        variant={variant}
        ref={ref}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Button>
    )
  }
)

ButtonLoading.displayName = 'ButtonLoading' 