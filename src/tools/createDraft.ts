import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { buildRawMessage } from "../lib/gmailMime.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerCreateDraft(server: McpServer): void {
  server.registerTool(
    "create_draft",
    {
      title: "Create a Gmail draft",
      description:
        "Create a draft email in the account's Drafts folder. This does NOT send anything — it's safe to " +
        "call freely, including when you're not fully sure the user wants to send yet. The user reviews " +
        "and sends the draft themselves from Gmail.",
      inputSchema: {
        account: accountParam,
        to: z.array(z.string().email()).min(1),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string(),
        bodyText: z.string().describe("Plain-text body."),
        bodyHtml: z.string().optional().describe("Optional HTML body, sent alongside the plain-text body."),
        threadId: z.string().optional().describe("Set to draft a reply within an existing thread."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ account, to, cc, bcc, subject, bodyText, bodyHtml, threadId }) => {
      try {
        const gmail = getGmailClientFor(account);
        const raw = buildRawMessage({ to, cc, bcc, subject, bodyText, bodyHtml });

        const res = await gmail.users.drafts.create({
          userId: "me",
          requestBody: {
            message: { raw, ...(threadId ? { threadId } : {}) },
          },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ draftId: res.data.id, messageId: res.data.message?.id }, null, 2),
            },
          ],
        };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
