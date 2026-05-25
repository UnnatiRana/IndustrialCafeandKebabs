import { mockMenuItems } from "../../src/lib/mockData";
import type { Order } from "../../src/types/domain";
import type {
  PosAdapter,
  PosAvailabilityUpdate,
  PosLoyaltyUpdate,
  PosMenuSyncResult,
  PosSyncResult,
  PosWebhookEvent,
} from "./posTypes";

function result(action: PosSyncResult["action"], message: string, metadata?: Record<string, unknown>): PosSyncResult {
  return {
    provider: "mock",
    action,
    ok: true,
    message,
    syncedAt: new Date().toISOString(),
    metadata,
  };
}

export const mockPosAdapter: PosAdapter = {
  provider: "mock",

  async syncMenuFromPos(): Promise<PosMenuSyncResult> {
    return {
      ...result("sync_menu", "Mock POS menu sync completed."),
      menuItems: mockMenuItems,
    };
  },

  async syncPriceChanges(): Promise<PosSyncResult> {
    return result("sync_prices", "Mock POS price changes synced.", {
      changedItems: mockMenuItems.map((item) => item.posExternalId).filter(Boolean),
    });
  },

  async syncAvailabilityChanges(): Promise<PosSyncResult & { updates: PosAvailabilityUpdate[] }> {
    const updates = mockMenuItems.map((item) => ({
      posExternalId: item.posExternalId ?? item.id,
      isAvailable: item.isAvailable,
      isInStock: item.isInStock,
      changedAt: new Date().toISOString(),
    }));

    return {
      ...result("sync_availability", "Mock POS stock availability synced.", { updateCount: updates.length }),
      updates,
    };
  },

  async pushOnlineOrderToPos(order: Order): Promise<PosSyncResult> {
    return result("push_order", `Mock POS accepted online order ${order.orderNumber}.`, {
      orderId: order.id,
      totalCents: order.totalCents,
    });
  },

  async updateLoyaltyFromInStorePurchase(update: PosLoyaltyUpdate): Promise<PosSyncResult> {
    return result("sync_loyalty", "Mock POS loyalty purchase update processed.", {
      customerExternalId: update.customerExternalId,
      pointsDelta: update.pointsDelta,
    });
  },

  async handleWebhook(event: PosWebhookEvent): Promise<PosSyncResult> {
    return result("webhook_received", `Mock POS webhook ${event.eventType} captured.`, {
      eventId: event.eventId,
    });
  },
};
