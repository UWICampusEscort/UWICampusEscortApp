import type { MetadataRoute } from "next";

const baseUrl =
    process.env.URL
        ? `https://${process.env.URL}`
        : "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/home", "/profile", "/trips", "/contacts"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}