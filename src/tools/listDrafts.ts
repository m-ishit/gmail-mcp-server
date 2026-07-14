import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { getHeader } from "../lib/gmailMime.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerListDrafts(server: McpServer): void {
  server.registerTool(
    "list_drafts",
    {
      title: "List Gmail drafts",
      description: "List existing drafts for an account, with basic metadata (subject, recipient, snippet).",
      inputSchema: {
        account: accountParam,
        maxResults: z.number().int().min(1).max(100).default(20),
        pageToken: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ account, maxResults, pageToken }) => {
      try {
        const gmail = getGmailClientFor(account);
        const listRes = await gmail.users.drafts.list({ userId: "me", maxResults, pageToken });
        const drafts = listRes.data.drafts ?? [];

        const detailed = await Promise.all(
          drafts.map(async (d) => {
            if (!d.id) return null;
            const draftRes = await gmail.users.drafts.get({ userId: "me", id: d.id, format: "metadata" });
            const headers = draftRes.data.message?.payload?.headers;
            return {
              draftId: d.id,
              messageId: draftRes.data.message?.id,
              to: getHeader(headers, "To") ?? "",
              subject: getHeader(headers, "Subject") ?? "(no subject)",
              snippet: draftRes.data.message?.snippet ?? "",
            };
          })
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { drafts: detailed.filter((d) => d !== null), nextPageToken: listRes.data.nextPageToken ?? null },
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
