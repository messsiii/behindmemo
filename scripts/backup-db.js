#!/usr/bin/env node

/**
 * 数据库备份脚本
 * 
 * 此脚本用于备份数据库数据
 * 使用方法：node scripts/backup-db.js
 * 
 * 注意：此脚本需要安装 pg-dump 工具
 * 对于 Neon 数据库，请参考其官方文档进行备份
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建备份目录
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// 获取当前日期时间作为文件名
const getBackupFileName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `backup-${year}${month}${day}-${hours}${minutes}.sql`;
};

// 从数据库URL解析连接信息
const parseDbUrl = (url) => {
  try {
    // 格式: postgresql://username:password@hostname:port/database
    const regex = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d*)\/(.+)(\?.*)?$/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error('无效的数据库URL格式');
    }
    
    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: match[4] || '5432',
      database: match[5].split('?')[0],
      params: match[6] || ''
    };
  } catch (error) {
    console.error('解析数据库URL失败:', error.message);
    process.exit(1);
  }
};

// 备份数据库
const backupDatabase = () => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('环境变量中未找到 DATABASE_URL');
    }
    
    const dbInfo = parseDbUrl(dbUrl);
    const backupFile = path.join(backupDir, getBackupFileName());
    
    // 设置环境变量以避免在命令行中暴露密码
    process.env.PGPASSWORD = dbInfo.password;
    
    // 执行pg_dump命令
    const command = `pg_dump -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.user} -d ${dbInfo.database} -F p -f "${backupFile}"`;
    
    console.log('开始备份数据库...');
    console.log(`数据库: ${dbInfo.database}`);
    console.log(`主机: ${dbInfo.host}`);
    console.log(`备份文件: ${backupFile}`);
    
    execSync(command);
    
    console.log('数据库备份成功完成!');
    console.log(`备份文件大小: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
    
    // 清除密码环境变量
    delete process.env.PGPASSWORD;
    
    return backupFile;
  } catch (error) {
    console.error('备份数据库失败:', error.message);
    process.exit(1);
  }
};

// 主函数
const main = () => {
  console.log('=== 数据库备份工具 ===');
  
  // 检查是否为Neon数据库
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('neon.tech')) {
    console.log('\n注意: 检测到Neon数据库');
    console.log('Neon提供自动备份功能，建议使用Neon控制台进行备份和恢复操作。');
    console.log('详情请参考: https://neon.tech/docs/manage/backups\n');
    
    console.log('如果您仍然希望使用此脚本进行备份，请确保已正确配置Neon的连接信息。');
    console.log('按Ctrl+C取消，或按Enter继续...');
    
    // 等待用户输入
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('', () => {
      rl.close();
      const backupFile = backupDatabase();
      console.log(`\n提示: 请将备份文件 ${backupFile} 保存到安全的位置。`);
    });
  } else {
    const backupFile = backupDatabase();
    console.log(`\n提示: 请将备份文件 ${backupFile} 保存到安全的位置。`);
  }
};

main(); 