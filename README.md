# Behind Memo - AI 情书生成器

一个基于 AI 的应用，帮助你表达内心情感，生成个性化的情书。支持中英双语，让每一字都充满意义。

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

## 数据库模型

### User 用户模型

```typescript
{
  id: string            // 用户唯一标识符
  name: string?        // 用户名称
  email: string?       // 邮箱地址（唯一）
  emailVerified: Date? // 邮箱验证时间
  image: string?       // 用户头像 URL
  quota: number        // 剩余使用次数（默认10次）
  accounts: Account[]  // 关联的第三方账号
  sessions: Session[]  // 用户会话记录
  letters: Letter[]    // 用户生成的情书
}
```

### Letter 情书模型

```typescript
{
  id: string // 情书唯一标识符
  createdAt: Date // 创建时间
  content: string // 情书内容
  imageUrl: string // 关联图片 URL
    ? userId
    : string // 创建用户的 ID
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

## 性能优化

- ⚡️ Turbopack 加速开发
- 🖼️ 自动图片优化
- 🔄 流式响应处理
- 🌍 全球化部署支持
- 🔒 增强的安全特性

## 页面结构

- `/` - 主页：优雅的项目介绍
- `/write` - 写作页面：AI 情书生成器
- `/about` - 关于我们
- `/pricing` - 定价方案
- `/terms` - 使用条款
- `/privacy` - 隐私政策

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
