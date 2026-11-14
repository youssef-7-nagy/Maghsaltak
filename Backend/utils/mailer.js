const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Gmail SMTP transporter — uses SMTP_USER (Gmail address) + SMTP_PASS (App Password)
// Explicitly using port 587 (TLS) because port 465 is often blocked by ISPs resulting in ETIMEDOUT
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends a beautifully styled password reset email.
 * @param {string} toEmail - Recipient email address
 * @param {string} resetUrl  - The full reset link including token
 */
const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const mailOptions = {
    from: `"Maghsaltak 🚗" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Reset Your Password — Maghsaltak",
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Password</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#0A2440 0%,#1F75B8 100%);padding:36px 40px;text-align:center;">
                  <div style="font-size:32px;margin-bottom:8px;">🚗</div>
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Maghsaltak</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Car Wash Service</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 40px 30px;">
                  <h2 style="margin:0 0 12px;color:#0A2440;font-size:22px;font-weight:700;">Password Reset Request</h2>
                  <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.6;">
                    We received a request to reset the password for your Maghsaltak account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:10px 0 28px;">
                        <a href="${resetUrl}"
                          style="display:inline-block;background:linear-gradient(135deg,#1F75B8,#0A2440);color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(31,117,184,0.4);">
                          🔑 Reset My Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

                  <p style="margin:0 0 8px;color:#718096;font-size:13px;line-height:1.6;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin:0 0 24px;word-break:break-all;">
                    <a href="${resetUrl}" style="color:#1F75B8;font-size:12px;text-decoration:underline;">${resetUrl}</a>
                  </p>

                  <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;">
                    <p style="margin:0;color:#9a3412;font-size:13px;line-height:1.5;">
                      ⚠️ <strong>Didn't request this?</strong> If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;color:#a0aec0;font-size:12px;">
                    © ${new Date().getFullYear()} Maghsaltak Car Wash Service · Cairo, Egypt
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { transporter, sendPasswordResetEmail };
