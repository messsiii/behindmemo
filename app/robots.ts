import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://behindmemory.com';
  
  return {
    rules: [
      {
        // 允许所有爬虫访问大部分页面
        userAgent: '*',
        allow: [
          '/',
          '/blog',
          '/blog/*',
          '/about',
          '/pricing',
          '/terms',
          '/privacy',
          '/faq',
          '/contact',
          '/images/*.jpg',
          '/images/*.png',
          '/images/*.webp',
        ],
      },
      {
        // 禁止爬虫访问用户结果页和匿名结果页
        userAgent: '*',
        disallow: [
          '/result/*',
          '/anonymous/*',
          '/shared/*',
          '/api/*',
          '/account/*',
          '/history/*',
          '/write/*',
          '/checkout/*',
          '/auth/*',
          '/*.json$',       // 禁止访问JSON文件
          '/*?*',           // 禁止访问带参数的URL
          '/*/tmp/*',       // 禁止访问临时目录
          '/admin/*',       // 禁止访问管理页面
        ],
      },
      {
        // Google图片爬虫特殊规则
        userAgent: 'Googlebot-Image',
        allow: [
          '/images/*.jpg',
          '/images/*.png',
          '/images/*.webp',
          '/public/images/*',
        ],
        disallow: [
          '/result/*/images/*', // 禁止访问用户生成的图片
        ],
      },
      {
        // 移动端爬虫规则
        userAgent: 'Googlebot-Mobile',
        allow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
} 