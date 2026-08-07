import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotificationToUser } from "@/lib/push/server";
import type { PushNotificationPayload } from "@/lib/push/types";

export const runtime = "nodejs";

function isPushNotificationPayload(value: unknown): value is PushNotificationPayload {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<PushNotificationPayload>;
    return (
        typeof candidate.title === "string" &&
        candidate.title.length > 0 &&
        typeof candidate.body === "string" &&
        candidate.body.length > 0
    );
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const payload = (await request.json()) as unknown;

        if (!isPushNotificationPayload(payload)) {
            return NextResponse.json({ error: "Invalid notification payload." }, { status: 400 });
        }

        const result = await sendPushNotificationToUser(user.id, payload);
        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}