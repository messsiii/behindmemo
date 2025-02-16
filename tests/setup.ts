import { config } from 'dotenv'

// 加载环境变量
config()

// 设置测试超时时间
jest.setTimeout(60000) // 60 秒

// 全局变量
global.console = {
  ...console,
  // 在测试中禁用某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} 