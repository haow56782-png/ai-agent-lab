import { Router } from "express";
import { analyzeHandler } from "../controllers/agent.controller.js";
export function createAgentRoutes(taskStore) {
    const router = Router();
    router.post("/analyze", analyzeHandler(taskStore));
    return router;
}
//# sourceMappingURL=agent.routes.js.map