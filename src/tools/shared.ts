import { z } from "zod";

export const accountParam = z
  .string()
  .email()
  .describe(
    "The Gmail address to operate on. Must be one of the accounts returned by list_accounts. " +
      "If you don't know which account to use, call list_accounts first and ask the user if ambiguous."
  );

export const labelIdsParam = z
  .array(z.string())
  .min(1)
  .describe("Gmail label IDs (from list_labels), e.g. ['INBOX', 'Label_12345'].");
