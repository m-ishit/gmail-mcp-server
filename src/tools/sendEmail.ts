import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { buildRawMessage } from "../lib/gmailMime.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerSendEmail(server: McpServer): void {
  server.registerTool(
    "send_email",
    {
      title: "Send an email (irreversible)",
      description:
        "⚠️ IRREVERSIBLE: Sends a real email immediately on behalf of the user — there is no undo, no " +
        "\"are you sure\" prompt from Gmail, and no draft-review step once this is called. Only call this " +
        "tool after the human user has explicitly and unambiguously confirmed the exact recipient(s), " +
        "subject, and body of THIS specific email in the current conversation. If there is any ambiguity " +
        "about content, recipients, or intent — or if you have not shown the user the exact text you're " +
        "about to send — use create_draft instead and ask the user to review and send it themselves. " +
        "Never call this proactively, as part of a speculative multi-step plan, or based on inferred " +
        "rather than explicitly stated intent.",
      inputSchema: {
        account: accountParam,
        to: z.array(z.string().email()).min(1),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string(),
        bodyText: z.string().describe("Plain-text body."),
        bodyHtml: z.string().optional().describe("Optional HTML body, sent alongside the plain-text body."),
        threadId: z.string().optional().describe("Set to send as a reply within an existing thread."),
        confirmed: z
          .literal(true)
          .describe(
            "Must be exactly `true`. Set this only after the human user has explicitly confirmed the " +
              "recipients, subject, and body of this exact email in the current conversation."
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ account, to, cc, bcc, subject, bodyText, bodyHtml, threadId }) => {
      try {
        const gmail = getGmailClientFor(account);
        const raw = buildRawMessage({ to, cc, bcc, subject, bodyText, bodyHtml });

        const res = await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw, ...(threadId ? { threadId } : {}) },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ sent: true, messageId: res.data.id, threadId: res.data.threadId }, null, 2),
            },
          ],
        };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
