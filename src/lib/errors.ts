import { logger } from "./logger.js";

interface GaxiosLikeError {
  response?: {
    status?: number;
    data?: { error?: { message?: string; status?: string } };
  };
  message?: string;
  code?: number | string;
}

function isGaxiosLikeError(err: unknown): err is GaxiosLikeError {
  return typeof err === "object" && err !== null && ("response" in err || "code" in err);
}

export function describeError(err: unknown): string {
  if (isGaxiosLikeError(err)) {
    const status = err.response?.status ?? err.code;
    const apiMessage = err.response?.data?.error?.message;
    if (status === 401 || status === 403) {
      return (
        `Gmail API authorization error (${status}): ${apiMessage ?? err.message ?? "access denied"}. ` +
        "The account may need to be reconnected — run `npm run add-account` again for this address."
      );
    }
    if (status === 429) {
      return "Gmail API rate limit exceeded (429). Please wait a moment and try again.";
    }
    if (status === 404) {
      return `Not found (404): ${apiMessage ?? err.message ?? "the requested resource does not exist"}.`;
    }
    if (apiMessage) {
      return `Gmail API error${status ? ` (${status})` : ""}: ${apiMessage}`;
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export interface ToolErrorResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError: true;
}

export function toToolErrorResult(err: unknown): ToolErrorResult {
  const message = describeError(err);
  logger.error("Tool call failed", { message });
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
