// FTP upload utility for WeddingFlow
// Uploads images to Tobias' World4You webspace for Instagram Graph API access

import { Client } from "basic-ftp";
import { Readable } from "stream";

function getFtpConfig() {
  const host = process.env.INSTAGRAM_MEDIA_FTP_HOST || process.env.FTP_HOST;
  const user = process.env.INSTAGRAM_MEDIA_FTP_USER || process.env.FTP_USER;
  const password = process.env.INSTAGRAM_MEDIA_FTP_PASSWORD || process.env.FTP_PASSWORD;
  const remoteDir = process.env.INSTAGRAM_MEDIA_FTP_REMOTE_DIR || process.env.FTP_REMOTE_DIR || "/img/weddingflow";
  const publicBaseUrl = process.env.INSTAGRAM_MEDIA_PUBLIC_BASE_URL || "https://bilder.besterfotografderwelt.com/weddingflow";

  if (!host || !user || !password) {
    throw new Error("FTP-Zugangsdaten fehlen. Bitte INSTAGRAM_MEDIA_FTP_HOST, INSTAGRAM_MEDIA_FTP_USER und INSTAGRAM_MEDIA_FTP_PASSWORD konfigurieren.");
  }

  return { host, user, password, remoteDir, publicBaseUrl };
}

export async function uploadToWebspace(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const client = new Client();
  const config = getFtpConfig();

  try {
    await client.access({
      host: config.host,
      user: config.user,
      password: config.password,
      secure: false
    });

    await client.ensureDir(config.remoteDir);
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, filename);

    client.close();

    return `${config.publicBaseUrl.replace(/\/$/, "")}/${filename}`;
  } catch (error) {
    client.close();
    throw error;
  }
}

export async function deleteFromWebspace(filename: string): Promise<void> {
  const client = new Client();
  const config = getFtpConfig();
  try {
    await client.access({
      host: config.host,
      user: config.user,
      password: config.password,
      secure: false
    });
    await client.remove(`${config.remoteDir}/${filename}`);
    client.close();
  } catch {
    client.close();
  }
}
