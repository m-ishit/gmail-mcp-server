import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam, labelIdsParam } from "./shared.js";

export function registerLabelMessage(server: McpServer): void {
  server.registerTool(
    "label_message",
    {
      title: "Apply labels to a message",
      description: "Apply one or more existing labels to a single Gmail message. Label IDs come from list_labels.",
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
          requestBody: { addLabelIds: labelIds },
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
