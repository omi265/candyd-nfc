import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/login/reset-password?token=${token}`;

  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY is missing. Password reset email not sent.");
    console.info(`🔑 Password reset link for ${email}: ${resetLink}`);
    return;
  }

  try {
    await resend.emails.send({
      from: "Candyd NFC <onboarding@resend.dev>", // Replace with your verified domain
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #5B2D7D;">
          <h1 style="color: #5B2D7D;">Reset your password</h1>
          <p>You requested a password reset for your Candyd NFC account.</p>
          <p>Click the link below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #5B2D7D; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #EADDDE; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9A92A6;">Candyd NFC Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
};
