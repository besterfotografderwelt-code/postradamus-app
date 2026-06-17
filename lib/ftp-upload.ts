// FTP upload utility for WeddingFlow
// Uploads images to Tobias' World4You webspace for Instagram Graph API access

import { Client } from "basic-ftp";
import { Readable } from "stream";

const FTP_CONFIG = {
  host: "ftp.world4you.com",
  user: "ftp6796787",
  password: "Amy040312!?",
  remoteDir: "/img/weddingflow"
};

export async function uploadToWebspace(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const client = new Client();

  try {
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: false
    });

    await client.ensureDir(FTP_CONFIG.remoteDir);
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, filename);

    client.close();

    // Construct public URL
    return `https://bilder.besterfotografderwelt.com/weddingflow/${filename}`;
  } catch (error) {
    client.close();
    throw error;
  }
}

export async function deleteFromWebspace(filename: string): Promise<void> {
  const client = new Client();
  try {
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: false
    });
    await client.remove(`${FTP_CONFIG.remoteDir}/${filename}`);
    client.close();
  } catch {
    client.close();
  }
}
