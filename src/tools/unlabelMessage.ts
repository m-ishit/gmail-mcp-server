import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam, labelIdsParam } from "./shared.js";

export function registerUnlabelMessage(server: McpServer): void {
  server.registerTool(
    "unlabel_message",
    {
      title: "Remove labels from a message",
      description: "Remove one or more labels from a single Gmail message.",
      inputSchema: {
        account: accountParam,
        messageId: z.string().describe("The Gmail message ID."),
        labelIds: labelIdsParam,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ account, messageId, labelIds }) => {
      try {
        const gmail = getGmailClientFor(account);
        const res = await gmail.users.messages.modify({
          userId: "me",
          id: messageId,
          requestBody: { removeLabelIds: labelIds },
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ messageId, labelIds: res.data.labelIds }, null, 2) },
          ],
        };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
