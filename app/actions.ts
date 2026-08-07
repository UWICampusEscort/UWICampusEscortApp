"use server"

import { sendPushNotificationToUsers } from "@/lib/push/server";
import { createClient } from "@/lib/supabase/server";

export const createTravelGroup = async ({
    groupName,
    capacity,
    startLocation,
    endLocation,
    departureTime,
    requestEscorts,
    userId,
    specificEscorts,
    isPublic
}: {
    groupName: string;
    capacity: number;
    startLocation: string;
    endLocation: string;
    departureTime: string;
    requestEscorts: boolean;
    userId: string;
    specificEscorts: string[];
    isPublic: boolean;
}) => {

    const db = await createClient();
    const { error } = await db.from("groups").insert([{
        name: groupName,
        capacity,
        start_location: startLocation,
        end_location: endLocation,
        departure_time: departureTime,
        members: [userId],
        requested_escorts: requestEscorts ? specificEscorts : [],
        need_escort: requestEscorts,
        is_public: isPublic
    }]);

    if (!error && requestEscorts && specificEscorts.length > 0) {
        // Send notification to requested escorts
        sendPushNotificationToUsers(specificEscorts, {
            title: "Escort Request",
            body: `You have been requested to escort a travel group from ${startLocation} to ${endLocation}.`,
            data: {
                groupName,
                startLocation,
                endLocation,
                departureTime
            }
        });
    }

    return { success: !error, error: error?.message || null };
};