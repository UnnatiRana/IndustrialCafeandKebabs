import type { Order } from "../../src/types/domain";
import type {
  PosAdapter,
  PosAvailabilityUpdate,
  PosLoyaltyUpdate,
  PosMenuSyncResult,
  PosSyncResult,
  PosWebhookEvent,
} from "./posTypes";

function notConfigured(action: PosSyncResult["action"]): PosSyncResult {
  return {
    provider: "square",
    action,
    ok: false,
    message: "Square adapter is scaffolded. Add Square credentials and API calls before enabling.",
    syncedAt: new Date().toISOString(),
  };
}

export const squareAdapter: PosAdapter = {
  provider: "square",

  async syncMenuFromPos(): Promise<PosMenuSyncResult> {
    return { ...notConfigured("sync_menu"), menuItems: [] };
  },

  async syncPriceChanges(): Promise<PosSyncResult> {
    return notConfigured("sync_prices");
  },

  async syncAvailabilityChanges(): Promise<PosSyncResult & { updates: PosAvailabilityUpdate[] }> {
    return { ...notConfigured("sync_availability"), updates: [] };
  },

  async pushOnlineOrderToPos(_order: Order): Promise<PosSyncResult> {
    return notConfigured("push_order");
  },

  async updateLoyaltyFromInStorePurchase(_update: PosLoyaltyUpdate): Promise<PosSyncResult> {
    return notConfigured("sync_loyalty");
  },

  async handleWebhook(event: PosWebhookEvent): Promise<PosSyncResult> {
    return {
      ...notConfigured("webhook_received"),
      metadata: { eventType: event.eventType, eventId: event.eventId },
    };
  },
};
