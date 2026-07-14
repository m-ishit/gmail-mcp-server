import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import open from "open";
import { requireClientConfig } from "../config.js";
import { upsertAccount } from "./tokenStore.js";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

const CALLBACK_PATH = "/oauth2callback";
const PREFERRED_PORT = 51823;

function startLoopbackServer(): Promise<{ server: http.Server; port: number; waitForCode: Promise<string> }> {
  return new Promise((resolve, reject) => {
    let resolveCode: (code: string) => void;
    let rejectCode: (err: Error) => void;
    const waitForCode = new Promise<string>((res, rej) => {
      resolveCode = res;
      rejectCode = rej;
    });

    const server = http.createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404).end();
        return;
      }

      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");

      res.writeHead(200, { "Content-Type": "text/html" });
      if (error) {
        res.end(`<html><body><h2>Authorization failed: ${error}</h2>You can close this window.</body></html>`);
        rejectCode(new Error(`Google OAuth error: ${error}`));
        return;
      }
      if (!code) {
        res.end("<html><body><h2>No authorization code received.</h2>You can close this window.</body></html>");
        rejectCode(new Error("No authorization code received from Google"));
        return;
      }

      res.end("<html><body><h2>✓ Success</h2>You can close this window and return to the terminal.</body></html>");
      resolveCode(code);
    });

    const tryListen = (port: number, attemptsLeft: number) => {
      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
          tryListen(0, attemptsLeft - 1); // fall back to a random free port
          return;
        }
        reject(err);
      });
      server.listen(port, "127.0.0.1", () => {
        const address = server.address();
        const actualPort = typeof address === "object" && address ? address.port : port;
        resolve({ server, port: actualPort, waitForCode });
      });
    };

    tryListen(PREFERRED_PORT, 1);
  });
}

export async function addAccount(): Promise<string> {
  const { clientId, clientSecret } = requireClientConfig();

  const { server, port, waitForCode } = await startLoopbackServer();
  const redirectUri = `http://127.0.0.1:${port}${CALLBACK_PATH}`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("Opening your browser to authorize a Gmail account...");
  console.log(`If it doesn't open automatically, visit:\n${authUrl}\n`);
  await open(authUrl);

  try {
    const code = await waitForCode;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. This can happen if the account was already " +
          "authorized previously without revoking access. Go to https://myaccount.google.com/permissions, " +
          "remove access for this app, and try again."
      );
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;
    if (!email) {
      throw new Error("Could not determine the Gmail address for the authorized account.");
    }

    upsertAccount(email, {
      refreshToken: tokens.refresh_token,
      scope: tokens.scope ?? SCOPES.join(" "),
      addedAt: new Date().toISOString(),
    });

    return email;
  } finally {
    server.close();
  }
}
