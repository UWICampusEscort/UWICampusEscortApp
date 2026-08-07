import type { MetadataRoute } from "next";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description:
            "Safe, reliable, and convenient campus escort services for students at The University of the West Indies, Mona.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#0f172a",
        categories: ["education", "safety", "transportation"],
        icons: [
            {
                src: "/favicon-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/favicon-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
            {
                src: "/apple-icon.png",
                sizes: "180x180",
                type: "image/png",
            },
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
        ],
    };
}