# Behind Memory - AI Love Letter Generator

Behind Memory 是一个基于 AI 的情书生成器，帮助用户通过照片和故事创作个性化的情书。

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **样式**: Tailwind CSS + Shadcn/ui
- **数据库**: PostgreSQL (Neon)
- **缓存**: Upstash Redis
- **认证**: NextAuth.js
- **AI**: MiniMax / Gemini / GPT-4
- **存储**: Cloudflare R2 (图片、音频、媒体文件)
- **部署**: Vercel

## 核心功能

- 📸 照片上传与分析
  - EXIF 数据提取（拍摄时间、地理位置）
  - 智能照片分析和场景理解
  - 自动图片优化和压缩
- ✍️ AI 辅助情书生成
  - 基于照片场景的情感分析
  - 多轮对话式写作指导
  - 个性化文风调整
- 🎨 精美的信件展示
  - 响应式布局设计
  - 照片信件一体化展示
  - 支持导出高清图片
- 🌏 多语言支持 (中/英)
  - 界面完整双语支持
  - AI 生成内容双语切换
  - 地理信息本地化显示
- 👤 用户认证与授权
  - Google OAuth 登录
  - 邮箱验证登录
  - 用户数据安全存储
- 💫 积分系统
  - 新用户注册奖励
  - 使用次数限制
  - 会员特权管理

## 最新功能

- 🔄 信件复用功能
  - 支持复用当前信件信息
  - 智能预填写表单
  - 优化写作流程
- 📍 地理信息增强
  - 智能提取照片地理信息
  - 多语言地址显示
  - 地理场景融入生成
- 🎯 拍摄时间优化
  - 准确提取原始拍摄时间
  - 时间信息智能融入内容
  - 避免时间信息缺失
- 🖼️ 导出功能优化
  - 支持高清图片导出
  - 自定义导出样式
  - 图文布局优化
- 🌐 AI图片生成翻译功能
  - 自动检测输入提示词语言
  - 非英语自动翻译为英语
  - 优化图片生成效果
  - 支持多语言智能识别
  - 翻译状态实时显示

## 积分系统

- 新用户注册获得 30 点初始点数
- 每次生成消耗 10 点
- VIP 用户同样需要消耗点数
- 可通过订阅或购买点数包获取更多点数

## 数据模型

### User 用户模型

```typescript
{
  id: string            // 用户唯一标识符
  name: string?        // 用户名称
  email: string?       // 邮箱地址（唯一）
  emailVerified: Date? // 邮箱验证时间
  image: string?       // 用户头像 URL
  totalUsage: number   // 总使用次数
  lastLoginAt: Date    // 最后登录时间
  createdAt: Date      // 创建时间
  updatedAt: Date      // 更新时间
  isVIP: boolean       // 是否是 VIP
  vipExpiresAt: Date?  // VIP 过期时间
  credits: number      // 剩余点数
  paddleCustomerId: string?       // Paddle客户ID
  paddleSubscriptionId: string?   // Paddle订阅ID
  paddleSubscriptionStatus: string? // 订阅状态
  accounts: Account[]  // 关联的第三方账号
  sessions: Session[]  // 用户会话记录
  letters: Letter[]    // 用户生成的信件
  subscriptions: Subscription[] // 订阅记录
  transactions: Transaction[]   // 交易记录
  templateUnlocks: TemplateUnlock[] // 模板解锁记录
}
```

### Letter 信件模型

```typescript
{
  id: string          // 信件唯一标识符
  createdAt: Date     // 创建时间
  updatedAt: Date     // 更新时间
  content: string     // 信件内容
  imageUrl: string?   // 关联图片 URL
  userId: string      // 创建用户的 ID
  prompt: string      // 用于生成的提示词
  isPublic: boolean   // 是否公开
  likeCount: number   // 点赞数
  shareCount: number  // 分享数
  language: string    // 生成语言(zh/en)
  status: string      // 生成状态(pending/generating/completed/failed)
  error: string?      // 错误信息
  metadata: {         // 元数据
    name: string      // 写信人名字
    loverName: string // 收信人名字
    story: string     // 故事背景
    location: string? // 地理位置
    time: string?     // 拍摄时间
    orientation: number? // 图片方向
  }
}
```

### Subscription 订阅模型

```typescript
{
  id: string               // 订阅唯一标识符
  userId: string           // 关联的用户 ID
  paddleSubscriptionId: string // Paddle订阅ID
  status: string          // 订阅状态
  planType: string        // 计划类型
  priceId: string         // 价格ID
  startedAt: Date         // 开始时间
  nextBillingAt: Date?    // 下次计费时间
  canceledAt: Date?       // 取消时间
  endedAt: Date?          // 结束时间
  createdAt: Date         // 创建时间
  updatedAt: Date         // 更新时间
  metadata: object?       // 元数据
}
```

### Transaction 交易模型

```typescript
{
  id: string               // 交易唯一标识符
  createdAt: Date          // 创建时间
  updatedAt: Date          // 更新时间
  userId: string           // 关联的用户 ID
  amount: number           // 交易金额
  currency: string         // 货币 (默认USD)
  status: string           // 交易状态
  type: string             // 交易类型
  paddleOrderId: string?   // Paddle订单ID
  paddleSubscriptionId: string? // Paddle订阅ID
  pointsAdded: number?     // 添加的点数
}
```

### TemplateUnlock 模板解锁模型

```typescript
{
  id: string // 唯一标识符
  userId: string // 关联的用户 ID
  letterId: string // 关联的信件 ID
  templateId: string // 模板ID
  createdAt: Date // 创建时间
  updatedAt: Date // 更新时间
}
```

### Account 账号模型（OAuth）

```typescript
{
  id: string               // 账号唯一标识符
  userId: string           // 关联的用户 ID
  type: string            // 账号类型
  provider: string        // 提供商（如 Google）
  providerAccountId: string // 提供商的账号 ID
  refresh_token: string?   // 刷新令牌
  access_token: string?    // 访问令牌
  expires_at: number?      // 令牌过期时间
  token_type: string?     // 令牌类型
  scope: string?          // 权限范围
  id_token: string?       // ID 令牌
  session_state: string?  // 会话状态
}
```

### Session 会话模型

```typescript
{
  id: string // 会话唯一标识符
  sessionToken: string // 会话令牌（唯一）
  userId: string // 关联的用户 ID
  expires: Date // 过期时间
}
```

### VerificationToken 验证令牌模型

```typescript
{
  identifier: string // 标识符
  token: string // 验证令牌（唯一）
  expires: Date // 过期时间
}
```

### WebhookEvent Webhook事件模型

```typescript
{
  id: string // 唯一标识符
  paddleEventId: string // Paddle事件ID
  eventType: string // 事件类型
  eventData: object // 事件数据
  processedAt: Date // 处理时间
    ? status
    : string // 状态
  error: string // 错误信息
    ? createdAt
    : Date // 创建时间
}
```

### Price 价格模型

```typescript
{
  id: string          // 价格ID
  type: string        // 类型
  name: string        // 名称
  description: string? // 描述
  unitAmount: string   // 单价金额
  currency: string     // 货币
  interval: string?    // 周期
  creditAmount: number? // 点数数量
  isActive: boolean    // 是否激活
  createdAt: Date      // 创建时间
  updatedAt: Date      // 更新时间
  metadata: object?    // 元数据
}
```

### AnonymousRequest 匿名请求模型

```typescript
{
  id: string         // 唯一标识符
  ipAddress: string  // IP地址
  requestType: string // 请求类型
  createdAt: Date    // 创建时间
  metadata: object?  // 元数据
}
```

## 环境变量

```env
# 数据库
DATABASE_URL=
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_URL_NO_SSL=

# 认证
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 存储
BLOB_READ_WRITE_TOKEN=

# 缓存
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# AI
MINIMAX_API_KEY=

# 地图服务
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# 翻译服务
GOOGLE_TRANSLATE_API_KEY=

# Paddle支付
PADDLE_WEBHOOK_SECRET=
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID=
NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID=
NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID=
NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID=
NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID=
```

## 开发指南

1. 克隆项目

```bash
git clone https://github.com/messsiii/behindmemo.git
cd behindmemo
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 填入必要的环境变量
```

4. 运行开发服务器

```bash
npm run dev
```

5. 开发注意事项

- 使用 `npm run lint` 检查代码规范
- 使用 `npm run test` 运行测试
- 使用 `npm run build` 构建生产版本
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交代码

## 部署

项目配置为使用 Vercel 进行部署：

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
   - 数据库连接信息
   - 认证相关密钥
   - AI API 密钥
   - 存储服务配置
   - 缓存服务配置
4. 部署项目
5. 配置域名（可选）

## 性能优化

- ⚡️ 使用 Turbopack 加速开发
- 🖼️ 自动图片优化
  - WebP 格式转换
  - 响应式图片加载
  - 懒加载优化
- 🔄 流式响应处理
  - AI 生成流式返回
  - 实时进度展示
- 🌍 全球化部署支持
  - 多区域部署
  - CDN 加速
- 🔒 安全特性
  - CSRF 防护
  - XSS 防护
  - 请求限流
  - 数据加密

## 待优化项

### 1. 性能优化

1. 流式生成优化

   - 实现 SSE (Server-Sent Events)
   - 分块返回生成的内容
   - 前端实时显示生成进度
   - 优化超时处理机制

2. 数据库性能优化

   - 减少不必要的数据库查询
   - 优化 Prisma 查询性能
   - 使用缓存减少重复操作
   - 实现数据库连接池

3. API 性能优化
   - 实现请求队列
   - 添加请求限流
   - 优化错误处理
   - 实现断点续传

### 2. 架构优化

1. 服务器限制适配

   - 适配 Vercel Hobby 计划限制
   - 实现任务队列处理
   - 添加任务状态管理
   - 实现失败重试机制

2. 可扩展性优化
   - 实现微服务架构
   - 添加负载均衡
   - 优化资源利用
   - 实现服务降级

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'feat: add some feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

[MIT License](LICENSE)

## 功能特点

- 📝 AI 驱动的情书生成
- 🌏 中英双语支持
- 📸 照片上传与优化
- 🔐 Google OAuth 登录
- 📊 用户配额管理
- 📍 位置信息提取
- 🎨 优雅的响应式界面
- ✨ 流畅的动画效果
- 🚀 Turbopack 支持

## 页面结构

### 主页 (app/page.tsx)

- 响应式英雄区设计
- 特性展示区
- 动态导航栏
- 多语言切换
- 登录状态管理

### 写作页面 (app/write/page.tsx)

- 照片上传组件
- 表单验证
- 实时预览
- 进度展示
- 错误处理

### 结果页面 (app/result/page.tsx)

- 信件展示
- 导出功能
- 分享功能
- 复用选项
- 返回首页

### 历史记录 (app/history/page.tsx)

- 信件列表
- 分页功能
- 筛选功能
- 删除功能
- 编辑功能

## 联系我们

- 官方网站：[behindmemory.com](https://behindmemory.com)
- 邮箱：support@behindmemory.com
- Twitter：[@behindmemory](https://twitter.com/behindmemory)
- GitHub：[messsiii/behindmemo](https://github.com/messsiii/behindmemo)

## 技术栈

- Next.js 15.1.6
- React 19
- TypeScript 5
- Tailwind CSS
- Prisma ORM
- NextAuth.js
- Framer Motion
- MiniMax AI API
- Google OAuth 2.0
- Vercel Blob Storage
- Neon Serverless Postgres

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
- `GOOGLE_CLIENT_ID`: Google OAuth 客户端 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 客户端密钥
- `AUTH_SECRET`: NextAuth.js 密钥
- `DATABASE_URL`: Neon PostgreSQL 数据库连接 URL
- `DIRECT_URL`: Neon PostgreSQL 直连 URL（不经过连接池）

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
- 使用 Turbopack 加速开发

## 系统要求

- Node.js >= 18.17
- npm >= 9.0.0

## 贡献

欢迎提交 Pull Request 或提出 Issue。在提交代码前，请确保：

1. 代码通过 ESLint 检查
2. TypeScript 类型完整
3. 提供必要的测试
4. 更新相关文档

## 许可

MIT License

## AI Love Letter Generator

基于 Next.js 和 MiniMax API 的 AI 情书生成器。

## 技术架构

### 1. 数据模型

```prisma
model Letter {
  id          String    @id @default(cuid())
  content     String    @db.Text
  imageUrl    String?
  userId      String
  prompt      String    @db.Text
  status      String    @default("pending")  // pending -> generating -> completed
  language    String    @default("zh")
  metadata    Json?     // 存储额外信息
  user        User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### 2. API 接口设计

#### 创建信件

- 路由: `POST /api/letters`
- 功能: 创建信件记录
- 参数:
  ```typescript
  {
    name: string
    loverName: string
    story: string
    imageUrl: string
    metadata?: object
  }
  ```
- 返回: `{ id: string }`

#### 生成内容

- 路由: `POST /api/letters/{id}/generate`
- 功能: 调用 AI 生成信件内容
- 返回: `{ letter: Letter }`

#### 获取信件

- 路由: `GET /api/letters/{id}`
- 功能: 获取信件详情
- 返回: `{ letter: Letter }`

### 3. 业务流程

1. 写信页面 (`/write`)

   - 表单收集用户输入
   - 上传图片获取 URL
   - 创建信件记录
   - 跳转到结果页面

2. 结果页面 (`/result/[id]`)
   - 获取信件详情
   - 如果状态是 pending，自动开始生成
   - 实时显示生成状态
   - 完成后展示内容和操作按钮

### 4. 组件结构

```
app/
├── components/
│   ├── WritingForm.tsx      # 写信表单组件
│   └── ResultsPage.tsx      # 结果页面组件
├── write/
│   └── page.tsx             # 写信页面
└── result/
    └── [id]/
        └── page.tsx         # 结果页面
```

### 5. 状态管理

1. 信件状态

   - `pending`: 初始状态，等待生成
   - `generating`: 正在生成内容
   - `completed`: 生成完成

2. 页面状态
   - 加载状态
   - 错误状态
   - 图片加载状态

### 6. 错误处理

1. API 错误

   - 401: 未授权
   - 404: 信件不存在
   - 403: 无权访问
   - 500: 服务器错误

2. 用户反馈
   - 加载指示器
   - 错误提示
   - 状态更新提示

### 7. 性能优化

1. 图片处理

   - 使用 Next.js Image 组件
   - 图片懒加载
   - 渐进式加载效果

2. 状态缓存
   - 使用 localStorage 存储临时状态
   - API 响应缓存

### 8. 安全考虑

1. 权限验证

   - 用户认证
   - 资源访问控制
   - API 请求验证

2. 数据验证
   - 输入验证
   - 文件上传限制
   - API 参数验证

## 开发规范

1. 组件规范

   - 使用 TypeScript 类型定义
   - 遵循 React Hooks 规范
   - 组件职责单一

2. API 规范

   - RESTful 设计
   - 统一错误处理
   - 请求参数验证

3. 代码风格
   - ESLint + Prettier
   - 统一的命名规范
   - 清晰的代码注释

## 自动化工具与方法

### 自动化错误修复

1. 构建错误自动修复

   - 使用 `next lint --fix` 自动修复 ESLint 错误
   - 使用 `prettier --write .` 自动格式化代码
   - 使用 `tsc --noEmit` 检查类型错误
   - 组合命令：
     ```bash
     npm run lint:fix && npm run format && npm run typecheck
     ```

2. 未使用导入自动清理

   - 使用 `eslint-plugin-unused-imports` 的自动修复功能
   - 配置 VS Code 自动保存时执行:
     ```json
     {
       "editor.codeActionsOnSave": {
         "source.removeUnusedImports": true,
         "source.fixAll.eslint": true
       }
     }
     ```

3. 批量修复脚本

   ```json
   {
     "scripts": {
       "fix:all": "npm run lint:fix && npm run format && npm run typecheck",
       "fix:imports": "eslint --fix --rule 'unused-imports/no-unused-imports: error'",
       "fix:style": "prettier --write . && eslint --fix",
       "fix:types": "tsc --noEmit"
     }
   }
   ```

4. 自动修复工作流

   - 保存时自动修复
   - 提交前自动修复
   - 构建前自动修复
   - 定期批量修复

5. VS Code 集成
   - 安装 ESLint 插件
   - 安装 Prettier 插件
   - 配置自动保存时修复
   - 快捷键绑定修复命令

## 添加新模板要领总结

添加新模板需要在四个关键位置进行修改，确保模板在各个环境下都能正确显示。以下是完整的步骤和要点：

#### 1. 在 ResultsPage.tsx 定义模板

在 `TEMPLATES` 常量中添加新模板的定义：

```typescript
const TEMPLATES = {
  // 现有模板...
  // 当前已有模板包括: classic, postcard, magazine, artisan, natural, darkWine,
  // paperMemo, oceanBreeze, darkCrimson, purpleDream, elegantPaper, roseParchment

  myNewTemplate: {
    name: '模板名称',
    style: {
      width: 1200, // 推荐宽度1173-1200px
      padding: 60, // 内边距大小影响内容区域
      background: 'url(/images/my-bg.jpg) no-repeat center center / cover', // 背景可使用图片或渐变色
      titleFont: '"Source Serif Pro", serif', // 标题字体
      contentFont: '"Source Serif Pro", serif', // 内容字体
    },
    isFree: false, // 是否为免费模板，true表示免费，false表示需要VIP或解锁
  },
}
```

#### 2. 实现模板HTML生成逻辑

在 `generateTemplateHtml` 函数中添加模板的HTML结构：

```typescript
case 'myNewTemplate':
  return `
    <div style="
      width: ${style.width}px;
      min-height: ${style.width * 0.75}px;
      padding: ${style.padding}px;
      background: ${style.background};
      position: relative;
      font-family: ${fontFamily};
      color: #颜色代码;           // 根据背景选择合适的文字颜色
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      border-radius: 12px;
      overflow: hidden;
    ">
      ${/* 图片区域 */}
      ${letter.imageUrl ? `
        <div style="
          margin: 20px 0 40px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        ">
          <img
            src="${letter.imageUrl}"
            style="
              width: 100%;
              height: auto;
              display: block;
            "
            crossorigin="anonymous"
          />
        </div>
      ` : ''}

      ${/* 文字区域 */}
      <div style="
        font-size: 22px;
        line-height: 1.8;
        color: #颜色代码;
        text-align: justify;
        padding: 30px;
        background: rgba(255,255,255,0.9);  // 根据设计调整背景色和透明度
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      ">
        ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
      </div>

      ${/* 水印区域 - 根据背景色选择 */}
      <div style="
        margin-top: 30px;
        text-align: center;
        font-size: 16px;
        color: #颜色代码;        // 水印文字颜色
        font-style: italic;
        height: 35px;
        display: flex;
        justify-content: center;
      ">
        ${getWatermarkHTML('light')}  // 浅色背景用light，深色背景用dark
      </div>
    </div>
  `;
```

#### 3. 在 StyleDrawer 添加模板预览

在 `StyleDrawer.tsx` 中修改多处代码以支持新模板的预览显示：

```typescript
// 1. 模板卡片背景 - 使用颜色渐变或背景图
key === 'myNewTemplate' && "overflow-hidden", // 使用背景图时设置overflow-hidden

// 2. 如果使用背景图，添加背景图层
{key === 'myNewTemplate' && (
  <>
    <div className="absolute inset-0 bg-cover bg-center"
         style={{ backgroundImage: 'url(/images/my-bg.jpg)' }}></div>
    <div className="absolute inset-0 bg-black/10"></div> // 添加轻微遮罩提高文字可见度
  </>
)}

// 3. 内容容器样式
key === 'myNewTemplate'
  ? "border-white/20" // 带背景图的模板使用简单边框
  : "border-black/10 bg-white/90"

// 4. 文字部分预览
// 根据模板特点决定是使用普通文本线条还是特殊布局
{key === 'myNewTemplate' ? (
  <div className="w-full h-full flex flex-col justify-center items-center relative">
    {/* 可以添加特殊边框或效果 */}
    <div className="absolute inset-2 border-2 border-[#颜色代码]/30 rounded-sm"></div>
    {/* 添加3-4行文本线条 */}
    <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#颜色代码]" />
    <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#颜色代码]" />
    <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#颜色代码]" />
  </div>
) : null}
```

#### 4. 更新结果页面渲染

确保 `ResultsPage.tsx` 中的实时预览部分也支持新模板：

```typescript
// 页面级背景适配
<div className={cn(
  "min-h-screen overflow-x-hidden",
  selectedTemplate === 'myNewTemplate'
    ? "bg-[url('/images/my-bg.jpg')] bg-cover bg-center bg-fixed"
    : // 其他模板的背景
)}>

// 信件容器适配
<div className={cn(
  "backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border transition-all duration-500",
  selectedTemplate === 'myNewTemplate'
    ? "bg-[#颜色代码]/80 border-[#颜色代码]/10"
    : "bg-white/90 border-black/5"
)}>
```

#### 5. 当前可用模板列表

目前系统已实现以下模板，可作为新模板开发的参考：

1. **classic**: Classic Dark - 深色经典模板，免费
2. **postcard**: Postcard - 明信片风格模板，免费
3. **magazine**: Magazine - 杂志风格模板，免费
4. **artisan**: Artisan Red - 红色工匠风格，需VIP
5. **natural**: Natural Parchment - 自然羊皮纸风格，需VIP
6. **darkWine**: Dark Wine - 深红酒色风格，需VIP
7. **paperMemo**: Paper Memoir - 纸质记忆风格，需VIP
8. **oceanBreeze**: Ocean Breeze - 海洋微风风格，需VIP
9. **darkCrimson**: Dark Crimson - 深红色风格，需VIP
10. **purpleDream**: Purple Dream - 紫色梦境风格，需VIP
11. **elegantPaper**: Elegant Paper - 优雅纸张风格，需VIP
12. **roseParchment**: Rose Parchment - 玫瑰羊皮纸风格，需VIP

#### 6. 注意事项和最佳实践

1. **水印选择**:

   - 浅色背景模板（如Postcard、Magazine）使用浅色水印（`watermark-light.svg`）
   - 深色背景模板（如Classic Dark、Dark Wine）使用深色水印（`watermark-dark.svg`）

2. **背景图片**:

   - 背景图尺寸建议为1200×1600px或更大，以适应不同屏幕
   - 优化图片文件大小，保持质量的同时减少加载时间
   - 图片放置于`/public/images/`目录下

3. **文字和图片区域**:

   - 文字区域应有足够的对比度，确保可读性
   - 为图片区域添加适当的阴影和圆角，提升视觉效果
   - 根据内容类型（情书、明信片等）调整布局和间距

4. **响应式考虑**:
   - 模板设计应考虑在移动设备上的显示效果
   - 字体大小和行高应适合长文本阅读
