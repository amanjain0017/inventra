const nodemailer = require("nodemailer");

const sendEmail = async ({ email, subject, message }) => {
  // 1. Create transporter using SendGrid
  const transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    auth: {
      user: "apikey",
      pass: process.env.SENDGRID_API_KEY,
    },
  });

  // 2. Define email options
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject,
    html: message,
  };

  // 3. Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email sending failed.");
  }
};

module.exports = sendEmail;
