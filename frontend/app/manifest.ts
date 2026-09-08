import type { MetadataRoute } from "next";
import { appBrand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appBrand.name,
    short_name: appBrand.name,
    description:
      "Secure employee attendance and authorised live location tracking.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f2",
    theme_color: "#111827",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
