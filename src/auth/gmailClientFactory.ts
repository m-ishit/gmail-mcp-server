import { google, gmail_v1 } from "googleapis";
import { requireClientConfig } from "../config.js";
import { getAccount, updateRefreshToken } from "./tokenStore.js";

export class AccountNotConnectedError extends Error {
  constructor(email: string) {
    super(
      `Account "${email}" is not connected to this server. Run \`npm run add-account\` to connect it, ` +
        "or call list_accounts to see which accounts are currently available."
    );
    this.name = "AccountNotConnectedError";
  }
}

export function getGmailClientFor(email: string): gmail_v1.Gmail {
  const account = getAccount(email);
  if (!account) {
    throw new AccountNotConnectedError(email);
  }

  const { clientId, clientSecret } = requireClientConfig();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: account.refreshToken });

  oauth2Client.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
      updateRefreshToken(email, tokens.refresh_token);
    }
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
