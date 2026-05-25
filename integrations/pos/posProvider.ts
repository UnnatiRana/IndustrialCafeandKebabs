import type { PosProviderId } from "../../src/types/domain";
import { lightspeedAdapter } from "./lightspeedAdapter";
import { mockPosAdapter } from "./mockPosAdapter";
import type { PosAdapter, PosSyncResult, PosWebhookEvent } from "./posTypes";
import { squareAdapter } from "./squareAdapter";

const adapters: Record<PosProviderId, PosAdapter> = {
  mock: mockPosAdapter,
  square: squareAdapter,
  lightspeed: lightspeedAdapter,
};

export function getPosAdapter(provider: PosProviderId = "mock"): PosAdapter {
  return adapters[provider];
}

export async function dispatchPosWebhook(event: PosWebhookEvent): Promise<PosSyncResult> {
  const adapter = getPosAdapter(event.provider);

  if (!adapter.handleWebhook) {
    return {
      provider: event.provider,
      action: "webhook_received",
      ok: false,
      message: `Provider ${event.provider} does not support webhooks yet.`,
      syncedAt: new Date().toISOString(),
      metadata: { eventId: event.eventId, eventType: event.eventType },
    };
  }

  return adapter.handleWebhook(event);
}

export type { PosAdapter, PosSyncResult } from "./posTypes";
