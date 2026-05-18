import { Router } from "express";
import { getTaskHandler } from "../controllers/task.controller.js";
export function createTaskRoutes(taskStore) {
    const router = Router();
    router.get("/:taskId", getTaskHandler(taskStore));
    return router;
}
//# sourceMappingURL=task.routes.js.map