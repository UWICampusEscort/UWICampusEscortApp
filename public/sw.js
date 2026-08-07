const CACHE_NAME = "fst-escort-v1";
const APP_SHELL_ASSETS = [
    "/",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/favicon-192x192.png",
    "/favicon-512x512.png",
    "/apple-icon.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key)),
            ),
        ),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    return response;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request);
                    return cachedResponse ?? caches.match("/");
                }),
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const networkFetch = fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => cachedResponse);

            return cachedResponse ?? networkFetch;
        }),
    );
});

self.addEventListener("push", (event) => {
    const payload = event.data ? event.data.json() : {};
    const title = payload.title || "FST Escort";

    event.waitUntil(
        self.registration.showNotification(title, {
            body: payload.body || "You have a new update.",
            icon: payload.icon || "/favicon-192x192.png",
            badge: payload.badge || "/favicon-192x192.png",
            image: payload.image,
            tag: payload.tag,
            requireInteraction: Boolean(payload.requireInteraction),
            data: payload.data || { url: "/" },
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ("focus" in client && client.url.includes(self.location.origin)) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }

            return undefined;
        }),
    );
});