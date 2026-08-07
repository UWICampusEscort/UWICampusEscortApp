export type PushNotificationPayload = {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    url?: string;
    requireInteraction?: boolean;
    data?: Record<string, unknown>;
};

export type StoredPushSubscription = {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
};