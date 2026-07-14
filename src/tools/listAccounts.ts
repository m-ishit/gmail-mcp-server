import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listAccounts as listAccountsFromStore } from "../auth/tokenStore.js";
import { toToolErrorResult } from "../lib/errors.js";

export function registerListAccounts(server: McpServer): void {
  server.registerTool(
    "list_accounts",
    {
      title: "List connected Gmail accounts",
      description:
        "List all Gmail accounts currently connected to this server. Call this first whenever it's " +
        "unclear which account a request should use, and ask the user to clarify if more than one " +
        "account could match.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const accounts = listAccountsFromStore();
        if (accounts.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No Gmail accounts are connected yet. Run `npm run add-account` in the gmail-mcp-server project to connect one.",
              },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(accounts, null, 2) }],
        };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
