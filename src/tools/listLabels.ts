import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerListLabels(server: McpServer): void {
  server.registerTool(
    "list_labels",
    {
      title: "List Gmail labels",
      description: "List all Gmail labels (system labels like INBOX/UNREAD and user-created labels) for an account.",
      inputSchema: { account: accountParam },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ account }) => {
      try {
        const gmail = getGmailClientFor(account);
        const res = await gmail.users.labels.list({ userId: "me" });
        const labels = (res.data.labels ?? []).map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
        }));
        return { content: [{ type: "text" as const, text: JSON.stringify(labels, null, 2) }] };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
