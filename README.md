# Behind Memo - AI 情书生成器

一个基于 AI 的应用，帮助你表达内心情感，生成个性化的情书。支持中英双语，让每一字都充满意义。

## 功能特点

- 📝 AI 驱动的情书生成
- 🌏 中英双语支持
- 📸 照片上传与优化
- 📍 位置信息提取
- 🎨 优雅的响应式界面
- ✨ 流畅的动画效果
- 🚀 Vercel 流体计算支持

## 性能优化

项目使用 Vercel Fluid Compute 进行部署：
- ⚡️ 自动优化函数冷启动时间
- 🔄 智能并发处理
- 🌍 全球化故障转移
- 🖥️ Node.js 20.x 运行时
- 📊 后台任务处理

## 页面结构

- `/` - 主页：优雅的项目介绍
- `/write` - 写作页面：AI 情书生成器
- `/about` - 关于我们
- `/pricing` - 定价方案
- `/terms` - 使用条款
- `/privacy` - 隐私政策

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- MiniMax AI API
- Google Maps Geocoding API
- Vercel Blob Storage

## 开始使用

1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/behindmemo.git
   ```

2. 复制环境变量文件
   ```bash
   cp .env.example .env
   ```

3. 安装依赖
   ```bash
   npm install
   ```

4. 启动开发服务器
   ```bash
   npm run dev
   ```

## 环境变量

- `BLOB_READ_WRITE_TOKEN`: Vercel Blob 存储令牌
- `MINIMAX_API_KEY`: MiniMax API 密钥
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`: Google Maps API 密钥

## 部署

项目配置为使用 Vercel 自动部署：
1. 推送到 main 分支会自动触发部署
2. 环境变量需要在 Vercel 项目设置中配置
3. 生产环境构建会自动优化性能

## 开发规范

- 使用 ESLint 进行代码规范检查
- 遵循 TypeScript 类型定义
- 组件使用 shadcn/ui 风格
- 样式采用 Tailwind CSS 实现

## 贡献

欢迎提交 Pull Request 或提出 Issue。在提交代码前，请确保：

1. 代码通过 ESLint 检查
2. TypeScript 类型完整
3. 提供必要的测试
4. 更新相关文档

## 许可

MIT License