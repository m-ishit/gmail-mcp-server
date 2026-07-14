import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { extractBody, extractAttachmentMeta, getHeader } from "../lib/gmailMime.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerGetThread(server: McpServer): void {
  server.registerTool(
    "get_thread",
    {
      title: "Get a Gmail thread",
      description:
        "Fetch a full Gmail thread by thread ID, including every message's headers and decoded body text. " +
        "Use search_threads first to find the thread ID.",
      inputSchema: {
        account: accountParam,
        threadId: z.string().describe("The Gmail thread ID, from search_threads."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ account, threadId }) => {
      try {
        const gmail = getGmailClientFor(account);
        const res = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });

        const messages = (res.data.messages ?? []).map((m) => {
          const headers = m.payload?.headers;
          const body = extractBody(m.payload ?? undefined);
          return {
            messageId: m.id,
            labelIds: m.labelIds ?? [],
            from: getHeader(headers, "From") ?? "",
            to: getHeader(headers, "To") ?? "",
            subject: getHeader(headers, "Subject") ?? "",
            date: getHeader(headers, "Date") ?? "",
            bodyText: body.text ?? "",
            bodyHtml: body.html,
            attachments: extractAttachmentMeta(m.payload ?? undefined),
          };
        });

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ threadId, messages }, null, 2) }],
        };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
