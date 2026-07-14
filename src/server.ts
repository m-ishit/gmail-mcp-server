import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListAccounts } from "./tools/listAccounts.js";
import { registerSearchThreads } from "./tools/searchThreads.js";
import { registerGetThread } from "./tools/getThread.js";
import { registerGetMessage } from "./tools/getMessage.js";
import { registerListLabels } from "./tools/listLabels.js";
import { registerCreateLabel } from "./tools/createLabel.js";
import { registerLabelMessage } from "./tools/labelMessage.js";
import { registerLabelThread } from "./tools/labelThread.js";
import { registerUnlabelMessage } from "./tools/unlabelMessage.js";
import { registerUnlabelThread } from "./tools/unlabelThread.js";
import { registerCreateDraft } from "./tools/createDraft.js";
import { registerListDrafts } from "./tools/listDrafts.js";
import { registerSendEmail } from "./tools/sendEmail.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "gmail-mcp-server",
    version: "1.0.0",
  });

  registerListAccounts(server);
  registerSearchThreads(server);
  registerGetThread(server);
  registerGetMessage(server);
  registerListLabels(server);
  registerCreateLabel(server);
  registerLabelMessage(server);
  registerLabelThread(server);
  registerUnlabelMessage(server);
  registerUnlabelThread(server);
  registerCreateDraft(server);
  registerListDrafts(server);
  registerSendEmail(server);

  return server;
}
