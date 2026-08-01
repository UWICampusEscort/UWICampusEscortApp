import type { MetadataRoute } from "next";

const baseUrl =
    process.env.URL
        ? `https://${process.env.URL}`
        : "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        "",
        "/home",
        "/trips",
        "/contacts",
        "/safety",
        "/profile",
        "/support",
        "/auth/login",
        "/auth/sign-up",
    ];

    return routes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency:
            route === ""
                ? "daily"
                : "weekly",
        priority:
            route === ""
                ? 1
                : 0.8,
    }));
}