import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { uploadToWebspace, deleteFromWebspace } from "@/lib/ftp-upload";
import { fetchImageUrl, getExtension, isFile, parseCropPosition, prepareInstagramImage } from "@/lib/instagram-media";
import { postCarouselToInstagram, postReelToInstagram, postStoryToInstagram, postToInstagram } from "@/lib/instagram-api";

type PostRequestBody = {
  caption?: string;
  accessToken?: string;
  instagramAccountId?: string;
  imageUrls?: string[];
  videoUrl?: string;
  postType?: "feed" | "carousel" | "story" | "reel";
  cropPosition?: { x: number; y: number };
  testOnly?: boolean;
};

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function cleanupUploadedFiles(filenames: string[]) {
  await Promise.all(filenames.map((filename) => deleteFromWebspace(filename).catch(() => {})));
}

function loadServerInstagramConfig() {
  try {
    const tokenPath = join(process.cwd(), "data", "instagram-token.json");
    if (!existsSync(tokenPath)) return null;
    const data = JSON.parse(readFileSync(tokenPath, "utf8")) as {
      accessToken?: string;
      accountId?: string;
    };
    if (!data.accessToken || !data.accountId) return null;
    return { accessToken: data.accessToken, accountId: data.accountId };
  } catch {
    return null;
  }
}

async function readRequestBody(request: Request): Promise<{ body: PostRequestBody; files: File[]; videos: File[] }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as PostRequestBody;
    return { body, files: [], videos: [] };
  }

  const form = await request.formData();
  const images = [
    ...form.getAll("images").filter(isFile),
    ...form.getAll("image").filter(isFile)
  ];
  const videos = [
    ...form.getAll("videos").filter(isFile),
    ...form.getAll("video").filter(isFile)
  ];

  return {
    body: {
      caption: typeof form.get("caption") === "string" ? String(form.get("caption")) : undefined,
      accessToken: typeof form.get("accessToken") === "string" ? String(form.get("accessToken")) : undefined,
      instagramAccountId: typeof form.get("instagramAccountId") === "string" ? String(form.get("instagramAccountId")) : undefined,
      postType: typeof form.get("postType") === "string" ? String(form.get("postType")) as PostRequestBody["postType"] : undefined,
      cropPosition: parseCropPosition(form),
      testOnly: String(form.get("testOnly")) === "true"
    },
    files: images,
    videos
  };
}

export async function POST(request: Request) {
  const uploadedFiles: string[] = [];

  try {
    const { body, files, videos } = await readRequestBody(request);
    const caption = body.caption?.trim() ?? "";
    const postType = body.postType ?? "feed";
    const cropPosition = body.cropPosition ?? { x: 50, y: 50 };
    const serverConfig = loadServerInstagramConfig();
    const accessToken = body.accessToken?.trim() || serverConfig?.accessToken || "";
    const instagramAccountId = body.instagramAccountId?.trim() || serverConfig?.accountId || "";

    if (!accessToken || !instagramAccountId) {
      return NextResponse.json(
        { error: "Instagram-Verbindung ist unvollständig. Bitte unter Einstellungen einmal neu verbinden." },
        { status: 400 }
      );
    }

    if (body.testOnly) {
      return NextResponse.json({ ok: true });
    }

    // Silently attempt token refresh before posting
    let activeToken = accessToken;
    try {
      const origin = request.headers.get("origin") || "http://localhost:3000";
      const refreshRes = await fetch(`${origin}/api/instagram/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken })
      });
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.accessToken) {
        activeToken = refreshData.accessToken;
      }
    } catch { /* keep current token */ }

    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter(Boolean) : [];
    const videoUrls = [body.videoUrl].filter((url): url is string => Boolean(url));

    if (!caption && postType !== "story") {
      return NextResponse.json({ error: "Eine Caption fehlt." }, { status: 400 });
    }

    if (postType === "reel" && videos.length === 0 && videoUrls.length === 0) {
      return NextResponse.json({ error: "Für ein Reel ist eine MP4- oder MOV-Datei nötig." }, { status: 400 });
    }

    if (postType !== "reel" && files.length === 0 && imageUrls.length === 0) {
      return NextResponse.json({ error: "Mindestens ein Bild ist nötig." }, { status: 400 });
    }

    const publicUrls: string[] = [];
    const publicVideoUrls: string[] = [];

    if (videoUrls.length > 0) {
      publicVideoUrls.push(...videoUrls);
    }

    for (const [index, imageUrl] of imageUrls.entries()) {
      const imageBuffer = await fetchImageUrl(imageUrl);
      const prepared = await prepareInstagramImage(imageBuffer, postType, cropPosition);
      const filename = `wf_${randomUUID()}_remote_${index + 1}_${prepared.format.label}.jpg`;
      uploadedFiles.push(filename);
      const publicUrl = await uploadToWebspace(prepared.buffer, filename);
      publicUrls.push(publicUrl);
    }

    for (const [index, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const prepared = await prepareInstagramImage(buffer, postType, cropPosition);
      const filename = `wf_${randomUUID()}_${index + 1}_${prepared.format.label}.jpg`;
      uploadedFiles.push(filename);
      const publicUrl = await uploadToWebspace(prepared.buffer, filename);
      publicUrls.push(publicUrl);
    }

    for (const [index, file] of videos.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `wf_${randomUUID()}_video_${index + 1}.${getExtension(file)}`;
      uploadedFiles.push(filename);
      const publicUrl = await uploadToWebspace(buffer, filename);
      publicVideoUrls.push(publicUrl);
    }

    if (postType === "story") {
      const mediaIds: string[] = [];
      for (const url of publicUrls) {
        const result = await postStoryToInstagram({
          mediaUrl: url,
          mediaKind: "image",
          accessToken: activeToken,
          instagramAccountId
        });
        if (!result.success) throw new Error(result.error);
        mediaIds.push(result.mediaId);
      }
      await cleanupUploadedFiles(uploadedFiles);
      uploadedFiles.length = 0;
      return NextResponse.json({ mediaIds, postedCount: mediaIds.length, postBatches: mediaIds.length });
    }

    if (postType === "reel") {
      const result = await postReelToInstagram({
        videoUrl: publicVideoUrls[0],
        caption,
        accessToken: activeToken,
        instagramAccountId
      });
      if (!result.success) throw new Error(result.error);
      await cleanupUploadedFiles(uploadedFiles);
      uploadedFiles.length = 0;
      return NextResponse.json({ mediaIds: [result.mediaId], postedCount: 1, postBatches: 1 });
    }

    const batches = chunk(publicUrls, 10);
    const mediaIds: string[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchCaption =
        batches.length > 1 ? `${caption}\n\nTeil ${batchIndex + 1}/${batches.length}` : caption;

      const result =
        batch.length > 1
          ? await postCarouselToInstagram({
              imageUrls: batch,
              caption: batchCaption,
              accessToken: activeToken,
              instagramAccountId
            })
          : await postToInstagram({
              imageUrl: batch[0],
              caption: batchCaption,
              accessToken: activeToken,
              instagramAccountId
            });

      if (!result.success) {
        // Detect expired token
        if (result.error?.includes("expired") || result.error?.includes("Session")) {
          throw new Error(
            "Deine Instagram-Verbindung ist abgelaufen. " +
            "Gehe zu Einstellungen → »Mit Instagram verbinden« um sie zu erneuern."
          );
        }
        throw new Error(result.error);
      }

      mediaIds.push(result.mediaId);
    }

    await cleanupUploadedFiles(uploadedFiles);
    uploadedFiles.length = 0;

    return NextResponse.json({
      mediaIds,
      postedCount: publicUrls.length,
      postBatches: batches.length
    });
  } catch (error) {
    await cleanupUploadedFiles(uploadedFiles);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 500 }
    );
  }
}
