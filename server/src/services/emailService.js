import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const sendOtpEmail = async ({ to, otp }) => {
  if (env.emailUser && env.emailPass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.emailUser,
        pass: env.emailPass
      }
    });

    await transporter.sendMail({
      from: `"TechwizGenAI" <${env.emailUser}>`,
      to,
      subject: "Your TechwizGenAI Verification Code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#111827;margin-bottom:8px;">Verification Code</h2>
          <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">Use the code below to proceed. It is valid for 10 minutes.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#111827;">
            ${otp}
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });
  } else {
    process.stdout.write(
      `\n[AUTH_OTP_DEV_LOG] Destination: ${to} | Verification Code: ${otp}\n`
    );
  }
  return { success: true };
};

export default { sendOtpEmail };
