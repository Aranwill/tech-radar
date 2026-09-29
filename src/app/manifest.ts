import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tech Radar",
    short_name: "Radar",
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
