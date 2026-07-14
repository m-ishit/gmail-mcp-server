import { getGmailClientFor } from "../src/auth/gmailClientFactory.js";
import { listAccounts } from "../src/auth/tokenStore.js";

async function main(): Promise<void> {
  const accountArgIdx = process.argv.indexOf("--account");
  const requested = accountArgIdx !== -1 ? process.argv[accountArgIdx + 1] : undefined;

  const accounts = listAccounts();
  if (accounts.length === 0) {
    console.error("No accounts connected. Run `npm run add-account` first.");
    process.exit(1);
  }

  const account = requested ?? accounts[0].email;
  console.log(`Smoke-testing account: ${account}\n`);

  const gmail = getGmailClientFor(account);

  console.log("1) list labels...");
  const labels = await gmail.users.labels.list({ userId: "me" });
  console.log(`   ✓ ${labels.data.labels?.length ?? 0} labels found`);

  console.log("2) search threads (in:inbox)...");
  const threads = await gmail.users.threads.list({ userId: "me", q: "in:inbox", maxResults: 3 });
  console.log(`   ✓ ${threads.data.threads?.length ?? 0} threads found`);

  if (threads.data.threads?.[0]?.id) {
    console.log("3) get first message of first thread...");
    const thread = await gmail.users.threads.get({
      userId: "me",
      id: threads.data.threads[0].id,
      format: "metadata",
    });
    console.log(`   ✓ thread has ${thread.data.messages?.length ?? 0} message(s)`);
  } else {
    console.log("3) skipped (no threads in inbox)");
  }

  console.log("4) create a draft to self...");
  const profile = await gmail.users.getProfile({ userId: "me" });
  const { buildRawMessage } = await import("../src/lib/gmailMime.js");
  const raw = buildRawMessage({
    to: [profile.data.emailAddress ?? account],
    subject: "gmail-mcp-server smoke test",
    bodyText: "This is a test draft created by scripts/smoke.ts. Safe to delete.",
  });
  const draft = await gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw } } });
  console.log(`   ✓ draft created: ${draft.data.id}`);

  console.log("\nAll smoke tests passed.");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
