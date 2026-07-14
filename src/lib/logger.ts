const REDACTED_KEYS = new Set([
  "refreshtoken",
  "refresh_token",
  "access_token",
  "accesstoken",
  "authorization",
  "clientsecret",
  "client_secret",
  "id_token",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val);
    }
    return out;
  }
  return value;
}

// MCP over stdio uses stdout exclusively for the JSON-RPC channel; all
// diagnostic output must go to stderr or it will corrupt the protocol stream.
function log(level: "info" | "warn" | "error", message: string, meta?: unknown): void {
  const line = meta !== undefined ? `${message} ${JSON.stringify(redact(meta))}` : message;
  process.stderr.write(`[gmail-mcp-server] [${level}] ${line}\n`);
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
};
