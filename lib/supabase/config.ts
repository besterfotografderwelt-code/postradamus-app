const missingConfigMessage =
  "Supabase ist nicht konfiguriert. URL oder Publishable Key fehlen.";

function getPublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getPublicKey());
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getPublicKey();

  if (!url || !publicKey) {
    throw new Error(missingConfigMessage);
  }

  return { url, publicKey };
}
