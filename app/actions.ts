"use server"

import { createClient } from "@/lib/supabase/server";

export const createTravelGroup = async ({
    groupName,
    capacity,
    startLocation,
    endLocation,
    departureTime,
    requestEscorts,
    userId,
    specificEscorts
}: {
    groupName: string;
    capacity: number;
    startLocation: string;
    endLocation: string;
    departureTime: string;
    requestEscorts: boolean;
    userId: string;
    specificEscorts: string[];
}) => {

    const db = await createClient();
    const { error } = await db.from("groups").insert([{
        name: groupName,
        capacity: capacity,
        start_location: startLocation,
        end_location: endLocation,
        departure_time: new Date(departureTime).toISOString(),
        members: [userId],
        requested_escorts: requestEscorts ? specificEscorts : [],
        need_escort: requestEscorts,
    }]);

    return { success: !error, error: error?.message || null };
};