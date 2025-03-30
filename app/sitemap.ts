import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://behindmemory.com';

  // 博客文章列表 - 可以扩展
  const blogPosts = [
    {
      url: '/blog/how-to-write-heartfelt-letter-even-not-writer',
      lastModified: new Date('2023-03-15'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: '/blog/share-your-heart-before-its-too-late',
      lastModified: new Date('2023-03-15'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // 为SEO添加更多博客文章条目
  ];

  // 主要页面
  const mainPages = [
    {
      url: '/',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: '/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: '/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: '/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: '/terms',
      lastModified: new Date('2023-02-07'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: '/privacy',
      lastModified: new Date('2023-02-07'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },

  ];

  // 确保所有URL都是完整的绝对URL
  const routes = mainPages.map(page => ({
    url: `${baseUrl}${page.url}`,
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency as 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never',
    priority: page.priority,
  }));

  // 添加博客文章
  blogPosts.forEach(post => {
    routes.push({
      url: `${baseUrl}${post.url}`,
      lastModified: post.lastModified,
      changeFrequency: post.changeFrequency as 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never',
      priority: post.priority,
    });
  });


  return routes;
} 