import type { Request, Response, NextFunction } from "express";

let idCounter = 0;

export function generateRequestId(): string {
  idCounter++;
  return `req_${Date.now().toString(36)}_${idCounter}`;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = generateRequestId();
  next();
}
