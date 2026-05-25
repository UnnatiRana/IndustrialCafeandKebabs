import type { MenuItem, Order, PosProviderId } from "../../src/types/domain";

export type PosWebhookEventType =
  | "menu.updated"
  | "price.updated"
  | "availability.updated"
  | "order.updated"
  | "loyalty.updated";

export type PosSyncAction =
  | "sync_menu"
  | "sync_prices"
  | "sync_availability"
  | "push_order"
  | "sync_loyalty"
  | "webhook_received";

export type PosSyncResult = {
  provider: PosProviderId;
  action: PosSyncAction;
  ok: boolean;
  message: string;
  externalReference?: string;
  syncedAt: string;
  metadata?: Record<string, unknown>;
};

export type PosMenuSyncResult = PosSyncResult & {
  menuItems: MenuItem[];
};

export type PosAvailabilityUpdate = {
  posExternalId: string;
  isAvailable: boolean;
  isInStock: boolean;
  changedAt: string;
};

export type PosPriceUpdate = {
  posExternalId: string;
  priceCents: number;
  changedAt: string;
};

export type PosLoyaltyUpdate = {
  customerExternalId: string;
  pointsDelta: number;
  transactionReference: string;
  purchasedAt: string;
};

export type PosWebhookEvent = {
  provider: PosProviderId;
  eventType: PosWebhookEventType;
  eventId: string;
  receivedAt: string;
  payload: Record<string, unknown>;
};

export interface PosAdapter {
  provider: PosProviderId;
  syncMenuFromPos(): Promise<PosMenuSyncResult>;
  syncPriceChanges(): Promise<PosSyncResult>;
  syncAvailabilityChanges(): Promise<PosSyncResult & { updates: PosAvailabilityUpdate[] }>;
  pushOnlineOrderToPos(order: Order): Promise<PosSyncResult>;
  updateLoyaltyFromInStorePurchase(update: PosLoyaltyUpdate): Promise<PosSyncResult>;
  handleWebhook?(event: PosWebhookEvent): Promise<PosSyncResult>;
}
