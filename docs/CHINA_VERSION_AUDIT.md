# Behind Memory 中国版审计报告

## 执行摘要

当前中国版（behindmemory.cn）已基本实现与国际版的功能隔离，但仍有多项优化空间以确保完全顺畅访问。

## 🟢 已完成的隔离措施

### 1. 基础设施隔离
- ✅ **独立域名**：behindmemory.cn（已备案）
- ✅ **独立服务器**：腾讯云轻量服务器（49.233.89.22）
- ✅ **独立存储**：腾讯云COS（北京区域）
- ✅ **独立部署**：Docker容器化，与Vercel完全独立

### 2. 功能隔离
- ✅ **认证方式**：中国站隐藏Google OAuth，仅保留邮箱登录
- ✅ **IP检测**：自动识别中国用户并提示切换
- ✅ **环境变量**：通过STORAGE_PROVIDER区分存储服务

### 3. 用户体验
- ✅ **SSL证书**：已配置Let's Encrypt证书
- ✅ **登录跳转**：修复为跳转到首页而非写作页
- ✅ **功能开关**：通过featureFlags控制AI图片工具显示

---

## 🔴 需要改进的问题

### 1. 外部依赖问题

#### Google字体（严重影响加载速度）
**位置**：`app/layout.tsx:90-93`
```typescript
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond..."
  rel="stylesheet"
/>
```
**影响**：国内无法访问Google字体服务器，导致页面加载缓慢
**解决方案**：
- 方案A：使用国内CDN（如字体库fonts.net.cn）
- 方案B：将字体文件本地化
- 方案C：根据域名条件加载不同字体源

#### Vercel Analytics
**位置**：`app/layout.tsx:100`
```typescript
<Analytics />
```
**影响**：向Vercel服务器发送数据，可能被防火墙阻断
**解决方案**：中国站应禁用Vercel Analytics

#### Google Analytics
**位置**：`app/layout.tsx:101`
```typescript
<GoogleAnalytics />
```
**影响**：国内无法访问Google Analytics
**解决方案**：
- 替换为百度统计或友盟
- 或根据域名条件加载

### 2. 数据隔离问题

#### 共享数据库
**现状**：两个站点使用同一个Neon数据库
```
DATABASE_URL=postgres://neondb_owner...@ep-curly-sky-a4d0wc4n...neon.tech
```
**风险**：
- 数据合规性问题
- 性能问题（跨境访问延迟）
- 用户数据未隔离

**建议方案**：
1. **短期**：为中国站创建独立数据库schema
2. **长期**：迁移到腾讯云数据库（MySQL/PostgreSQL）

### 3. 硬编码的外部链接

#### Metadata中的URL
**位置**：多处硬编码behindmemo.com
- `app/layout.tsx:28,40,44,57`
- OpenGraph和Twitter卡片URL

**解决方案**：
```typescript
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://behindmemory.cn'
```

### 4. 第三方服务

#### Google Maps API
**现状**：仍在使用Google Maps
**影响**：国内无法访问
**解决方案**：
- 替换为高德地图或百度地图
- 或根据域名条件加载不同地图服务

#### Google Translate API
**现状**：使用Google翻译
**影响**：国内访问不稳定
**解决方案**：替换为百度翻译或有道翻译

---

## 🟡 性能优化建议

### 1. CDN配置
- **现状**：直接从服务器提供静态资源
- **建议**：配置腾讯云CDN加速静态资源

### 2. 图片优化
- **现状**：图片从腾讯云COS直接加载
- **建议**：
  - 启用COS图片处理功能
  - 配置CDN缓存
  - 实现图片懒加载

### 3. 数据库优化
- **现状**：跨境访问美国数据库
- **建议**：
  - 迁移到国内数据库
  - 实现读写分离
  - 添加Redis缓存层

---

## 📋 待实施清单

### 紧急（影响正常访问）
1. [ ] 替换Google字体为本地字体或国内CDN
2. [ ] 禁用中国站的Vercel Analytics
3. [ ] 禁用或替换Google Analytics
4. [ ] 修复metadata中的硬编码URL

### 重要（影响性能和合规）
5. [ ] 创建独立数据库或schema
6. [ ] 替换Google Maps为国内地图服务
7. [ ] 替换Google Translate为国内翻译服务
8. [ ] 配置腾讯云CDN

### 优化（提升体验）
9. [ ] 实现图片CDN和处理
10. [ ] 添加Redis缓存
11. [ ] 优化Docker镜像大小
12. [ ] 配置监控和日志系统

---

## 🔧 具体实施代码

### 1. 条件加载Google字体

```typescript
// app/layout.tsx
const isChinaSite = process.env.NEXT_PUBLIC_APP_URL?.includes('behindmemory.cn')

{!isChinaSite && (
  <link
    href="https://fonts.googleapis.com/css2?..."
    rel="stylesheet"
  />
)}
```

### 2. 条件加载Analytics

```typescript
// app/layout.tsx
{!isChinaSite && <Analytics />}
{!isChinaSite && <GoogleAnalytics />}
{isChinaSite && <BaiduAnalytics />} // 如果使用百度统计
```

### 3. 环境变量区分

创建 `.env.production.china`：
```env
# 中国站专用配置
NEXT_PUBLIC_IS_CHINA_SITE=true
NEXT_PUBLIC_MAP_PROVIDER=amap  # 高德地图
NEXT_PUBLIC_TRANSLATE_PROVIDER=baidu  # 百度翻译
NEXT_PUBLIC_ANALYTICS_PROVIDER=baidu  # 百度统计
```

### 4. 数据库隔离方案

```typescript
// prisma/schema.prisma
// 为中国站用户添加标识
model User {
  // ...existing fields
  region String @default("global") // "china" | "global"
}
```

### 5. 创建服务适配器

```typescript
// lib/services/maps.ts
export function getMapService() {
  const isChinaSite = process.env.NEXT_PUBLIC_IS_CHINA_SITE === 'true'

  if (isChinaSite) {
    return new AMapService() // 高德地图
  } else {
    return new GoogleMapsService()
  }
}

// lib/services/translate.ts
export function getTranslateService() {
  const isChinaSite = process.env.NEXT_PUBLIC_IS_CHINA_SITE === 'true'

  if (isChinaSite) {
    return new BaiduTranslate()
  } else {
    return new GoogleTranslate()
  }
}
```

---

## 📊 测试清单

### 功能测试
- [ ] 邮箱注册/登录
- [ ] 图片上传到腾讯云COS
- [ ] AI生成信件
- [ ] 查看历史记录
- [ ] 分享功能

### 性能测试
- [ ] 首页加载时间 < 3秒
- [ ] 图片上传响应时间
- [ ] AI生成响应时间
- [ ] 数据库查询性能

### 兼容性测试
- [ ] 微信内置浏览器
- [ ] 支付宝浏览器
- [ ] 主流国产浏览器（UC、QQ浏览器等）

---

## 🎯 优先级排序

### P0 - 立即修复（影响基本可用性）
1. Google字体加载问题
2. Vercel Analytics阻断

### P1 - 本周内完成
3. 数据库隔离方案
4. Google服务替换

### P2 - 计划中
5. CDN配置
6. 性能优化
7. 监控系统

---

## 📈 预期效果

完成以上优化后：
- **加载速度**：首页加载时间从5-10秒降至2-3秒
- **可用性**：100%功能在国内正常使用
- **合规性**：数据完全本地化，符合监管要求
- **用户体验**：与国际版相当的流畅体验

---

## 🚀 下一步行动

1. **立即**：修复Google字体和Analytics问题
2. **本周**：实施数据库隔离方案
3. **下周**：完成第三方服务替换
4. **月内**：上线CDN和性能优化

---

**更新时间**：2025-10-07
**状态**：待实施