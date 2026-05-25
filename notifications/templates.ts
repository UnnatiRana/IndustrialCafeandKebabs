import type { NotificationEvent, NotificationMessage, NotificationPayload } from "./notificationTypes";

const eventLabels: Record<NotificationEvent, string> = {
  order_placed: "Order placed",
  order_confirmed: "Order confirmed",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  picked_up: "Picked up",
};

export function buildNotificationMessage(payload: NotificationPayload): NotificationMessage {
  const order = payload.order;
  const customerName = payload.recipient.name ?? order.customer.fullName;
  const label = eventLabels[payload.event];

  const detailsByEvent: Record<NotificationEvent, string> = {
    order_placed: "We received your order and will confirm it shortly.",
    order_confirmed: "Your order has been confirmed and is now in the kitchen queue.",
    ready_for_pickup: "Your order is ready. Please collect it from the counter.",
    out_for_delivery: "Your order is on the way.",
    delivered: "Your order has been delivered. Enjoy!",
    picked_up: "Your order has been picked up. Enjoy!",
  };

  return {
    subject: `${label}: ${order.orderNumber}`,
    emailBody: [
      `Hi ${customerName},`,
      "",
      detailsByEvent[payload.event],
      "",
      `Order: ${order.orderNumber}`,
      `Total: ${(order.totalCents / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD",
      })}`,
      "",
      "Industrial Cafe and Kebabs",
    ].join("\n"),
    smsBody: `Industrial Cafe and Kebabs: ${detailsByEvent[payload.event]} (${order.orderNumber})`,
  };
}
