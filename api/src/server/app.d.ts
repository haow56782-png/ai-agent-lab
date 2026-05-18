/**
 * API Server Application — Express app setup with middleware and routes.
 *
 * Creates the Express app with all middleware and route registrations.
 * The server startup is in server.ts — this is kept separate for testing.
 */
import { InMemoryTaskStore, InMemorySignalStore, InMemoryReportStore } from "./stores/in-memory.js";
export declare function createApp(): {
    app: import("express-serve-static-core").Express;
    taskStore: InMemoryTaskStore;
    signalStore: InMemorySignalStore;
    reportStore: InMemoryReportStore;
};
//# sourceMappingURL=app.d.ts.map