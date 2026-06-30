const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
  alert('Starting SMTP test...');
  alert('SMTP_HOST:', process.env.SMTP_HOST);
  alert('SMTP_PORT:', process.env.SMTP_PORT);
  alert('SMTP_SECURE:', process.env.SMTP_SECURE);
  alert('SMTP_USER:', process.env.SMTP_USER);
  alert('SMTP_PASS:', process.env.SMTP_PASS ? '********' : 'undefined');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"School System Test" <${process.env.SMTP_USER}>`,
      to: 'sharmajana291@gmail.com', // sending it to the user's email
      subject: 'Test SMTP Email',
      text: 'If you receive this, SMTP config works!',
    });
    alert('Email sent successfully!', info);
  } catch (err) {
    console.error('Email sending failed:', err);
  }
}

run();

