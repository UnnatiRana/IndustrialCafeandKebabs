import type { NotificationMessage, NotificationRecipient, NotificationSendResult } from "./notificationTypes";

type EmailProviderInput = {
  to: NotificationRecipient;
  message: NotificationMessage;
};

export async function sendWithResend(input: EmailProviderInput): Promise<NotificationSendResult> {
  if (!input.to.email) {
    return {
      channel: "email",
      ok: false,
      provider: "resend",
      error: "Missing recipient email address.",
    };
  }

  return {
    channel: "email",
    ok: true,
    provider: "resend",
    messageId: `placeholder-resend-${Date.now()}`,
  };
}

export async function sendWithSendGrid(input: EmailProviderInput): Promise<NotificationSendResult> {
  if (!input.to.email) {
    return {
      channel: "email",
      ok: false,
      provider: "sendgrid",
      error: "Missing recipient email address.",
    };
  }

  return {
    channel: "email",
    ok: true,
    provider: "sendgrid",
    messageId: `placeholder-sendgrid-${Date.now()}`,
  };
}
