'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { Check, Copy, Download, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ShareStatus {
  isShared: boolean
  shareUrl?: string
  templateStyle?: string
  hideWatermark?: boolean
  viewCount?: number
}

export function ShareLetterDialog({ 
  isOpen, 
  onClose, 
  letterId, 
  currentTemplate,
  isVIP = false,
  currentHideWatermark = false,
  onSaveAsImage,
  isSaving = false
}: { 
  isOpen: boolean,
  onClose: () => void,
  letterId: string,
  currentTemplate: string,
  isVIP?: boolean,
  currentHideWatermark?: boolean,
  onSaveAsImage?: () => void,
  isSaving?: boolean
}) {
  const { language } = useLanguage()
  const [shareUrl, setShareUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [shareStatus, setShareStatus] = useState<ShareStatus>({ isShared: false })
  const [isUpdating, setIsUpdating] = useState(false)
  const [needsTemplateUpdate, setNeedsTemplateUpdate] = useState(false)
  const [needsWatermarkUpdate, setNeedsWatermarkUpdate] = useState(false)
  const [sharedTemplateStyle, setSharedTemplateStyle] = useState('')
  const [sharedHideWatermark, setSharedHideWatermark] = useState(false)
  
  // 检查分享状态
  useEffect(() => {
    if (!isOpen || !letterId) return
    
    const checkShareStatus = async () => {
      setIsLoading(true)
      try {
        // 1. 首先检查信件是否已分享
        const response = await fetch(`/api/letters/${letterId}/share-status`)
        if (!response.ok) throw new Error('Failed to check share status')
        
        const data = await response.json()
        setShareStatus(data)
        
        if (data.isShared) {
          setShareUrl(data.shareUrl)
          setSharedTemplateStyle(data.templateStyle || 'classic')
          
          // 明确转换为布尔值
          const fetchedHideWatermark = Boolean(data.hideWatermark);
          setSharedHideWatermark(fetchedHideWatermark)
          
          // 分别检查模板和水印是否需要更新
          setNeedsTemplateUpdate(data.templateStyle !== currentTemplate)
          
          // 直接检查水印设置是否需要更新，不使用setTimeout
          if (isVIP) {
            const currentHideWatermarkBool = Boolean(currentHideWatermark);
            
            console.log('Comparing watermark settings:', {
              currentSetting: currentHideWatermarkBool,
              serverSetting: fetchedHideWatermark,
              needsUpdate: currentHideWatermarkBool !== fetchedHideWatermark
            });
            
            setNeedsWatermarkUpdate(currentHideWatermarkBool !== fetchedHideWatermark);
          }
          
          // 如果已有分享URL，请求最新的viewCount但不增加计数
          if (data.shareUrl) {
            try {
              // 使用noIncrement=true参数请求共享信件信息，避免增加计数
              const token = data.accessToken;
              const sharedResponse = await fetch(`/api/shared/${token}?noIncrement=true`);
              if (sharedResponse.ok) {
                const sharedData = await sharedResponse.json();
                // 更新视图计数，确保显示最新的计数而不增加计数
                if (sharedData.viewCount !== undefined) {
                  // 使用服务器返回的最新viewCount更新状态
                  setShareStatus(prev => ({
                    ...prev,
                    viewCount: sharedData.viewCount
                  }));
                }
              }
            } catch (error) {
              console.error('Failed to fetch updated view count:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check share status:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkShareStatus()
  }, [isOpen, letterId, currentTemplate, isVIP, currentHideWatermark])
  
  // 处理生成分享链接
  const handleShareLetter = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/letters/${letterId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateStyle: currentTemplate,
          hideWatermark: currentHideWatermark
        })
      })
      
      if (!response.ok) throw new Error('Failed to share letter')
      
      const data = await response.json()
      setShareUrl(data.shareUrl)
      setShareStatus({
        isShared: true,
        shareUrl: data.shareUrl,
        templateStyle: data.templateStyle,
        hideWatermark: data.hideWatermark
      })
      setSharedTemplateStyle(data.templateStyle)
      setSharedHideWatermark(data.hideWatermark)
      setNeedsTemplateUpdate(false)
      setNeedsWatermarkUpdate(false)
    } catch (error) {
      toast({
        title: language === 'en' ? 'Sharing Failed' : '分享失败',
        description: language === 'en' ? 'Failed to generate sharing link' : '生成分享链接时出错，请重试',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // 更新模板样式和水印设置
  const updateTemplateAndWatermark = async () => {
    setIsUpdating(true)
    try {
      const requestBody = {
        templateStyle: currentTemplate,
        updateTemplate: true,
        hideWatermark: currentHideWatermark
      };
      
      console.log('Sending update request:', requestBody);
      
      const response = await fetch(`/api/letters/${letterId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('Error updating share settings:', errorData);
        throw new Error(errorData.error || 'Failed to update settings');
      }
      
      const data = await response.json();
      console.log('Response from server:', data);
      
      // 确保显式转换为布尔值，避免类型不匹配问题
      const updatedHideWatermark = Boolean(data.hideWatermark);
      
      // 更新本地状态
      setSharedTemplateStyle(data.templateStyle);
      setSharedHideWatermark(updatedHideWatermark);
      
      // 更新父组件中的共享状态
      setShareStatus(prev => ({
        ...prev,
        templateStyle: data.templateStyle,
        hideWatermark: updatedHideWatermark
      }));
      
      setNeedsTemplateUpdate(false);
      setNeedsWatermarkUpdate(false);
      
      console.log('Updated local state:', {
        templateStyle: data.templateStyle,
        hideWatermark: updatedHideWatermark
      });
      
      // 确定更新了什么内容并显示相应提示
      let updateMessage = '';
      const templateUpdated = currentTemplate !== sharedTemplateStyle;
      const watermarkUpdated = currentHideWatermark !== sharedHideWatermark;
      
      if (templateUpdated && watermarkUpdated) {
        updateMessage = language === 'en' 
          ? 'The shared letter template and watermark settings have been updated' 
          : '已更新分享信件的模板样式和水印设置';
      } else if (templateUpdated) {
        updateMessage = language === 'en' 
          ? 'The shared letter template has been updated' 
          : '已更新分享信件的模板样式';
      } else if (watermarkUpdated) {
        updateMessage = language === 'en' 
          ? 'The shared letter watermark setting has been updated' 
          : '已更新分享信件的水印设置';
      } else {
        updateMessage = language === 'en'
          ? 'No changes were detected'
          : '未检测到变更';
      }
      
      toast({ 
        title: language === 'en' ? 'Settings Updated' : '设置已更新',
        description: updateMessage
      });
    } catch (error) {
      console.error('Error in updateTemplateAndWatermark:', error);
      toast({
        title: language === 'en' ? 'Update Failed' : '更新失败',
        description: error instanceof Error ? error.message : 
          (language === 'en' ? 'Failed to update settings' : '更新设置失败，请重试'),
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // 复制链接到剪贴板
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    toast({ 
      title: language === 'en' ? 'Copied to clipboard' : '已复制到剪贴板' 
    })
    setTimeout(() => setIsCopied(false), 2000)
  }
  
  // 获取需要更新的内容提示文本
  const getUpdatePromptText = () => {
    if (needsTemplateUpdate && needsWatermarkUpdate) {
      return language === 'en' 
        ? 'Template and watermark settings have changed' 
        : '模板样式和水印设置已更改';
    } else if (needsTemplateUpdate) {
      return language === 'en' 
        ? 'Template style has changed' 
        : '模板样式已更改';
    } else {
      return language === 'en' 
        ? 'Watermark setting has changed' 
        : '水印设置已更改';
    }
  }
  
  const needsAnyUpdate = needsTemplateUpdate || needsWatermarkUpdate;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Share Letter' : '分享信件'}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {language === 'en' ? 'Loading...' : '加载中...'}
              </p>
            </div>
          </div>
        ) : !shareStatus.isShared ? (
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'en' 
                ? 'Generate a link to share this letter with others' 
                : '生成链接，将此信件分享给他人'}
            </p>
            
            <Button 
              onClick={handleShareLetter} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'en' ? 'Generating...' : '生成中...'}
                </>
              ) : (
                language === 'en' ? 'Generate Sharing Link' : '生成分享链接'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={shareUrl}
                className="flex-1"
              />
              <Button 
                size="icon" 
                onClick={copyToClipboard}
                variant="outline"
                title={language === 'en' ? 'Copy to clipboard' : '复制到剪贴板'}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {needsAnyUpdate && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 flex items-center justify-between">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {getUpdatePromptText()}
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={updateTemplateAndWatermark}
                  disabled={isUpdating}
                  className="gap-1.5"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {language === 'en' ? 'Updating...' : '更新中...'}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      {language === 'en' ? 'Update' : '更新'}
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {shareStatus.viewCount !== undefined && shareStatus.viewCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'en' 
                  ? `Viewed ${shareStatus.viewCount} ${shareStatus.viewCount === 1 ? 'time' : 'times'}` 
                  : `已被查看 ${shareStatus.viewCount} 次`}
              </p>
            )}
            
            <p className="text-sm text-muted-foreground">
              {language === 'en' 
                ? 'Anyone with this link can view your letter' 
                : '任何人都可以通过此链接查看你的信件'}
            </p>
            
            <div className="pt-4 mt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                {language === 'en' 
                  ? 'Save your letter as an image' 
                  : '将你的信件保存为图片'}
              </p>
              <Button
                variant="outline"
                className="w-full rounded-full px-4 py-2 bg-white/20 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 hover:text-primary hover:shadow-md backdrop-blur-md transition-all duration-300"
                onClick={onSaveAsImage}
                disabled={isSaving}
              >
                <span className="flex items-center justify-center gap-2">
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      {language === 'en' ? 'Generating...' : '生成中...'}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      {language === 'en' ? 'Save as Image' : '保存为图片'}
                    </>
                  )}
                </span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 