import { Router } from "express";
import { analyzeHandler } from "../controllers/agent.controller.js";
import type { TaskStore } from "../stores/types.js";

export function createAgentRoutes(taskStore: TaskStore): Router {
  const router = Router();
  router.post("/analyze", analyzeHandler(taskStore));
  return router;
}
