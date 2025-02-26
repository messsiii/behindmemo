#!/usr/bin/env node

/**
 * 安全的数据库迁移脚本
 * 
 * 此脚本用于安全地执行数据库迁移，防止意外重置生产数据库
 * 使用方法：
 * - 开发环境：node scripts/safe-migrate.js dev
 * - 生产环境：node scripts/safe-migrate.js deploy
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 检查环境变量
const checkEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('错误: .env 文件不存在');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrl = envContent.match(/DATABASE_URL=["'](.+)["']/);
  
  if (!dbUrl) {
    console.error('错误: 在 .env 文件中找不到 DATABASE_URL');
    process.exit(1);
  }

  // 检查是否是生产数据库
  const isProd = dbUrl[1].includes('neon.tech') || 
                 dbUrl[1].includes('amazonaws.com') || 
                 process.env.NODE_ENV === 'production';
  
  return { isProd, dbUrl: dbUrl[1] };
};

// 执行迁移命令
const executeMigration = (command) => {
  try {
    console.log(`执行命令: ${command}`);
    execSync(command, { stdio: 'inherit' });
    console.log('迁移成功完成');
  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  }
};

// 主函数
const main = async () => {
  const args = process.argv.slice(2);
  const mode = args[0] || 'dev';
  const migrationName = args[1] || 'migration';
  
  const { isProd, dbUrl } = checkEnv();
  
  // 显示数据库信息
  console.log('数据库 URL:', dbUrl.replace(/:[^:]*@/, ':****@'));
  console.log('环境:', isProd ? '生产环境' : '开发环境');
  
  if (isProd && mode === 'dev') {
    console.error('\n警告: 您正在尝试对生产数据库执行开发迁移!');
    console.error('这可能会导致数据丢失!\n');
    
    const answer = await new Promise(resolve => {
      rl.question('您确定要继续吗? 输入 "我确认这是生产环境" 以继续: ', resolve);
    });
    
    if (answer !== '我确认这是生产环境') {
      console.log('操作已取消');
      process.exit(0);
    }
    
    console.log('\n您已确认在生产环境执行迁移。继续操作...\n');
  }
  
  // 根据模式执行不同的命令
  switch (mode) {
    case 'dev':
      // 开发模式 - 创建迁移但不应用
      executeMigration(`npx prisma migrate dev --name ${migrationName} --create-only`);
      
      console.log('\n迁移文件已创建，但尚未应用。');
      console.log('请检查迁移文件，确保它不会删除或修改重要数据。');
      
      const applyAnswer = await new Promise(resolve => {
        rl.question('是否应用此迁移? (y/n): ', resolve);
      });
      
      if (applyAnswer.toLowerCase() === 'y') {
        executeMigration('npx prisma migrate dev');
      } else {
        console.log('迁移未应用');
      }
      break;
      
    case 'deploy':
      // 部署模式 - 安全地应用迁移
      console.log('在生产环境中应用迁移...');
      executeMigration('npx prisma migrate deploy');
      break;
      
    case 'push':
      // 推送模式 - 直接推送架构更改，不跟踪迁移历史
      console.log('警告: 此操作将直接推送架构更改，不跟踪迁移历史');
      const pushAnswer = await new Promise(resolve => {
        rl.question('是否继续? (y/n): ', resolve);
      });
      
      if (pushAnswer.toLowerCase() === 'y') {
        executeMigration('npx prisma db push');
      } else {
        console.log('操作已取消');
      }
      break;
      
    default:
      console.error(`未知模式: ${mode}`);
      console.log('可用模式: dev, deploy, push');
      process.exit(1);
  }
  
  rl.close();
};

main().catch(error => {
  console.error('错误:', error);
  process.exit(1);
}); 