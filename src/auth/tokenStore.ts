import fs from "node:fs";
import path from "node:path";
import { ensureConfigDir, getConfigDir } from "../config.js";

export interface AccountRecord {
  refreshToken: string;
  scope: string;
  addedAt: string;
}

type AccountsFile = Record<string, AccountRecord>;

function getAccountsPath(): string {
  return path.join(getConfigDir(), "accounts.json");
}

function readAll(): AccountsFile {
  const accountsPath = getAccountsPath();
  if (!fs.existsSync(accountsPath)) return {};
  const raw = fs.readFileSync(accountsPath, "utf-8");
  return JSON.parse(raw) as AccountsFile;
}

function writeAll(accounts: AccountsFile): void {
  ensureConfigDir();
  const accountsPath = getAccountsPath();
  fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  if (process.platform !== "win32") {
    fs.chmodSync(accountsPath, 0o600);
  }
}

export function listAccounts(): Array<{ email: string; addedAt: string }> {
  const accounts = readAll();
  return Object.entries(accounts).map(([email, record]) => ({
    email,
    addedAt: record.addedAt,
  }));
}

export function getAccount(email: string): AccountRecord | undefined {
  return readAll()[email];
}

export function upsertAccount(email: string, record: AccountRecord): void {
  const accounts = readAll();
  accounts[email] = record;
  writeAll(accounts);
}

export function updateRefreshToken(email: string, refreshToken: string): void {
  const accounts = readAll();
  const existing = accounts[email];
  if (!existing) return;
  accounts[email] = { ...existing, refreshToken };
  writeAll(accounts);
}

export function isAccountConnected(email: string): boolean {
  return getAccount(email) !== undefined;
}
