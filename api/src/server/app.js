/**
 * API Server Application — Express app setup with middleware and routes.
 *
 * Creates the Express app with all middleware and route registrations.
 * The server startup is in server.ts — this is kept separate for testing.
 */
import express from "express";
import healthRouter from "./routes/health.routes.js";
import { createAgentRoutes } from "./routes/agent.routes.js";
import { createTaskRoutes } from "./routes/task.routes.js";
import { createSignalRoutes } from "./routes/signal.routes.js";
import { createReportRoutes } from "./routes/report.routes.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/request-logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { InMemoryTaskStore, InMemorySignalStore, InMemoryReportStore } from "./stores/in-memory.js";
export function createApp() {
    const app = express();
    // Stores
    const taskStore = new InMemoryTaskStore();
    const signalStore = new InMemorySignalStore();
    const reportStore = new InMemoryReportStore();
    // Global middleware
    app.use(express.json());
    app.use(requestIdMiddleware);
    app.use(requestLogger);
    // Routes
    app.use(healthRouter);
    app.use("/api/agent", createAgentRoutes(taskStore));
    app.use("/api/tasks", createTaskRoutes(taskStore));
    app.use("/api/signals", createSignalRoutes(signalStore));
    app.use("/api/reports", createReportRoutes(reportStore));
    // Error handler (must be last)
    app.use(errorHandler);
    return { app, taskStore, signalStore, reportStore };
}
//# sourceMappingURL=app.js.map