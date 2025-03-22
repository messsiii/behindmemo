export function getVerificationEmailTemplate(code: string, language = 'zh') {
  const isEnglish = language === 'en';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isEnglish ? 'Login Verification Code' : '登录验证码'}</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
          <td align="center" style="padding: 40px 0 30px;">
            <table style="background: linear-gradient(135deg, #cc8eb1, #738fbd); border-radius: 50%; width: 80px; height: 80px; text-align: center;">
              <tr>
                <td valign="middle">
                  <span style="color: white; font-size: 28px; font-weight: bold;">BM</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <h1 style="color: #333333; font-size: 24px; margin: 0 0 20px; text-align: center;">
              ${isEnglish ? 'Your Login Verification Code' : '您的登录验证码'}
            </h1>
            <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
              ${isEnglish ? 'Hello,' : '您好，'}
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
              ${isEnglish 
                ? 'Please use the following verification code to complete your login:' 
                : '请使用以下验证码完成登录：'}
            </p>
            <div style="background-color: #f7f9fa; border-radius: 4px; padding: 15px; text-align: center; margin: 0 0 30px;">
              <span style="color: #333333; font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</span>
            </div>
            <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 0 0 10px;">
              ${isEnglish 
                ? 'This code will expire in 10 minutes.' 
                : '此验证码有效期为10分钟。'}
            </p>
            <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 0 0 30px;">
              ${isEnglish 
                ? 'If you did not request this code, please ignore this email.' 
                : '如果您没有请求此验证码，请忽略此邮件。'}
            </p>
            <p style="color: #999999; font-size: 14px; line-height: 22px; margin: 30px 0 0; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;">
              &copy; ${new Date().getFullYear()} Behind Memory - ${isEnglish ? 'AI Love Letter' : '爱情记忆'}
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
} 