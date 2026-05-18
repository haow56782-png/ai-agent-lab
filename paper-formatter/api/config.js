const DEFAULT_EXECUTION_MODEL = "DeepSeek v4";
const DEFAULT_MODEL_PROVIDER = "deepseek";
const DEFAULT_EXECUTION_PERMISSION_MODE = "default";
function readConfig(key, fallback) {
    const value = process.env[key]?.trim();
    return value && value.length > 0 ? value : fallback;
}
export const runtimeConfig = {
    defaultExecutionModel: readConfig("DEFAULT_EXECUTION_MODEL", DEFAULT_EXECUTION_MODEL),
    defaultModelProvider: readConfig("DEFAULT_MODEL_PROVIDER", DEFAULT_MODEL_PROVIDER),
    defaultExecutionPermissionMode: readConfig("DEFAULT_EXECUTION_PERMISSION_MODE", DEFAULT_EXECUTION_PERMISSION_MODE),
};
