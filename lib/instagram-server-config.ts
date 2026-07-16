import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type InstagramServerConfig = {
  accessToken: string;
  accountId: string;
  username?: string;
};

type SavedInstagramConfig = {
  accessToken?: string;
  accountId?: string;
  username?: string;
  savedAt?: string;
  refreshedAt?: string;
};

const tokenPath = join(process.cwd(), "data", "instagram-token.json");

export function loadInstagramServerConfig(): InstagramServerConfig | null {
  try {
    const envAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
    const envAccountId = process.env.INSTAGRAM_ACCOUNT_ID?.trim();
    if (envAccessToken && envAccountId) {
      return {
        accessToken: envAccessToken,
        accountId: envAccountId,
        username: process.env.INSTAGRAM_USERNAME?.trim()
      };
    }

    if (!existsSync(tokenPath)) return null;
    const data = JSON.parse(readFileSync(tokenPath, "utf8")) as SavedInstagramConfig;
    if (!data.accessToken || !data.accountId) return null;

    return {
      accessToken: data.accessToken,
      accountId: data.accountId,
      username: data.username
    };
  } catch {
    return null;
  }
}

export function saveInstagramServerConfig(config: SavedInstagramConfig) {
  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const existing = existsSync(tokenPath)
    ? JSON.parse(readFileSync(tokenPath, "utf8")) as SavedInstagramConfig
    : {};

  writeFileSync(tokenPath, JSON.stringify({ ...existing, ...config }));
}
