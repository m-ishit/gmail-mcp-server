import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ClientConfig {
  clientId: string;
  clientSecret: string;
}

export function getConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "gmail-mcp-server");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "gmail-mcp-server");
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(xdgConfig, "gmail-mcp-server");
}

export function ensureConfigDir(): string {
  const dir = getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function readClientConfig(): ClientConfig | undefined {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return undefined;
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as ClientConfig;
}

export function writeClientConfig(config: ClientConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  if (process.platform !== "win32") {
    fs.chmodSync(configPath, 0o600);
  }
}

export function requireClientConfig(): ClientConfig {
  const config = readClientConfig();
  if (!config) {
    throw new Error(
      "No OAuth client credentials found. Run `npm run setup` first to configure this server " +
        "with a Google Cloud OAuth client ID and secret (see README.md)."
    );
  }
  return config;
}
