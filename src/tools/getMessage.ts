import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { extractBody, extractAttachmentMeta, getHeader } from "../lib/gmailMime.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerGetMessage(server: McpServer): void {
  server.registerTool(
    "get_message",
    {
      title: "Get a Gmail message",
      description:
        "Fetch a single Gmail message by ID, including decoded plain-text/HTML body and attachment " +
        "metadata (filenames and sizes, not the attachment contents themselves).",
      inputSchema: {
        account: accountParam,
        messageId: z.string().describe("The Gmail message ID."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ account, messageId }) => {
      try {
        const gmail = getGmailClientFor(account);
        const res = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });

        const headers = res.data.payload?.headers;
        const body = extractBody(res.data.payload ?? undefined);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  messageId: res.data.id,
                  threadId: res.data.threadId,
                  labelIds: res.data.labelIds ?? [],
                  from: getHeader(headers, "From") ?? "",
                  to: getHeader(headers, "To") ?? "",
                  cc: getHeader(headers, "Cc"),
                  subject: getHeader(headers, "Subject") ?? "",
                  date: getHeader(headers, "Date") ?? "",
                  bodyText: body.text ?? "",
                  bodyHtml: body.html,
                  attachments: extractAttachmentMeta(res.data.payload ?? undefined),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        return toToolErrorResult(err);
      }
    }
  );
}
