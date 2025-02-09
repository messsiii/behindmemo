/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    turbo: {
      rules: {
        '*.mdx': ['mdx-loader'],
      },
    },
  },
  webpack: (config, { isServer }) => {
    // 自定义 webpack 配置
    return config
  },
}

module.exports = nextConfig
