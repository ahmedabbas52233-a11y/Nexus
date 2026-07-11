const nodemailer = require('nodemailer');

// Uses real SMTP if credentials are configured via env vars.
// Otherwise falls back to logging the email to the console so the
// flow is still fully testable/demoable without a mail account.
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log('\n===== MOCK EMAIL (no SMTP configured) =====');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', text);
    console.log('=============================================\n');
    return { mocked: true };
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'Nexus Platform <no-reply@nexus.app>',
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendMail };
