import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGmailClientFor } from "../auth/gmailClientFactory.js";
import { toToolErrorResult } from "../lib/errors.js";
import { accountParam } from "./shared.js";

export function registerCreateLabel(server: McpServer): void {
  server.registerTool(
    "create_label",
    {
      title: "Create a Gmail label",
      description:
        "Create a new Gmail label. Fails with a clear message if a label with that exact name already exists.",
      inputSchema: {
        account: accountParam,
        name: z.string().min(1).describe("The label name to create, e.g. 'Receipts/2026'."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ account, name }) => {
      try {
        const gmail = getGmailClientFor(account);
        const res = await gmail.users.labels.create({
          userId: "me",
          requestBody: { name, labelListVisibility: "labelShow", messageListVisibility: "show" },
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ id: res.data.id, name: res.data.name }, null, 2) },
          ],
        };
      } catch (err) {
        const gaxios = err as { response?: { status?: number } };
        if (gaxios.response?.status === 409 || gaxios.response?.status === 400) {
          return {
            content: [
              {
                type: "text" as const,
                text: `A label named "${name}" may already exist. Use list_labels to check existing labels.`,
              },
            ],
            isError: true,
          };
        }
        return toToolErrorResult(err);
      }
    }
  );
}
