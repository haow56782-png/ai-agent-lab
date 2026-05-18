/**
 * Agent Runtime Service — wraps existing agent loop, prediction pipeline,
 * governance review-runner, and tools into a shared service layer.
 *
 * Used by both the API Server and (future) CLI refactor.
 */
import { createAgent } from "../../agent.js";
/**
 * Run the agent on a given prompt and return the result.
 *
 * This is the shared entry point for both CLI and API Server.
 * Currently wraps the existing createAgent().run() path.
 */
export async function runAgent(input) {
    const agent = createAgent({
        enableBoundaryRouting: false, // API mode — no E2/E3 gate by default
    });
    const output = await agent.run(input.prompt);
    // Try to extract a SignalOutputContract from the response
    let signal;
    try {
        const jsonMatch = output.match(/\{[\s\S]*"signal_id"[\s\S]*"domain"[\s\S]*"tool_name"[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.signal_id && parsed.domain) {
                signal = parsed;
            }
        }
    }
    catch {
        // Not all responses contain a valid signal — that's fine
    }
    return { output, signal };
}
//# sourceMappingURL=agent-runtime.service.js.map