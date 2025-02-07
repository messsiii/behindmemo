/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      't4mdjhb22te74ulq.public.blob.vercel-storage.com', // 替换为你的 Vercel Blob 域名
    ],
  },
  webpack: (config, { isServer }) => {
    // 自定义 webpack 配置
    return config
  },
  experimental: {
    appDir: true,
  }
}

module.exports = nextConfig 