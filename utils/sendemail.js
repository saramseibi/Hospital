const nodemailer = require('nodemailer');

async function sendEmail(email, subject, text) {

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, 
    port: Number(process.env.EMAIL_PORT), 
    secure: Boolean(process.env.EMAIL_SECURE), 
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS, 
    },
  });

  try {

    await transporter.sendMail({
      from: process.env.EMAIL_USER, 
      to: email,
      subject: subject,
      text: text,
    });

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    
  }
}

module.exports = sendEmail;