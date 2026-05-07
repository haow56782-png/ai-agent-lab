import { Router } from "express";
import { getTaskHandler } from "../controllers/task.controller.js";
import type { TaskStore } from "../stores/types.js";

export function createTaskRoutes(taskStore: TaskStore): Router {
  const router = Router();
  router.get("/:taskId", getTaskHandler(taskStore));
  return router;
}
