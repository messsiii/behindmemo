import nodemailer from 'nodemailer'
import { getVerificationEmailTemplate } from './email-templates'

type EmailLanguage = 'en' | 'zh'

interface EmailTemplates {
  subject: string
  body: (code: string) => string
}

// 邮件模板
const emailTemplates: Record<EmailLanguage, EmailTemplates> = {
  en: {
    subject: 'Your Verification Code',
    body: (code: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <p>Thank you for using our service. Your verification code is:</p>
        <div style="margin: 20px 0; text-align: center; padding: 10px; background-color: #f7f7f7; border-radius: 4px; font-size: 24px; letter-spacing: 4px;">
          <strong>${code}</strong>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777; text-align: center;">
          This is an automated message, please do not reply.
        </div>
      </div>
    `,
  },
  zh: {
    subject: '您的验证码',
    body: (code: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">邮箱验证</h2>
        <p>感谢使用我们的服务，您的验证码是：</p>
        <div style="margin: 20px 0; text-align: center; padding: 10px; background-color: #f7f7f7; border-radius: 4px; font-size: 24px; letter-spacing: 4px;">
          <strong>${code}</strong>
        </div>
        <p>此验证码将在10分钟后失效。</p>
        <p>如果您没有请求此验证码，请忽略此邮件。</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777; text-align: center;">
          这是一条自动发送的消息，请勿回复。
        </div>
      </div>
    `,
  },
}

// 添加开发环境邮件模拟功能
const isDevMode = process.env.NODE_ENV !== 'production';

/**
 * 发送验证码邮件
 * @param to 接收者邮箱
 * @param code 验证码
 * @param language 邮件语言，默认为中文
 * @returns 是否发送成功
 */
export async function sendVerificationCode(
  to: string, 
  code: string, 
  language: EmailLanguage = 'zh'
): Promise<boolean> {
  // 在开发环境中模拟邮件发送
  if (isDevMode) {
    console.log('=============== 开发模式: 模拟邮件发送 ===============');
    console.log(`发送给: ${to}`);
    console.log(`验证码: ${code}`);
    console.log(`语言: ${language}`);
    console.log('====================================================');
    return true;
  }

  try {
    // 创建SMTP传输器
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: parseInt(process.env.EMAIL_SERVER_PORT || '587') === 465,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      }
    });

    // 获取邮件模板
    const emailTemplate = getVerificationEmailTemplate(code, language);

    // 构建邮件选项
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@behindmemory.com',
      to,
      subject: language === 'en' ? 'Your Verification Code' : '您的验证码',
      html: emailTemplate,
    };

    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    console.log(`验证码邮件已发送: MessageId=${info.messageId}`);
    return true;
  } catch (error) {
    console.error('发送验证码邮件失败:', error);
    return false;
  }
}

// 生成随机验证码
export function generateVerificationCode(length = 6): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
} 