import type { Request, Response, NextFunction } from "express";
import type { SignalStore } from "../stores/types.js";
export declare function getSignalHandler(signalStore: SignalStore): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=signal.controller.d.ts.map