import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dalil",
    short_name: "Dalil",
    description: "Dalil · Inteligencia tecnológica con fuentes trazables.",
    start_url: "/",
    display: "standalone",
    background_color: "#000612",
    theme_color: "#000612",
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
