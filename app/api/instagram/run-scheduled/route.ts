import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteFromWebspace } from "@/lib/ftp-upload";
import { loadInstagramServerConfig } from "@/lib/instagram-server-config";
import { postCarouselToInstagram, postReelToInstagram, postStoryToInstagram, postToInstagram } from "@/lib/instagram-api";

type ScheduledPost = {
  id: string;
  post_type: "feed" | "carousel" | "story" | "reel";
  caption: string;
  media_urls: string[];
  video_urls: string[];
  uploaded_filenames: string[];
  instagram_account_id: string;
  attempts: number;
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret;
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );
}

async function publishScheduledPost(post: ScheduledPost, accessToken: string, fallbackAccountId: string) {
  const instagramAccountId = post.instagram_account_id || fallbackAccountId;
  if (!instagramAccountId) throw new Error("Instagram Account ID fehlt.");

  if (post.post_type === "story") {
    const mediaIds: string[] = [];
    for (const mediaUrl of post.media_urls) {
      const result = await postStoryToInstagram({
        mediaUrl,
        mediaKind: "image",
        accessToken,
        instagramAccountId
      });
      if (!result.success) throw new Error(result.error);
      mediaIds.push(result.mediaId);
    }
    return mediaIds;
  }

  if (post.post_type === "reel") {
    const result = await postReelToInstagram({
      videoUrl: post.video_urls[0],
      caption: post.caption,
      accessToken,
      instagramAccountId
    });
    if (!result.success) throw new Error(result.error);
    return [result.mediaId];
  }

  const result = post.media_urls.length > 1
    ? await postCarouselToInstagram({
        imageUrls: post.media_urls,
        caption: post.caption,
        accessToken,
        instagramAccountId
      })
    : await postToInstagram({
        imageUrl: post.media_urls[0],
        caption: post.caption,
        accessToken,
        instagramAccountId
      });

  if (!result.success) throw new Error(result.error);
  return [result.mediaId];
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = loadInstagramServerConfig();
  if (!config) {
    return NextResponse.json({ error: "Instagram-Serververbindung fehlt." }, { status: 500 });
  }

  const supabase = supabaseAdmin();
  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ id: string; status: "published" | "failed"; error?: string }> = [];

  for (const post of (posts ?? []) as ScheduledPost[]) {
    await supabase
      .from("scheduled_posts")
      .update({ status: "processing", attempts: post.attempts + 1, last_error: null })
      .eq("id", post.id)
      .eq("status", "scheduled");

    try {
      const mediaIds = await publishScheduledPost(post, config.accessToken, config.accountId);
      await supabase
        .from("scheduled_posts")
        .update({ status: "published", published_media_ids: mediaIds, last_error: null })
        .eq("id", post.id);
      await Promise.all(post.uploaded_filenames.map((filename) => deleteFromWebspace(filename).catch(() => {})));
      results.push({ id: post.id, status: "published" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
      const nextStatus = post.attempts + 1 >= 3 ? "failed" : "scheduled";
      await supabase
        .from("scheduled_posts")
        .update({ status: nextStatus, last_error: message })
        .eq("id", post.id);
      results.push({ id: post.id, status: "failed", error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
