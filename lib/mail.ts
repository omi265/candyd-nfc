import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendPasswordResetEmail = async (email: string, token: string) => {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY is missing. Password reset email not sent.");
    console.info(`🔑 Password reset code for ${email}: ${token}`);
    return;
  }

  try {
    await resend.emails.send({
      from: "Our DVE <auth@nfc.candyd.co>",
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #556B5A;">
          <h1 style="color: #556B5A;">Reset your password</h1>
          <p>You requested a password reset for your Our DVE account.</p>
          <p>Use the following 6-digit code to reset your password:</p>
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #556B5A;">${token}</span>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #EADDDE; margin: 20px 0;" />
          <p style="font-size: 12px; color: #A69D93;">Our DVE Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
};

export const sendRegistrationVerificationEmail = async (email: string, token: string) => {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required to send verification emails");
    }

    console.warn("⚠️ RESEND_API_KEY is missing. Verification email not sent.");
    console.info(`✉️ Registration verification code for ${email}: ${token}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: "Our DVE <auth@nfc.candyd.co>",
    to: email,
    subject: "Verify your Our DVE account",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #556B5A;">
        <h1 style="color: #556B5A;">Verify your email</h1>
        <p>Use the following 6-digit code to finish creating your Our DVE account:</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #556B5A;">${token}</span>
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this account, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #EADDDE; margin: 20px 0;" />
        <p style="font-size: 12px; color: #A69D93;">Our DVE Team</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Verification email failed: ${error.message}`);
  }
};
