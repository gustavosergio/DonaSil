import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3003",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    { command: "node tests/e2e/servidor-dados.cjs", url: "http://127.0.0.1:4010", reuseExistingServer: false },
    {
      command: (process.env.DONASIL_E2E_SKIP_BUILD === "true" ? "" : "node node_modules/next/dist/bin/next build --webpack && ") + "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3003",
      url: "http://127.0.0.1:3003",
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        DONASIL_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_MODO_DEMO: "false",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4010",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave-ficticia-e2e",
        SUPABASE_SECRET_KEY: "",
        CEP_API_URL: "http://127.0.0.1:4010/ws",
      },
    },
  ],
});
