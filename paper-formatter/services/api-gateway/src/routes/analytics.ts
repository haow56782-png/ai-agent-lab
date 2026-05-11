import { Router } from "express";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";

export const analyticsRoutes = Router();

analyticsRoutes.post("/track", (req, res, next) => {
  try {
    console.log("Analytics event received:", JSON.stringify(req.body));
    res.status(200).json({ ok: true });
  } catch (error) {
    next(createError(500, ERROR_CODES.INTERNAL_ERROR, "Failed to process analytics event") || error);
  }
});
