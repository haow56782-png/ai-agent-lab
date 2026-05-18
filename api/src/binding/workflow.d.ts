/**
 * VIB AI — Binding Workflow Orchestrator
 *
 * Runs the URL→Site→Auth→Bind→Analyze→Signal pipeline.
 * Each stage emits a RuntimeEvent and records to tracer/telemetry/StateStore.
 */
import type { StateStore } from "../state/types.js";
import { type BindingResult, type BindingOptions } from "./types.js";
/**
 * Run the complete binding workflow from URL input to Signal Ready.
 *
 * @param options - URL, callbacks, and optional failure mode
 * @param store   - Optional StateStore for persistence
 */
export declare function runBindingWorkflow(options: BindingOptions, store?: StateStore): Promise<BindingResult>;
//# sourceMappingURL=workflow.d.ts.map