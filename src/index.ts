import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("gmail-mcp-server started");
}

main().catch((err) => {
  logger.error("Fatal error starting server", { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
