import type { NotificationMessage, NotificationRecipient, NotificationSendResult } from "./notificationTypes";

type SmsProviderInput = {
  to: NotificationRecipient;
  message: NotificationMessage;
};

export async function sendWithTwilio(input: SmsProviderInput): Promise<NotificationSendResult> {
  if (!input.to.phone) {
    return {
      channel: "sms",
      ok: false,
      provider: "twilio",
      error: "Missing recipient phone number.",
    };
  }

  return {
    channel: "sms",
    ok: true,
    provider: "twilio",
    messageId: `placeholder-twilio-${Date.now()}`,
  };
}
