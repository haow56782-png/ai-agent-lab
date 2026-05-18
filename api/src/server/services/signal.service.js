/**
 * Signal Service — retrieves signals from the store.
 *
 * Billing note:
 * Retrieval (GET /api/signals/:id) does NOT charge. The charge happened
 * at signal creation time (see task.service.ts createSignalFromTask),
 * which is idempotent via the ANALYZING → COMPLETED state machine lock.
 */
export async function getSignal(signalId, signalStore) {
    return signalStore.getSignal(signalId);
}
//# sourceMappingURL=signal.service.js.map