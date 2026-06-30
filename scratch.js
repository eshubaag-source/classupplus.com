const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
  console.log('Starting SMTP test...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '********' : 'undefined');
  
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
      subject: 'Test Classupplus Email',
      text: 'If you receive this, Classupplus OTP !',
    });
    alert('Email sent successfully!', info);
  } catch (err) {
    console.error('Email sending failed:', err);
  }
}

run();

