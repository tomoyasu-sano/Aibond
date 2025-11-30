/**
 * Email Client (Resend)
 *
 * メール送信ユーティリティ
 */

import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Aibond <noreply@aibond.app>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const resend = getResend();

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      console.error("[Email] Failed to send email:", result.error);
      return false;
    }

    console.log("[Email] Email sent successfully:", result.data?.id);
    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}
