/**
 * Signal Service — retrieves signals from the store.
 *
 * Billing note:
 * Retrieval (GET /api/signals/:id) does NOT charge. The charge happened
 * at signal creation time (see task.service.ts createSignalFromTask),
 * which is idempotent via the ANALYZING → COMPLETED state machine lock.
 */

import type { SignalStore, SignalRecord } from "../stores/types.js";

export async function getSignal(signalId: string, signalStore: SignalStore): Promise<SignalRecord | undefined> {
  return signalStore.getSignal(signalId);
}
