import type { DailySalesSummary, MenuCategory, MenuItem, Order } from "../types/domain";

export const mockCategories: MenuCategory[] = [
  { id: "cat-coffee", name: "Coffee", sortOrder: 1, isActive: true },
  { id: "cat-kebabs", name: "Kebabs", sortOrder: 2, isActive: true },
  { id: "cat-sides", name: "Sides", sortOrder: 3, isActive: true },
];

export const mockMenuItems: MenuItem[] = [
  {
    id: "item-flat-white",
    categoryId: "cat-coffee",
    name: "Flat White",
    description: "Double espresso with silky steamed milk.",
    priceCents: 550,
    isAvailable: true,
    isInStock: true,
    posExternalId: "pos-fw-001",
    options: [
      {
        id: "opt-oat",
        menuItemId: "item-flat-white",
        name: "Oat milk",
        priceDeltaCents: 80,
        isAvailable: true,
      },
    ],
  },
  {
    id: "item-chicken-kebab",
    categoryId: "cat-kebabs",
    name: "Chicken Kebab",
    description: "Chargrilled chicken, salad, garlic sauce, and warm flatbread.",
    priceCents: 1590,
    isAvailable: true,
    isInStock: true,
    posExternalId: "pos-ck-101",
    options: [
      {
        id: "opt-extra-meat",
        menuItemId: "item-chicken-kebab",
        name: "Extra chicken",
        priceDeltaCents: 400,
        isAvailable: true,
      },
    ],
  },
  {
    id: "item-hot-chips",
    categoryId: "cat-sides",
    name: "Hot Chips",
    description: "Crispy chips with chicken salt.",
    priceCents: 690,
    isAvailable: true,
    isInStock: false,
    posExternalId: "pos-hc-301",
    options: [],
  },
];

export const mockOrders: Order[] = [
  {
    id: "order-1001",
    orderNumber: "ICK-1001",
    customer: {
      id: "customer-1",
      fullName: "Ava Patel",
      email: "ava@example.com",
      phone: "+61400000001",
      loyaltyPoints: 240,
      lifetimeSpendCents: 8560,
      defaultDeliveryAddress: "12 Market St, Melbourne VIC",
    },
    fulfillmentType: "pickup",
    status: "placed",
    items: [
      {
        id: "oi-1",
        orderId: "order-1001",
        menuItemId: "item-flat-white",
        name: "Flat White",
        quantity: 2,
        unitPriceCents: 550,
        selectedOptions: ["Oat milk"],
      },
      {
        id: "oi-2",
        orderId: "order-1001",
        menuItemId: "item-hot-chips",
        name: "Hot Chips",
        quantity: 1,
        unitPriceCents: 690,
        selectedOptions: [],
      },
    ],
    subtotalCents: 1790,
    discountCents: 0,
    deliveryFeeCents: 0,
    taxCents: 179,
    totalCents: 1969,
    pickupAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    posSyncStatus: "pending",
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    statusHistory: [
      {
        id: "osh-1",
        status: "placed",
        createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "order-1002",
    orderNumber: "ICK-1002",
    customer: {
      id: "customer-2",
      fullName: "Noah Williams",
      email: "noah@example.com",
      phone: "+61400000002",
      loyaltyPoints: 90,
      lifetimeSpendCents: 3120,
      defaultDeliveryAddress: "45 Station Rd, Richmond VIC",
    },
    fulfillmentType: "delivery",
    status: "confirmed",
    items: [
      {
        id: "oi-3",
        orderId: "order-1002",
        menuItemId: "item-chicken-kebab",
        name: "Chicken Kebab",
        quantity: 1,
        unitPriceCents: 1590,
        selectedOptions: ["Extra chicken"],
      },
    ],
    subtotalCents: 1990,
    discountCents: 200,
    deliveryFeeCents: 500,
    taxCents: 229,
    totalCents: 2519,
    deliveryAddress: "45 Station Rd, Richmond VIC",
    deliveryInstructions: "Leave at reception.",
    posSyncStatus: "synced",
    createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    statusHistory: [
      {
        id: "osh-2",
        status: "placed",
        createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      },
      {
        id: "osh-3",
        status: "confirmed",
        createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
        createdBy: "manager",
      },
    ],
  },
];

export function getDailySalesSummary(orders: Order[]): DailySalesSummary {
  const completedOrActiveOrders = orders.filter((order) => order.status !== "rejected");
  const grossSalesCents = completedOrActiveOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const orderCount = completedOrActiveOrders.length;

  return {
    grossSalesCents,
    netSalesCents: grossSalesCents,
    orderCount,
    pickupOrderCount: completedOrActiveOrders.filter((order) => order.fulfillmentType === "pickup").length,
    deliveryOrderCount: completedOrActiveOrders.filter((order) => order.fulfillmentType === "delivery").length,
    averageOrderCents: orderCount === 0 ? 0 : Math.round(grossSalesCents / orderCount),
  };
}
