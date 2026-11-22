async function sendAccountEmail(to, subject, url) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email delivery is not configured.');
    console.info(`[development email] ${subject} for ${to}: ${url}`);
    return;
  }
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
  await transport.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text: `Use this link within one hour: ${url}` });
}
module.exports = { sendAccountEmail };
