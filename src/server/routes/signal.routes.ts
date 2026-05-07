import { Router } from "express";
import { getSignalHandler } from "../controllers/signal.controller.js";
import type { SignalStore } from "../stores/types.js";

export function createSignalRoutes(signalStore: SignalStore): Router {
  const router = Router();
  router.get("/:signalId", getSignalHandler(signalStore));
  return router;
}
