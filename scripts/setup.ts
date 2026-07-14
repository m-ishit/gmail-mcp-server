import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { writeClientConfig, getConfigDir } from "../src/config.js";

async function main(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log("Gmail MCP server setup");
  console.log("=======================");
  console.log(
    "Enter the OAuth 2.0 Desktop app client ID and secret from your Google Cloud project.\n" +
      "(Google Cloud Console > APIs & Services > Credentials > Create Credentials > OAuth client ID > Desktop app)\n"
  );

  const clientId = (await rl.question("Client ID: ")).trim();
  const clientSecret = (await rl.question("Client Secret: ")).trim();
  rl.close();

  if (!clientId || !clientSecret) {
    console.error("\nBoth client ID and client secret are required. Aborting.");
    process.exit(1);
  }

  writeClientConfig({ clientId, clientSecret });
  console.log(`\n✓ Saved credentials to ${getConfigDir()}`);
  console.log("Next: run `npm run add-account` to connect a Gmail account.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
