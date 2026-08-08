"use server"

import { sendPushNotificationToUser, sendPushNotificationToUsers } from "@/lib/push/server";
import { createClient } from "@/lib/supabase/server";

export const createTravelGroup = async (
    groupName: string,
    capacity: number,
    startLocation: string,
    endLocation: string,
    departureTime: string,
    requestEscorts: boolean,
    userId: string,
    specificEscorts: string[],
    isPublic: boolean
) => {

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

export const requestToJoinTravelGroup = async (groupId: string, userId: string) => {
    const db = await createClient();

    const { data: success, error } = await db.rpc("add_group_member_request", {
        group_id: groupId,
        new_member: userId,
    });

    // Get group creator
    const { data, error: err } = await db.from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    // Alert creator that someone wants to join
    if (data)
        sendPushNotificationToUser(data.created_by, {
            title: "New Group Join Request",
            body: `A user has requested to join your travel group.`,
            data: {
                groupId,
                userId
            }
        })

    return { success: success && !error, error: error?.message || null };
}