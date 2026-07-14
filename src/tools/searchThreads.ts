import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { getHeader } from "../lib/gmailMime.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerSearchThreads(server: McpServer): void {
  server.registerTool(
    "search_threads",
    {
      title: "Search Gmail threads",
      description:
        "Search Gmail threads using Gmail's search syntax (e.g. `from:x@y.com is:unread newer_than:7d`, " +
        "`subject:invoice has:attachment`). Returns thread IDs with a snippet and basic metadata for each " +
        "matching thread.",
      inputSchema: {
        account: accountParam,
        query: z.string().describe("Gmail search query, using standard Gmail search operators."),
        maxResults: z.number().int().min(1).max(100).default(20),
        pageToken: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ account, query, maxResults, pageToken }) => {
      try {
        const gmail = getGmailClientFor(account);
        const listRes = await gmail.users.threads.list({
          userId: "me",
          q: query,
          maxResults,
          pageToken,
        });

        const threads = listRes.data.threads ?? [];
        const detailed = await Promise.all(
          threads.map(async (t) => {
            if (!t.id) return null;
            const threadRes = await gmail.users.threads.get({
              userId: "me",
              id: t.id,
              format: "metadata",
              metadataHeaders: ["Subject", "From", "Date"],
            });
            const firstMsg = threadRes.data.messages?.[0];
            const headers = firstMsg?.payload?.headers;
            return {
              threadId: t.id,
              snippet: t.snippet ?? firstMsg?.snippet ?? "",
              subject: getHeader(headers, "Subject") ?? "(no subject)",
              from: getHeader(headers, "From") ?? "",
              date: getHeader(headers, "Date") ?? "",
              messageCount: threadRes.data.messages?.length ?? 1,
            };
          })
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  threads: detailed.filter((t) => t !== null),
                  nextPageToken: listRes.data.nextPageToken ?? null,
                  resultSizeEstimate: listRes.data.resultSizeEstimate ?? threads.length,
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
