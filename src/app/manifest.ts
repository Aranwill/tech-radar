import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dalil",
    short_name: "Dalil",
    description: "Radar de inteligencia tecnológica con fuentes trazables.",
    start_url: "/",
    display: "standalone",
    background_color: "#050b14",
    theme_color: "#050b14",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
