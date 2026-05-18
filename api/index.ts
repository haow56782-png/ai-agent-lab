/**
 * Vercel Serverless entry point.
 *
 * Exports the Express app as a Vercel serverless function.
 * All routes defined in src/server/app.ts are handled here.
 */
import { createApp } from "../src/server/app";

const { app } = createApp();

export default app;
