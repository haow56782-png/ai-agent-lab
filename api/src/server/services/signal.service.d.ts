/**
 * Signal Service — retrieves signals from the store.
 *
 * Billing note:
 * Retrieval (GET /api/signals/:id) does NOT charge. The charge happened
 * at signal creation time (see task.service.ts createSignalFromTask),
 * which is idempotent via the ANALYZING → COMPLETED state machine lock.
 */
import type { SignalStore, SignalRecord } from "../stores/types.js";
export declare function getSignal(signalId: string, signalStore: SignalStore): Promise<SignalRecord | undefined>;
//# sourceMappingURL=signal.service.d.ts.map