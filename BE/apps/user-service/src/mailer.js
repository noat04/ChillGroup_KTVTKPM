import nodemailer from "nodemailer";
import { config } from "../../../packages/shared/src/config.js";

export async function sendPasswordResetEmail(email, resetLink) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.log(`password reset link for ${email}: ${resetLink}`);
    return { delivered: false, resetLink };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });

  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: "Dat lai mat khau Fruitweb",
    html: `<p>Ban vua yeu cau dat lai mat khau.</p><p><a href="${resetLink}">Dat lai mat khau</a></p>`
  });

  return { delivered: true };
}

export async function sendPasswordResetOtp(email, otp) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.log(`password reset OTP for ${email}: ${otp}`);
    return { delivered: false, otp };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });

  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: "Ma OTP dat lai mat khau Fruitweb",
    html: `
      <p>Ban vua yeu cau dat lai mat khau Fruitweb.</p>
      <p>Ma OTP cua ban la:</p>
      <h2 style="letter-spacing: 4px;">${otp}</h2>
      <p>Ma co hieu luc trong 10 phut. Neu ban khong yeu cau, vui long bo qua email nay.</p>
    `
  });

  return { delivered: true };
}
