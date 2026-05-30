import { Router } from "express";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import * as adminRepo from "../repositories/admin.js";

export const adminRoutes = Router();

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

adminRoutes.get("/overview", async (_req, res, next) => {
  try {
    res.json(await adminRepo.getOverview());
  } catch (err) {
    next(err);
  }
});

adminRoutes.get("/domains/:domainId/records", async (req, res, next) => {
  try {
    const domain = adminRepo.ADMIN_DOMAINS.find((candidate) => candidate.id === req.params.domainId);
    if (!domain) {
      throw createError(404, ERROR_CODES.NOT_FOUND, `Unknown admin domain: ${req.params.domainId}`);
    }
    const records = await adminRepo.listDomainRecords(req.params.domainId, {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      limit: parseLimit(req.query.limit),
    });
    res.json({ domain, records });
  } catch (err) {
    next(err);
  }
});

adminRoutes.get("/audit-records", async (req, res, next) => {
  try {
    const records = await adminRepo.listAuditRecords({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      limit: parseLimit(req.query.limit),
    });
    res.json({ records });
  } catch (err) {
    next(err);
  }
});
