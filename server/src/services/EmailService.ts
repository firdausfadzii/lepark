import crypto from "crypto";
import nodemailer, { Transporter } from "nodemailer";

export type OtpPurpose = "register" | "forgot_password" | "link_email";

interface OtpEntry {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_ATTEMPTS = 5;

const otpStore = new Map<string, OtpEntry>();

// Periodically clean up expired OTP entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (entry.expiresAt <= now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST || "smtp.mailgun.org";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!user || !pass) {
    throw new Error("SMTP credentials are not configured on the server.");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function getOtpKey(email: string, purpose: OtpPurpose): string {
  return `${purpose}:${email.trim().toLowerCase()}`;
}

function getPurposeCopy(purpose: OtpPurpose): { subject: string; heading: string; description: string } {
  switch (purpose) {
    case "register":
      return {
        subject: "Lepark — Your Registration Verification Code",
        heading: "Verify your email address",
        description: "Use the verification code below to complete your Lepark account registration.",
      };
    case "forgot_password":
      return {
        subject: "Lepark — Password Reset Verification Code",
        heading: "Reset your password",
        description: "Use the verification code below to reset your Lepark account password.",
      };
    case "link_email":
      return {
        subject: "Lepark — Link Your Email Address",
        heading: "Link your email address",
        description: "Use the verification code below to link this email address to your Lepark account.",
      };
  }
}

export async function sendOtp(
  email: string,
  purpose: OtpPurpose
): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const key = getOtpKey(cleanEmail, purpose);
  const existing = otpStore.get(key);
  const now = Date.now();

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    const remaining = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      error: `Please wait ${remaining}s before requesting another OTP.`,
      cooldownRemaining: remaining,
    };
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  otpStore.set(key, {
    code,
    expiresAt: now + OTP_EXPIRY_MS,
    lastSentAt: now,
    attempts: 0,
  });

  const { subject, heading, description } = getPurposeCopy(purpose);
  const fromAddress = process.env.SMTP_FROM || `Lepark <${process.env.SMTP_USER || "support@jomlepark.cc"}>`;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: fromAddress,
      to: cleanEmail,
      subject,
      text: `${heading}\n\n${description}\n\nYour OTP code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can safely ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; background: #142222; color: #f8f9f6; border-radius: 16px; border: 1px solid #2b4444;">
          <h2 style="margin: 0 0 10px; color: #eca239; font-size: 22px;">${heading}</h2>
          <p style="margin: 0 0 22px; color: #cbd5e1; font-size: 14px; line-height: 1.5;">${description}</p>
          <div style="background: #0d1717; border: 1px solid #3b8282; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: monospace;">${code}</span>
          </div>
          <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
            This code expires in <strong>10 minutes</strong>. If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (err: any) {
    // Remove failed OTP so user isn't locked out by cooldown
    otpStore.delete(key);
    console.error("Failed to send OTP email:", err);
    return {
      success: false,
      error: "Failed to send verification email. Please check the email address or try again later.",
    };
  }
}

export function verifyOtp(
  email: string,
  otp: string,
  purpose: OtpPurpose,
  consume = true
): { valid: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = (otp || "").trim();

  if (!cleanOtp) {
    return { valid: false, error: "OTP verification code is required." };
  }

  const key = getOtpKey(cleanEmail, purpose);
  const entry = otpStore.get(key);

  if (!entry) {
    return { valid: false, error: "No OTP found for this email. Please request a new code." };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { valid: false, error: "OTP code has expired. Please request a new code." };
  }

  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(key);
    return { valid: false, error: "Too many failed OTP attempts. Please request a new code." };
  }

  const expectedBuf = Buffer.from(entry.code);
  const actualBuf = Buffer.from(cleanOtp);

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    entry.attempts += 1;
    return { valid: false, error: "Invalid OTP code. Please check and try again." };
  }

  if (consume) {
    otpStore.delete(key);
  }

  return { valid: true };
}

export function consumeOtp(email: string, purpose: OtpPurpose): void {
  otpStore.delete(getOtpKey(email, purpose));
}
