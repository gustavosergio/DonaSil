import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  /* Permite ao servidor de DESENVOLVIMENTO aceitar requisições do
     iPhone na rede Wi-Fi local (o Safari envia a origem
     http://192.168.0.106:3000 ao conectar o Fast Refresh em
     /_next/hmr; sem esta lista o Next dev responde 403 e a página
     recarrega em loop). Só vale para `npm run dev` — produção não
     é afetada. Se o IP do computador mudar (DHCP do roteador),
     atualize o valor aqui. */
  allowedDevOrigins: ["192.168.0.106"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
