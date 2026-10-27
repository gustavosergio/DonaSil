import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// O catálogo usa no-store: preço e estoque permanecem consultas atuais.
// Somente os resultados estáticos do build usam este cache de leitura.
// Dispensa R2, D1 e Durable Objects no lançamento.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: false,
});
