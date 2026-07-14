import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam, labelIdsParam } from "./shared.js";

export function registerLabelThread(server: McpServer): void {
  server.registerTool(
    "label_thread",
    {
      title: "Apply labels to a thread",
      description:
        "Apply one or more existing labels to every message in a Gmail thread. Label IDs come from list_labels.",
      inputSchema: {
        account: accountParam,
        threadId: z.string().describe("The Gmail thread ID."),
        labelIds: labelIdsParam,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ account, threadId, labelIds }) => {
      try {
        const gmail = getGmailClientFor(account);
        const res = await gmail.users.threads.modify({
          userId: "me",
          id: threadId,
          requestBody: { addLabelIds: labelIds },
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ threadId, messageCount: res.data.messages?.length ?? 0 }, null, 2),
            },
          ],
        };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
