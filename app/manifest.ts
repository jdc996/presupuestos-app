import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Presupuestos",
    short_name: "Presupuestos",
    description: "Controla tus gastos y presupuestos desde el móvil u ordenador.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { 
        src: "/icon-192x192.png", 
        sizes: "192x192", 
        type: "image/png",
        purpose: "any maskable"
      },
      { 
        src: "/icon-512x512.png", 
        sizes: "512x512", 
        type: "image/png",
        purpose: "any maskable"
      },
      { 
        src: "/icon-192x192.png", 
        sizes: "192x192", 
        type: "image/png"
      },
      { 
        src: "/icon-512x512.png", 
        sizes: "512x512", 
        type: "image/png"
      }
    ],
  }
}


