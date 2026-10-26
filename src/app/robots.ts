import type { MetadataRoute } from "next";
import { MODO_DEMO } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: MODO_DEMO
      ? { userAgent: "*", disallow: "/" }
      : {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/api", "/sacola", "/finalizar"],
        },
  };
}
