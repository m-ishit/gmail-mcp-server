# gmail-mcp-server

A local MCP (Model Context Protocol) server that connects **multiple Gmail accounts**
to Claude Desktop. Unlike Anthropic's built-in Gmail connector (which only supports one
account), every tool call here takes an `account` parameter so Claude can work across
several mailboxes in the same conversation.

Runs entirely on your own machine — no cloud hosting, no data leaves your computer except
direct calls to the Gmail API over HTTPS.

Works on macOS and Windows.

## Tools provided

- `list_accounts` — list connected Gmail accounts
- `search_threads`, `get_thread`, `get_message` — read-only search/read
- `list_labels`, `create_label`, `label_message`, `label_thread`, `unlabel_message`, `unlabel_thread`
- `create_draft`, `list_drafts` — safe, does not send anything
- `send_email` — **irreversible**, sends immediately. The tool description instructs
  Claude to only use this after you've explicitly confirmed the recipients/subject/body,
  and it requires a `confirmed: true` field. Review what Claude is about to send before
  approving the tool call.

## One-time setup

### 1. Create a Google Cloud OAuth client (do this once, shared by all accounts/teammates)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project
   (or use an existing one).
2. **APIs & Services > Library** — search for and enable the **Gmail API**.
3. **APIs & Services > OAuth consent screen** (called **Audience** in newer Console layouts):
   - User type / Audience: **External** (if your Google Cloud project belongs to a Google
     Workspace org, it may default to **Internal**, which blocks personal @gmail.com
     accounts with `Error 403: org_internal` — switch it to External).
   - Publishing status: **Production** — do **not** leave it in Testing. Testing-status
     unverified apps have a Google policy quirk where refresh tokens expire after 7 days,
     which would silently break every connected account weekly. Production status
     (even without going through Google's verification review) doesn't have that limit.
   - Tradeoff: since the app won't be verified by Google, everyone who runs
     `npm run add-account` will see a "Google hasn't verified this app" warning during
     sign-in. Click **Advanced > Go to \<project name\> (unsafe)** to proceed — this is
     expected and safe since it's your own app talking to your own Google account.
4. **APIs & Services > Credentials > Create Credentials > OAuth client ID**:
   - Application type: **Desktop app**
   - Note the generated **Client ID** and **Client Secret** — you'll enter these in step 3 below.

Share the Client ID/Secret with your teammate out-of-band (password manager, not Slack/email
in plaintext, and never commit them to git). Both of you use the *same* client ID/secret;
each person still does their own separate Google sign-in per account.

### 2. Install and build

Requires [Node.js](https://nodejs.org/) 18 or later.

```bash
git clone git@github.com:m-ishit/gmail-mcp-server.git
cd gmail-mcp-server
npm install
npm run build
```

### 3. Configure the OAuth client credentials

```bash
npm run setup
```

Paste in the Client ID and Client Secret from step 1. This writes them to a local config
file outside the repo (see **Where things are stored** below) — never committed to git.

### 4. Connect your Gmail account(s)

```bash
npm run add-account
```

This opens your browser to Google's consent screen. Sign in and approve access. Repeat
this command once for **each** Gmail address you want to connect (personal, work, etc.).

Run `npm run add-account` again at any time to add another account or to re-authorize one
whose access was revoked.

### 5. Register the server in Claude Desktop

Edit your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add (merge with any existing `mcpServers` entries):

**macOS:**
```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/absolute/path/to/gmail-mcp-server/dist/src/index.js"]
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["C:/absolute/path/to/gmail-mcp-server/dist/src/index.js"]
    }
  }
}
```

Use the absolute path to *your* clone of this repo. Forward slashes work fine in these
args on Windows too.

Fully quit and reopen Claude Desktop (not just close the window) so it picks up the new
server.

### 6. Try it

In a Claude Desktop conversation:

> "List my connected Gmail accounts"

> "Search my alice@gmail.com inbox for unread emails from the last week"

## For a second machine / teammate (e.g. Windows)

Repeat steps 2–6 above on their machine:
- Same Client ID/Secret from step 1 (shared with them securely).
- They run `npm run add-account` for *their own* Gmail addresses — this creates their own
  local tokens, separate from yours.
- They edit their own `claude_desktop_config.json` with their own path to `dist/src/index.js`.

No account credentials or tokens are ever shared between machines — only the OAuth client
ID/secret (which identifies the *application*, not any individual user).

## Where things are stored

All secrets live outside this repo, under your OS's application-data directory:

- macOS: `~/Library/Application Support/gmail-mcp-server/`
- Windows: `%APPDATA%\gmail-mcp-server\`
- Linux: `$XDG_CONFIG_HOME/gmail-mcp-server/` (or `~/.config/gmail-mcp-server/`)

Two files:
- `config.json` — your OAuth client ID/secret
- `accounts.json` — one refresh token per connected Gmail address (never the access token,
  which is short-lived and re-derived automatically on each call)

On macOS/Linux these files are written with `chmod 600` (owner read/write only). On
Windows, protection instead relies on the file living under your own Windows user profile
(`%APPDATA%`), which other local user accounts can't read by default — this is a different
protection model than POSIX permissions, not a strict equivalent.

**Never commit `dist/`, `node_modules/`, or any copy of these config files to git.**

## Security notes

- Requested Gmail scopes are `gmail.modify` (read/search/labels/drafts) and `gmail.send`
  — not the broader full-mailbox-access scope, and never permanent-delete access.
- Tokens are never printed to logs; the logger redacts token-shaped fields and only ever
  writes to stderr (stdout is reserved for the MCP protocol channel).
- `send_email` is irreversible. Read its tool description in the tools list, and always
  check the recipients/subject/body Claude shows you before approving that specific tool
  call.
- If you ever suspect a token has leaked, revoke access at
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and run
  `npm run add-account` again to re-authorize.

## Troubleshooting

- **"No OAuth client credentials found"** — run `npm run setup` first.
- **"Account is not connected to this server"** — run `npm run add-account` for that address.
- **Google didn't return a refresh token** — go to
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions), remove
  this app's access for that account, and run `npm run add-account` again (the consent
  screen forces re-issuing a refresh token).
- **Tool calls fail with a 401/403** — the account's access may have been revoked;
  reconnect it with `npm run add-account`.
- Use `npm run inspect` to open the [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
  and manually exercise each tool without needing Claude Desktop running.

## Contributing

Issues and pull requests are welcome. This is a small, focused tool — please open an issue
to discuss significant changes before submitting a large PR.

If you fork this to run your own instance, provision your own Google Cloud OAuth client
rather than reusing anyone else's (see **One-time setup** above) — client secrets for
Desktop-app OAuth clients aren't meant to be shared across unrelated users/orgs.

## License

[MIT](LICENSE)
