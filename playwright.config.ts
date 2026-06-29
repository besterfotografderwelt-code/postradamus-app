import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "chrome",
    headless: true
  },
  webServer: {
    command: "npm run dev -- -p 3100",
    env: {
      WEDDINGFLOW_AI_MODE: "demo",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ""
    },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000
  }
});
