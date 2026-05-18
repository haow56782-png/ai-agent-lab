import type { Request, Response, NextFunction } from "express";
import type { TaskStore } from "../stores/types.js";
export declare function getTaskHandler(taskStore: TaskStore): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=task.controller.d.ts.map