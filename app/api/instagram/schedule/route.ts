import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { uploadToWebspace, deleteFromWebspace } from "@/lib/ftp-upload";
import { fetchImageUrl, getExtension, isFile, parseCropPosition, prepareInstagramImage, type InstagramPostType } from "@/lib/instagram-media";

type ScheduledPostInsertClient = {
  from(table: "scheduled_posts"): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: { id: string; scheduled_at: string }; error: { message: string } | null }>;
      };
    };
  };
};

function parsePostType(value: FormDataEntryValue | null): InstagramPostType {
  if (value === "story" || value === "reel" || value === "carousel") return value;
  return "feed";
}

export async function POST(request: Request) {
  const uploadedFilenames: string[] = [];

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Serverseitige Planung benötigt Supabase." }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Zum Planen bitte anmelden." }, { status: 401 });
    }

    const form = await request.formData();
    const scheduledAt = typeof form.get("scheduledAt") === "string" ? String(form.get("scheduledAt")) : "";
    const scheduledTime = new Date(scheduledAt).getTime();
    if (!Number.isFinite(scheduledTime)) {
      return NextResponse.json({ error: "Ungültige Planungszeit." }, { status: 400 });
    }

    const postType = parsePostType(form.get("postType"));
    const cropPosition = parseCropPosition(form);
    const caption = typeof form.get("caption") === "string" ? String(form.get("caption")) : "";
    const projectId = typeof form.get("projectId") === "string" ? String(form.get("projectId")) : null;
    const plannedPostId = typeof form.get("plannedPostId") === "string" ? String(form.get("plannedPostId")) : null;
    const instagramAccountId = typeof form.get("instagramAccountId") === "string" ? String(form.get("instagramAccountId")) : "";
    const files = [
      ...form.getAll("images").filter(isFile),
      ...form.getAll("image").filter(isFile)
    ];
    const videos = [
      ...form.getAll("videos").filter(isFile),
      ...form.getAll("video").filter(isFile)
    ];
    const imageUrls = form.getAll("imageUrls").filter((url): url is string => typeof url === "string" && url.length > 0);
    const videoUrls = form.getAll("videoUrls").filter((url): url is string => typeof url === "string" && url.length > 0);

    if (postType !== "story" && !caption.trim()) {
      return NextResponse.json({ error: "Eine Caption fehlt." }, { status: 400 });
    }

    if (postType === "reel" && videos.length === 0 && videoUrls.length === 0) {
      return NextResponse.json({ error: "Für ein Reel ist eine MP4- oder MOV-Datei nötig." }, { status: 400 });
    }

    if (postType !== "reel" && files.length === 0 && imageUrls.length === 0) {
      return NextResponse.json({ error: "Mindestens ein Bild ist nötig." }, { status: 400 });
    }

    const publicImageUrls: string[] = [];
    const publicVideoUrls = [...videoUrls];

    for (const [index, imageUrl] of imageUrls.entries()) {
      const imageBuffer = await fetchImageUrl(imageUrl);
      const prepared = await prepareInstagramImage(imageBuffer, postType, cropPosition);
      const filename = `wf_${randomUUID()}_scheduled_remote_${index + 1}_${prepared.format.label}.jpg`;
      uploadedFilenames.push(filename);
      publicImageUrls.push(await uploadToWebspace(prepared.buffer, filename));
    }

    for (const [index, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const prepared = await prepareInstagramImage(buffer, postType, cropPosition);
      const filename = `wf_${randomUUID()}_scheduled_${index + 1}_${prepared.format.label}.jpg`;
      uploadedFilenames.push(filename);
      publicImageUrls.push(await uploadToWebspace(prepared.buffer, filename));
    }

    for (const [index, file] of videos.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `wf_${randomUUID()}_scheduled_video_${index + 1}.${getExtension(file)}`;
      uploadedFilenames.push(filename);
      publicVideoUrls.push(await uploadToWebspace(buffer, filename));
    }

    const scheduledPostClient = supabase as unknown as ScheduledPostInsertClient;
    const { data, error } = await scheduledPostClient
      .from("scheduled_posts")
      .insert({
        profile_id: auth.user.id,
        project_id: projectId,
        planned_post_id: plannedPostId,
        post_type: postType,
        caption,
        media_urls: publicImageUrls,
        video_urls: publicVideoUrls,
        uploaded_filenames: uploadedFilenames,
        instagram_account_id: instagramAccountId,
        scheduled_at: new Date(scheduledTime).toISOString(),
        status: "scheduled"
      })
      .select("id, scheduled_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ scheduled: true, id: data.id, scheduledAt: data.scheduled_at });
  } catch (error) {
    await Promise.all(uploadedFilenames.map((filename) => deleteFromWebspace(filename).catch(() => {})));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Planung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
