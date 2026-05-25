import { sendWithResend, sendWithSendGrid } from "./emailProviders";
import { sendWithTwilio } from "./smsProviders";
import { buildNotificationMessage } from "./templates";
import type { NotificationPayload, NotificationSendResult } from "./notificationTypes";

type NotificationProviderConfig = {
  emailProvider?: "resend" | "sendgrid";
  sendEmail?: boolean;
  sendSms?: boolean;
};

export async function sendOrderNotification(
  payload: NotificationPayload,
  config: NotificationProviderConfig = { emailProvider: "resend", sendEmail: true, sendSms: true },
): Promise<NotificationSendResult[]> {
  const message = buildNotificationMessage(payload);
  const results: NotificationSendResult[] = [];

  if (config.sendEmail) {
    const emailResult =
      config.emailProvider === "sendgrid"
        ? await sendWithSendGrid({ to: payload.recipient, message })
        : await sendWithResend({ to: payload.recipient, message });
    results.push(emailResult);
  }

  if (config.sendSms) {
    results.push(await sendWithTwilio({ to: payload.recipient, message }));
  }

  return results;
}
