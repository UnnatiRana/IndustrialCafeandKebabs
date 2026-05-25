import type { Order, OrderStatus } from "../src/types/domain";

export type NotificationChannel = "email" | "sms";

export type NotificationEvent =
  | "order_placed"
  | "order_confirmed"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "picked_up";

export type NotificationRecipient = {
  email?: string;
  phone?: string;
  name?: string;
};

export type NotificationPayload = {
  event: NotificationEvent;
  order: Order;
  recipient: NotificationRecipient;
};

export type NotificationMessage = {
  subject: string;
  emailBody: string;
  smsBody: string;
};

export type NotificationSendResult = {
  channel: NotificationChannel;
  ok: boolean;
  provider: "resend" | "sendgrid" | "twilio" | "placeholder";
  messageId?: string;
  error?: string;
};

export const statusToNotificationEvent: Partial<Record<OrderStatus, NotificationEvent>> = {
  placed: "order_placed",
  confirmed: "order_confirmed",
  ready_for_pickup: "ready_for_pickup",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  picked_up: "picked_up",
};
