import webpush, { type PushSubscription } from "web-push";
import { EMAIL } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushNotificationPayload } from "@/lib/push/types";

type PushSubscriptionRecord = {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    expiration_time: string | null;
};

let isConfigured = false;

function configureWebPush() {
    if (isConfigured) {
        return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT ?? `mailto:${EMAIL}`;

    if (!publicKey || !privateKey) {
        throw new Error("Web push VAPID keys are not configured.");
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    isConfigured = true;
}

function toWebPushSubscription(record: PushSubscriptionRecord): PushSubscription {
    return {
        endpoint: record.endpoint,
        expirationTime: record.expiration_time
            ? new Date(record.expiration_time).getTime()
            : null,
        keys: {
            p256dh: record.p256dh,
            auth: record.auth,
        },
    };
}

function toSerializedPayload(payload: PushNotificationPayload) {
    return JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? "/favicon-192x192.png",
        badge: payload.badge ?? "/favicon-192x192.png",
        image: payload.image,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction ?? false,
        data: {
            ...(payload.data ?? {}),
            url: payload.url ?? "/",
        },
    });
}

async function deleteSubscriptionsByEndpoint(endpoints: string[]) {
    if (!endpoints.length) {
        return;
    }

    const admin = createAdminClient();
    await admin.from("push_subscriptions").delete().in("endpoint", endpoints);
}

async function deliverNotifications(records: PushSubscriptionRecord[], payload: PushNotificationPayload) {
    configureWebPush();

    const invalidEndpoints: string[] = [];

    await Promise.all(
        records.map(async (record) => {
            try {
                await webpush.sendNotification(
                    toWebPushSubscription(record),
                    toSerializedPayload(payload),
                );
            } catch (error) {
                if (
                    typeof error === "object" &&
                    error !== null &&
                    "statusCode" in error &&
                    (error.statusCode === 404 || error.statusCode === 410)
                ) {
                    invalidEndpoints.push(record.endpoint);
                    return;
                }

                throw error;
            }
        }),
    );

    await deleteSubscriptionsByEndpoint(invalidEndpoints);
}

async function loadSubscriptionsForUsers(userIds: string[]) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth, expiration_time")
        .in("user_id", userIds);

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as PushSubscriptionRecord[];
}

export async function sendPushNotificationToUser(
    userId: string,
    payload: PushNotificationPayload,
) {
    return sendPushNotificationToUsers([userId], payload);
}

export async function sendPushNotificationToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
) {
    if (!userIds.length) {
        return { delivered: 0 };
    }

    const uniqueUserIds = Array.from(new Set(userIds));
    const subscriptions = await loadSubscriptionsForUsers(uniqueUserIds);

    if (!subscriptions.length) {
        return { delivered: 0 };
    }

    await deliverNotifications(subscriptions, payload);

    return {
        delivered: subscriptions.length,
    };
}