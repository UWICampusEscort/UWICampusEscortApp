"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    deleteStoredPushSubscription,
    getExistingPushSubscription,
    getNotificationPermission,
    isPushNotificationsSupported,
    registerPushServiceWorker,
    savePushSubscription,
    sendSelfPushNotification,
    subscribeToPushService,
} from "@/lib/push/client";
import type { PushNotificationPayload } from "@/lib/push/types";

type PushNotificationsContextValue = {
    isSupported: boolean;
    isLoading: boolean;
    isSubscribed: boolean;
    permission: NotificationPermission;
    subscribe: () => Promise<PushSubscription>;
    unsubscribe: () => Promise<void>;
    refresh: () => Promise<PushSubscription | null>;
    sendNotification: (payload: PushNotificationPayload) => Promise<void>;
};

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

function getMissingPublicKeyError() {
    return new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.");
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isLoading, setIsLoading] = useState(true);
    const isSupported = isPushNotificationsSupported();

    const refresh = useCallback(async () => {
        if (!isSupported) {
            setIsLoading(false);
            return null;
        }

        setIsLoading(true);

        try {
            const registration = await registerPushServiceWorker();
            const currentSubscription = await getExistingPushSubscription(registration);
            setSubscription(currentSubscription);
            setPermission(getNotificationPermission());
            return currentSubscription;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const subscribe = useCallback(async () => {
        if (!isSupported) {
            throw new Error("Push notifications are not supported in this browser.");
        }

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!publicKey) {
            throw getMissingPublicKeyError();
        }

        setIsLoading(true);

        try {
            const requestedPermission = await Notification.requestPermission();
            setPermission(requestedPermission);

            if (requestedPermission !== "granted") {
                throw new Error("Notification permission was not granted.");
            }

            const registration = await registerPushServiceWorker();
            const nextSubscription = await subscribeToPushService(registration, publicKey);
            await savePushSubscription(nextSubscription);
            setSubscription(nextSubscription);
            return nextSubscription;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async () => {
        if (!isSupported) {
            return;
        }

        setIsLoading(true);

        try {
            const registration = await registerPushServiceWorker();
            const currentSubscription = await getExistingPushSubscription(registration);

            if (!currentSubscription) {
                setSubscription(null);
                return;
            }

            await deleteStoredPushSubscription(currentSubscription.endpoint);
            await currentSubscription.unsubscribe();
            setSubscription(null);
            setPermission(getNotificationPermission());
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    const sendNotification = useCallback(async (payload: PushNotificationPayload) => {
        await sendSelfPushNotification(payload);
    }, []);

    const value = useMemo<PushNotificationsContextValue>(
        () => ({
            isSupported,
            isLoading,
            isSubscribed: Boolean(subscription),
            permission,
            subscribe,
            unsubscribe,
            refresh,
            sendNotification,
        }),
        [isLoading, isSupported, permission, refresh, sendNotification, subscribe, subscription, unsubscribe],
    );

    return (
        <PushNotificationsContext.Provider value={value}>
            {children}
        </PushNotificationsContext.Provider>
    );
}

export function usePushNotifications() {
    const context = useContext(PushNotificationsContext);

    if (!context) {
        throw new Error("usePushNotifications must be used within PushNotificationsProvider.");
    }

    return context;
}