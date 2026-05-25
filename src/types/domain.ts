export type StaffRole = "admin" | "manager" | "staff";

export type FulfillmentType = "pickup" | "delivery";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "rejected"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "picked_up"
  | "cancelled";

export type PosProviderId = "mock" | "square" | "lightspeed";

export type PosSyncStatus = "pending" | "synced" | "failed";

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  lifetimeSpendCents: number;
  defaultDeliveryAddress?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItemOption {
  id: string;
  menuItemId: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
  isInStock: boolean;
  imageUrl?: string;
  posExternalId?: string;
  options: MenuItemOption[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  selectedOptions: string[];
}

export interface OrderStatusEvent {
  id: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerProfile;
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  pickupAt?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  posSyncStatus: PosSyncStatus;
  createdAt: string;
  statusHistory: OrderStatusEvent[];
}

export interface DailySalesSummary {
  grossSalesCents: number;
  netSalesCents: number;
  orderCount: number;
  pickupOrderCount: number;
  deliveryOrderCount: number;
  averageOrderCents: number;
}
