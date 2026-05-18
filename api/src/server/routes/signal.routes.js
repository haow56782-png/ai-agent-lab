import { Router } from "express";
import { getSignalHandler } from "../controllers/signal.controller.js";
export function createSignalRoutes(signalStore) {
    const router = Router();
    router.get("/:signalId", getSignalHandler(signalStore));
    return router;
}
//# sourceMappingURL=signal.routes.js.map