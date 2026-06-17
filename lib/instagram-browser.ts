// Browser-based Instagram posting for WeddingFlow
// Uses Puppeteer to log into Instagram and post directly
// FALLBACK when Instagram Graph API is not configured

type BrowserPostResult = { success: true; postUrl?: string } | { success: false; error: string };

export async function postViaBrowser(params: {
  username: string;
  password: string;
  imagePath: string;
  caption: string;
}): Promise<BrowserPostResult> {
  try {
    // Use the existing RubyLane browser tools pattern
    const response = await fetch("/api/instagram/browser-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, postUrl: data.postUrl };
    }
    return { success: false, error: data.error || "Post fehlgeschlagen" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" };
  }
}
