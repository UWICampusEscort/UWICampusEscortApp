import type { PushNotificationPayload, StoredPushSubscription } from "@/lib/push/types";

const SERVICE_WORKER_URL = "/sw.js";

function decodeBase64PublicKey(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(normalized);

    return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

function toStoredPushSubscription(subscription: PushSubscription): StoredPushSubscription {
    const json = subscription.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;

    if (!json.endpoint || !p256dh || !auth) {
        throw new Error("Push subscription is missing required keys.");
    }

    return {
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: {
            p256dh,
            auth,
        },
    };
}

async function readJsonOrThrow(response: Response) {
    if (response.ok) {
        return response;
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Push request failed.");
}

export function isPushNotificationsSupported() {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

export function getNotificationPermission(): NotificationPermission {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "default";
    }

    return Notification.permission;
}

export async function registerPushServiceWorker() {
    return navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
}

export async function getExistingPushSubscription(registration?: ServiceWorkerRegistration) {
    const serviceWorkerRegistration = registration ?? (await navigator.serviceWorker.ready);
    return serviceWorkerRegistration.pushManager.getSubscription();
}

export async function subscribeToPushService(
    registration: ServiceWorkerRegistration,
    publicKey: string,
) {
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
        return existingSubscription;
    }

    return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64PublicKey(publicKey),
    });
}

export async function savePushSubscription(subscription: PushSubscription) {
    const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(toStoredPushSubscription(subscription)),
    });

    await readJsonOrThrow(response);
}

export async function deleteStoredPushSubscription(endpoint: string) {
    const response = await fetch("/api/push/subscription", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint }),
    });

    await readJsonOrThrow(response);
}

export async function sendSelfPushNotification(payload: PushNotificationPayload) {
    const response = await fetch("/api/push/self-notify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    await readJsonOrThrow(response);
}