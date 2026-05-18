import type { Request, Response, NextFunction } from "express";
export declare function generateRequestId(): string;
declare global {
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}
export declare function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=request-id.d.ts.map