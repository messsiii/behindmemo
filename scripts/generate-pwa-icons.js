const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// SVG 内容 - 使用更华丽的字体和更大的文字
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- 米白色背景带细微纹理 -->
  <defs>
    <!-- 添加细微的渐变背景 -->
    <radialGradient id="bgGradient">
      <stop offset="0%" style="stop-color:#FEFCF8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FAF6F0;stop-opacity:1" />
    </radialGradient>
    
    <!-- 文字渐变色 - 更丰富的蓝色渐变 -->
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60A5FA;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563EB;stop-opacity:1" />
    </linearGradient>
    
    <!-- 更精致的阴影效果 -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
      <feOffset dx="2" dy="4" result="offsetblur"/>
      <feFlood flood-color="#1E40AF" flood-opacity="0.15"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="512" height="512" fill="url(#bgGradient)"/>
  
  <!-- Behind 文字 - 使用装饰性字体风格 -->
  <g>
    <!-- 主文字 -->
    <text x="256" y="280" 
          font-family="'Playfair Display', 'Didot', 'Bodoni MT', Georgia, serif" 
          font-size="136" 
          font-weight="700" 
          font-style="italic" 
          fill="url(#textGradient)" 
          text-anchor="middle" 
          dominant-baseline="middle" 
          filter="url(#shadow)" 
          letter-spacing="-5">Behind</text>
    
    <!-- 装饰性下划线 -->
    <path d="M 120 320 Q 256 340 392 320" 
          stroke="url(#textGradient)" 
          stroke-width="3" 
          fill="none" 
          opacity="0.6"/>
  </g>
</svg>`;

// 生成可遮罩图标的 SVG（添加安全区域）
const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <!-- 背景渐变 -->
    <radialGradient id="bgGradient2">
      <stop offset="0%" style="stop-color:#FEFCF8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FAF6F0;stop-opacity:1" />
    </radialGradient>
    
    <!-- 文字渐变 -->
    <linearGradient id="textGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60A5FA;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563EB;stop-opacity:1" />
    </linearGradient>
    
    <!-- 阴影效果 -->
    <filter id="shadow2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="1" dy="2" result="offsetblur"/>
      <feFlood flood-color="#1E40AF" flood-opacity="0.12"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="512" height="512" fill="url(#bgGradient2)"/>
  
  <!-- 内部安全区域（80%大小）的文字 -->
  <g>
    <text x="256" y="270" 
          font-family="'Playfair Display', 'Didot', 'Bodoni MT', Georgia, serif" 
          font-size="108" 
          font-weight="700" 
          font-style="italic" 
          fill="url(#textGradient2)" 
          text-anchor="middle" 
          dominant-baseline="middle" 
          filter="url(#shadow2)" 
          letter-spacing="-4">Behind</text>
    
    <!-- 装饰性下划线 -->
    <path d="M 140 300 Q 256 315 372 300" 
          stroke="url(#textGradient2)" 
          stroke-width="2.5" 
          fill="none" 
          opacity="0.5"/>
  </g>
</svg>`;

async function generateIcons() {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    
    // 生成标准图标
    await sharp(Buffer.from(svgContent))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    
    await sharp(Buffer.from(svgContent))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));
    
    // 生成可遮罩图标（为各种形状留出更多空间）
    await sharp(Buffer.from(maskableSvgContent))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-maskable-192x192.png'));
    
    await sharp(Buffer.from(maskableSvgContent))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-maskable-512x512.png'));
    
    console.log('✓ PWA icons generated successfully!');
    console.log('  - icon-192x192.png');
    console.log('  - icon-512x512.png');
    console.log('  - icon-maskable-192x192.png');
    console.log('  - icon-maskable-512x512.png');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();