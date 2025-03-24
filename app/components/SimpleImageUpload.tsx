import { compressImage } from '@/lib/imageUtils'

// ... existing code ...

// 处理 HEIC 转换和预览
const createPreview = useCallback(async (file: File) => {
  try {
    // 检查缓存
    const cachedItem = CacheManager.get(file)
    if (cachedItem) {
      setPreview(cachedItem.url)
      setIsLoading(false)
      // 如果是HEIC文件并且有转换后的blob，使用转换后的文件
      if ((file.type.includes('heic') || file.name.toLowerCase().endsWith('.heic')) && cachedItem.blob) {
        const convertedFile = new File([cachedItem.blob], file.name.replace(/\.heic$/i, '.jpg'), { 
          type: 'image/jpeg',
          lastModified: file.lastModified
        })
        // 设置转换后的文件为选中文件
        setSelectedFile(convertedFile)
        // 传递转换后的文件给父组件
        onImageSelected(convertedFile)
      }
      return
    }

    setError(null)
    setIsLoading(true)

    // 检查文件大小
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(language === 'en' ? 'Image size exceeds 10MB limit' : '图片大小超过10MB限制')
    }

    // 对于非 HEIC 格式，先尝试压缩
    if (!file.type.includes('heic') && !file.name.toLowerCase().endsWith('.heic')) {
      let processedFile = file;
      
      // 如果文件大于2MB，进行压缩
      if (file.size > 2 * 1024 * 1024) {
        try {
          processedFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8
          });
          console.log(`Image compressed from ${file.size} to ${processedFile.size} bytes`);
        } catch (err) {
          console.warn('Image compression failed, using original file:', err);
        }
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        CacheManager.set(processedFile, result)
        const cached = CacheManager.get(processedFile)
        if (cached) {
          setPreview(cached.url)
        }
        setIsLoading(false)
        setSelectedFile(processedFile)
        onImageSelected(processedFile)
      }
      reader.onerror = () => {
        setError(language === 'en' ? 'Failed to read image file' : '读取图片文件失败')
        setIsLoading(false)
      }
      reader.readAsDataURL(processedFile)
      return
    }

// ... existing code ... 