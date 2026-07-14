import { addAccount } from "../src/auth/addAccount.js";

async function main(): Promise<void> {
  const email = await addAccount();
  console.log(`\n✓ Connected ${email}`);
  console.log("Run `npm run add-account` again to connect another Gmail account.");
}

main().catch((err) => {
  console.error("\nFailed to add account:", err instanceof Error ? err.message : err);
  process.exit(1);
});
