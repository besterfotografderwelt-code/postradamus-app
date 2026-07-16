import { graphApiUrl } from "@/lib/app-config";

// Instagram Graph API posting for WeddingFlow
// Posts directly to Instagram Business/Creator accounts

type InstagramPostResult = { success: true; mediaId: string } | { success: false; error: string };

async function publishContainer(params: {
  containerId: string;
  accessToken: string;
  instagramAccountId: string;
}): Promise<InstagramPostResult> {
  const publishUrl = new URL(graphApiUrl(`/${params.instagramAccountId}/media_publish`));
  publishUrl.searchParams.set("creation_id", params.containerId);
  publishUrl.searchParams.set("access_token", params.accessToken);

  const publishRes = await fetch(publishUrl.toString(), { method: "POST" });
  const publishData = await publishRes.json();

  if (!publishRes.ok || !publishData.id) {
    return { success: false, error: publishData.error?.message || "Veröffentlichung fehlgeschlagen." };
  }

  return { success: true, mediaId: publishData.id };
}

async function waitForContainer(params: {
  containerId: string;
  accessToken: string;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<{ ready: true } | { ready: false; error: string }> {
  const attempts = params.maxAttempts ?? 12;
  const delayMs = params.delayMs ?? 5000;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const statusUrl = new URL(graphApiUrl(`/${params.containerId}`));
    statusUrl.searchParams.set("fields", "status_code");
    statusUrl.searchParams.set("access_token", params.accessToken);

    const statusRes = await fetch(statusUrl.toString());
    const statusData = await statusRes.json();
    const status = statusData.status_code;

    if (!statusRes.ok) {
      return { ready: false, error: statusData.error?.message || "Verarbeitungsstatus konnte nicht gelesen werden." };
    }

    if (status === "FINISHED" || status === "PUBLISHED") return { ready: true };
    if (status === "ERROR" || status === "EXPIRED") {
      return { ready: false, error: `Instagram konnte das Medium nicht verarbeiten (${status}).` };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { ready: false, error: "Instagram verarbeitet das Medium noch. Bitte später erneut versuchen." };
}

/**
 * Post a single image to Instagram via Graph API.
 * Requires a Facebook App access token and Instagram Business Account ID.
 */
export async function postToInstagram(params: {
  imageUrl: string;
  caption: string;
  accessToken: string;
  instagramAccountId: string;
}): Promise<InstagramPostResult> {
  try {
    // Step 1: Create media container
    const createUrl = new URL(graphApiUrl(`/${params.instagramAccountId}/media`));
    createUrl.searchParams.set("image_url", params.imageUrl);
    createUrl.searchParams.set("caption", params.caption);
    createUrl.searchParams.set("access_token", params.accessToken);

    const createRes = await fetch(createUrl.toString(), { method: "POST" });
    const createData = await createRes.json();

    if (!createRes.ok || !createData.id) {
      return { success: false, error: createData.error?.message || "Medien-Container konnte nicht erstellt werden." };
    }

    return publishContainer({
      containerId: createData.id,
      accessToken: params.accessToken,
      instagramAccountId: params.instagramAccountId
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler." };
  }
}

/**
 * Post a carousel (multiple images) to Instagram via Graph API.
 */
export async function postCarouselToInstagram(params: {
  imageUrls: string[];
  caption: string;
  accessToken: string;
  instagramAccountId: string;
}): Promise<InstagramPostResult> {
  try {
    if (params.imageUrls.length < 2) {
      return postToInstagram({
        imageUrl: params.imageUrls[0],
        caption: params.caption,
        accessToken: params.accessToken,
        instagramAccountId: params.instagramAccountId
      });
    }

    // Create containers for each image
    const containerIds: string[] = [];
    for (const imageUrl of params.imageUrls) {
      const url = new URL(graphApiUrl(`/${params.instagramAccountId}/media`));
      url.searchParams.set("image_url", imageUrl);
      url.searchParams.set("is_carousel_item", "true");
      url.searchParams.set("access_token", params.accessToken);

      const res = await fetch(url.toString(), { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.id) {
        return { success: false, error: `Carousel-Bild konnte nicht erstellt werden: ${data.error?.message}` };
      }
      containerIds.push(data.id);
    }

    // Create carousel container
    const carouselUrl = new URL(graphApiUrl(`/${params.instagramAccountId}/media`));
    carouselUrl.searchParams.set("media_type", "CAROUSEL");
    carouselUrl.searchParams.set("caption", params.caption);
    carouselUrl.searchParams.set("children", containerIds.join(","));
    carouselUrl.searchParams.set("access_token", params.accessToken);

    const carouselRes = await fetch(carouselUrl.toString(), { method: "POST" });
    const carouselData = await carouselRes.json();
    if (!carouselRes.ok || !carouselData.id) {
      return { success: false, error: carouselData.error?.message || "Carousel-Container konnte nicht erstellt werden." };
    }

    return publishContainer({
      containerId: carouselData.id,
      accessToken: params.accessToken,
      instagramAccountId: params.instagramAccountId
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler." };
  }
}

export async function postStoryToInstagram(params: {
  mediaUrl: string;
  mediaKind: "image" | "video";
  accessToken: string;
  instagramAccountId: string;
}): Promise<InstagramPostResult> {
  try {
    const createUrl = new URL(graphApiUrl(`/${params.instagramAccountId}/media`));
    createUrl.searchParams.set("media_type", "STORIES");
    createUrl.searchParams.set(params.mediaKind === "video" ? "video_url" : "image_url", params.mediaUrl);
    createUrl.searchParams.set("access_token", params.accessToken);

    const createRes = await fetch(createUrl.toString(), { method: "POST" });
    const createData = await createRes.json();

    if (!createRes.ok || !createData.id) {
      return { success: false, error: createData.error?.message || "Story-Container konnte nicht erstellt werden." };
    }

    if (params.mediaKind === "video") {
      const status = await waitForContainer({ containerId: createData.id, accessToken: params.accessToken });
      if (!status.ready) return { success: false, error: status.error };
    }

    return publishContainer({
      containerId: createData.id,
      accessToken: params.accessToken,
      instagramAccountId: params.instagramAccountId
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler." };
  }
}

export async function postReelToInstagram(params: {
  videoUrl: string;
  caption: string;
  accessToken: string;
  instagramAccountId: string;
  shareToFeed?: boolean;
}): Promise<InstagramPostResult> {
  try {
    const createUrl = new URL(graphApiUrl(`/${params.instagramAccountId}/media`));
    createUrl.searchParams.set("media_type", "REELS");
    createUrl.searchParams.set("video_url", params.videoUrl);
    createUrl.searchParams.set("caption", params.caption);
    createUrl.searchParams.set("share_to_feed", params.shareToFeed === false ? "false" : "true");
    createUrl.searchParams.set("access_token", params.accessToken);

    const createRes = await fetch(createUrl.toString(), { method: "POST" });
    const createData = await createRes.json();

    if (!createRes.ok || !createData.id) {
      return { success: false, error: createData.error?.message || "Reel-Container konnte nicht erstellt werden." };
    }

    const status = await waitForContainer({ containerId: createData.id, accessToken: params.accessToken });
    if (!status.ready) return { success: false, error: status.error };

    return publishContainer({
      containerId: createData.id,
      accessToken: params.accessToken,
      instagramAccountId: params.instagramAccountId
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler." };
  }
}
