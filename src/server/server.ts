/**
 * API Server entry point.
 *
 * Starts the Express server on the configured port.
 */

import "dotenv/config";
import { createApp } from "./app.js";

const PORT = parseInt(process.env.API_PORT || "3000", 10);
const HOST = process.env.API_HOST || "0.0.0.0";

const { app } = createApp();

app.listen(PORT, HOST, () => {
  console.log(`VIB AI Agent API server running at http://${HOST}:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
