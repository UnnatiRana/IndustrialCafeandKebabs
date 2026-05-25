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
    provider: "lightspeed",
    action,
    ok: false,
    message: "Lightspeed adapter is scaffolded. Add Lightspeed credentials and API calls before enabling.",
    syncedAt: new Date().toISOString(),
  };
}

export const lightspeedAdapter: PosAdapter = {
  provider: "lightspeed",

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
