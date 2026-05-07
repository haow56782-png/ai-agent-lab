import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "vib-ai-agent-api",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
