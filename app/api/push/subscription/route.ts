import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StoredPushSubscription } from "@/lib/push/types";

function isStoredPushSubscription(value: unknown): value is StoredPushSubscription {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<StoredPushSubscription>;

    return Boolean(
        candidate.endpoint &&
        typeof candidate.endpoint === "string" &&
        candidate.keys &&
        typeof candidate.keys.p256dh === "string" &&
        typeof candidate.keys.auth === "string",
    );
}

async function getCurrentUserId() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized.");
    }

    return { supabase, userId: user.id };
}

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as unknown;

        if (!isStoredPushSubscription(payload)) {
            return NextResponse.json({ error: "Invalid push subscription payload." }, { status: 400 });
        }

        const { supabase, userId } = await getCurrentUserId();
        const { error } = await supabase.from("push_subscriptions").upsert(
            {
                user_id: userId,
                endpoint: payload.endpoint,
                p256dh: payload.keys.p256dh,
                auth: payload.keys.auth,
                expiration_time:
                    payload.expirationTime !== null ? new Date(payload.expirationTime).toISOString() : null,
                user_agent: request.headers.get("user-agent"),
            },
            {
                onConflict: "endpoint",
            },
        );

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error.";
        const status = message === "Unauthorized." ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(request: Request) {
    try {
        const payload = (await request.json().catch(() => null)) as { endpoint?: string } | null;

        if (!payload?.endpoint) {
            return NextResponse.json({ error: "Subscription endpoint is required." }, { status: 400 });
        }

        const { supabase, userId } = await getCurrentUserId();
        const { error } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", payload.endpoint);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error.";
        const status = message === "Unauthorized." ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}