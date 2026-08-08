import { createClient } from "./supabase/server";

// Dictionary of user ids and is escort cache
const expiredLength = 1000 * 60 * 60; // 1 hour
const isEscortCache: Record<string, { isEscort: boolean | "undetermined", lastChecked: Date }> = {};

export async function getIsEscortFromCache(userId: string): Promise<boolean | "undetermined"> {
    if (userId in isEscortCache && (new Date().getTime() - isEscortCache[userId].lastChecked.getTime()) < expiredLength)
        return isEscortCache[userId].isEscort;

    const db = await createClient();
    const { data: profileData } = await db.from("profiles")
        .select("escort")
        .eq("id", userId)
        .single();
    isEscortCache[userId] = { isEscort: profileData?.escort ?? "undetermined", lastChecked: new Date() };
    return isEscortCache[userId].isEscort;
}