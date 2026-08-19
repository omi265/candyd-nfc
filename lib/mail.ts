import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendPasswordResetEmail = async (email: string, code: string) => {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY is missing. Password reset email not sent.");
    console.info(`🔑 Password reset code for ${email}: ${code}`);
    return;
  }

  try {
    await resend.emails.send({
      from: "Our Dve <auth@nfc.candyd.co>",
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #556B5A;">
          <h2 style="color: #556B5A; margin-bottom: 8px;">Reset your password</h2>
          <p>You requested a password reset for your Our Dve account.</p>
          <p>Use the following 6-digit code to reset your password:</p>
          <div style="background: #F6F2EC; border: 1px solid #E6DED1; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #556B5A;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #A69D93;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #E6DED1; margin: 24px 0;" />
          <p style="font-size: 12px; color: #A69D93;">Our Dve Team</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send reset email:", error);
    return { error: "Failed to send reset code email" };
  }
};

export async function sendRegistrationVerificationEmail(email: string, code: string) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required to send verification emails");
    }

    console.warn("⚠️ RESEND_API_KEY is missing. Verification email not sent.");
    console.info(`✉️ Registration verification code for ${email}: ${code}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: "Our Dve <auth@nfc.candyd.co>",
    to: email,
    subject: "Verify your Our Dve account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #556B5A;">
        <h2 style="color: #556B5A; margin-bottom: 8px;">Welcome!</h2>
        <p>Use the following 6-digit code to finish creating your Our Dve account:</p>
        <div style="background: #F6F2EC; border: 1px solid #E6DED1; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #556B5A;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #A69D93;">This code will expire in 10 minutes. If you did not sign up for this account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E6DED1; margin: 24px 0;" />
        <p style="font-size: 12px; color: #A69D93;">Our Dve Team</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Verification email failed: ${error.message}`);
  }
}

export const sendVerificationOtpEmail = sendRegistrationVerificationEmail;
