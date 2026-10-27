import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Os testes de navegador compilam em pasta própria, sem substituir o build final.
  distDir: process.env.DONASIL_DIST_DIR || ".next",
  poweredByHeader: false,
  compress: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
  // SSR evita as respostas PPR incompatíveis com este pacote Workers.
  cacheComponents: false,
  partialPrefetching: false,
  /* Permite ao servidor de DESENVOLVIMENTO aceitar requisições do
     iPhone na rede Wi-Fi local (o Safari envia a origem
     http://192.168.0.106:3000 ao conectar o Fast Refresh em
     /_next/hmr; sem esta lista o Next dev responde 403 e a página
     recarrega em loop). Só vale para `npm run dev` — produção não
     é afetada. Se o IP do computador mudar (DHCP do roteador),
     atualize o valor aqui. */
  allowedDevOrigins: ["192.168.0.106"],
};

export default nextConfig;
