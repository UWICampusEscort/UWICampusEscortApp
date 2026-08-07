"use client";

/**
 * Escort requests — /escort
 * -------------------------------------------------------------------------
 * Shows groups where the current user has been specifically requested as
 * an escort (i.e. their id is in that group's `requested_escorts` jsonb
 * array), with Accept / Decline actions.
 *
 * RLS needed on `groups` (same policy as used for /trips — add once if you
 * already added it there):
 *
 *   create policy "Users can view groups they belong to"
 *   on public.groups for select
 *   using (
 *     auth.uid() = created_by
 *     or members @> to_jsonb(auth.uid())
 *     or escorts @> to_jsonb(auth.uid())
 *     or requested_escorts @> to_jsonb(auth.uid())
 *     or is_public = true
 *   );
 *
 * Accept reuses the existing `add_group_escort` RPC (same one the
 * "Escort Group" flow on the request page already calls) — assumed to add
 * the caller to `escorts` and remove them from `requested_escorts`
 * atomically. If it doesn't currently do the latter, update it to.
 *
 * Decline is new. Per your note, it should land the user in
 * `rejected_escorts` — but that has to happen through a function, not a
 * raw client `update()`, since `groups` writes are otherwise owner-only.
 * This mirrors the shape of `add_group_escort` / `remove_group_escort`:
 *
 *   create or replace function public.decline_group_escort_request(group_id uuid)
 *   returns boolean
 *   language plpgsql
 *   security definer
 *   set search_path = public
 *   as $$
 *   declare
 *     caller uuid := auth.uid();
 *     updated boolean;
 *   begin
 *     update public.groups
 *     set
 *       requested_escorts = (
 *         select coalesce(jsonb_agg(v), '[]'::jsonb)
 *         from jsonb_array_elements_text(requested_escorts) v
 *         where v <> caller::text
 *       ),
 *       rejected_escorts = (
 *         select coalesce(jsonb_agg(distinct v), '[]'::jsonb)
 *         from jsonb_array_elements_text(rejected_escorts || to_jsonb(caller::text)) v
 *       )
 *     where id = group_id
 *       and requested_escorts @> to_jsonb(caller)
 *     returning true into updated;
 *
 *     return coalesce(updated, false);
 *   end;
 *   $$;
 *
 *   grant execute on function public.decline_group_escort_request(uuid) to authenticated;
 *
 * Because it's security definer and only ever touches rows where the
 * caller is already in `requested_escorts`, it can't be used to tamper
 * with anyone else's group.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Loader2,
    MapPin,
    Navigation,
    Clock,
    Users,
    Check,
    X,
    ShieldAlert,
    Inbox,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDatePPP } from "@/lib/utils";

type Group = {
    id: string;
    name: string;
    start_location: string;
    end_location: string;
    capacity: number;
    members: string[];
    departure_time: string;
    escorts: string[];
    created_at: string;
    created_by: string;
    requested_escorts: string[];
    alive: boolean;
    rejected_escorts: string[];
    banned_members: string[];
    need_escort: boolean;
    is_public: boolean;
};

type PersonLite = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

type EscortEligibility = "checking" | "not_escort" | "unverified" | "eligible";

function getInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function AcceptedBadge() {
    return (
        <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Accepted
        </Badge>
    );
}

export default function EscortRequestsPage() {
    const supabase = useMemo(() => createClient(), []);

    const [userId, setUserId] = useState<string | null>(null);
    const [eligibility, setEligibility] = useState<EscortEligibility>("checking");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);

    const [requests, setRequests] = useState<Group[]>([]);
    const [peopleById, setPeopleById] = useState<Map<string, PersonLite>>(new Map());

    const fetchRequests = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }
        setUserId(user.id);

        const { data: profile } = await supabase
            .from("profiles")
            .select("escort, identity_status")
            .eq("id", user.id)
            .maybeSingle();

        if (!profile?.escort) {
            setEligibility("not_escort");
            setLoading(false);
            return;
        }
        /*
        if (profile.identity_status !== "verified") {
            setEligibility("unverified");
            setLoading(false);
            return;
        }
        */
        setEligibility("eligible");

        const { data, error: fetchError } = await supabase
            .from("groups")
            .select("*")
            .eq("alive", true)
            .contains("requested_escorts", JSON.stringify([user.id]))
            .order("departure_time", { ascending: true });

        if (fetchError) {
            setError(fetchError.message);
            setLoading(false);
            return;
        }

        const rows = (data as Group[]) ?? [];
        setRequests(rows);

        const ids = new Set<string>();
        rows.forEach((g) => {
            ids.add(g.created_by);
            g.members.forEach((id) => ids.add(id));
        });

        if (ids.size > 0) {
            const { data: people } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", Array.from(ids));

            if (people) {
                setPeopleById(new Map((people as PersonLite[]).map((p) => [p.id, p])));
            }
        }

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        if (!userId || eligibility !== "eligible") return;

        const channel = supabase
            .channel("escort-requests")
            .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () =>
                fetchRequests()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, eligibility, fetchRequests]);

    const handleAccept = async (group: Group) => {
        setActingId(group.id);
        setError(null);

        const { error: rpcError } = await supabase.rpc("add_group_escort", {
            group_id: group.id,
            escort: userId,
        });

        if (rpcError) setError(rpcError.message);
        else await fetchRequests();
        setActingId(null);
    };

    const handleDecline = async (group: Group) => {
        setActingId(group.id);
        setError(null);

        const { error: rpcError } = await supabase.rpc("decline_group_escort_request", {
            group_id: group.id,
            escort: userId,
        });

        if (rpcError) setError(rpcError.message);
        else await fetchRequests();
        setActingId(null);
    };

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-10 sm:px-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center">
                <p className="text-muted-foreground">Sign in to view escort requests.</p>
                <Button asChild className="mt-4">
                    <Link href="/auth/login">Sign in</Link>
                </Button>
            </div>
        );
    }

    if (eligibility === "not_escort") {
        return (
            <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">
                    You're not registered as an escort yet.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/profile">Become an escort</Link>
                </Button>
            </div>
        );
    }

    if (false && eligibility === "unverified") {
        return (
            <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-amber-600" />
                <p className="mt-3 text-muted-foreground">
                    Your identity verification needs to be completed before you can accept escort requests.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/profile">Finish verification</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
            <div>
                <h1 className="text-4xl font-semibold">Escort Requests</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    People who've specifically asked you to escort their trip.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <X className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {requests.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                        <Inbox className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            No pending requests right now — new ones will show up here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {requests.map((group) => {
                        const organizer = peopleById.get(group.created_by);
                        const otherMembers = group.members.filter((id) => id !== group.created_by);

                        return (
                            <Card key={group.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base">{group.name || "Escort request"}</CardTitle>
                                        <Badge variant="outline" className="shrink-0">Pending</Badge>
                                    </div>
                                    <CardDescription className="flex items-center gap-1.5 pt-1">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            {group.start_location}
                                            <Navigation className="mx-1 inline h-3 w-3 rotate-90" />
                                            {group.end_location}
                                        </span>
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDatePPP(new Date(group.departure_time))}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {group.members.length}/{group.capacity}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 shrink-0">
                                            <AvatarImage src={organizer?.avatar_url ?? undefined} />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(organizer?.full_name || "Organizer")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm">{organizer?.full_name || "Someone"}</p>
                                            <p className="text-xs text-muted-foreground">Trip organizer</p>
                                        </div>
                                        <Button asChild size="sm" variant="outline" className="ml-auto shrink-0">
                                            <Link href={`/profile/${group.created_by}`}>View profile</Link>
                                        </Button>
                                    </div>

                                    {otherMembers.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-xs text-muted-foreground">
                                                Also travelling ({otherMembers.length})
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                {otherMembers.map((id) => {
                                                    const person = peopleById.get(id);
                                                    return (
                                                        <div key={id} className="flex items-center gap-1.5">
                                                            <Avatar className="h-5 w-5 shrink-0">
                                                                <AvatarImage src={person?.avatar_url ?? undefined} />
                                                                <AvatarFallback className="text-[10px]">
                                                                    {getInitials(person?.full_name || "Member")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="truncate text-xs">{person?.full_name || "Member"}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {group.escorts.includes(userId) ? (
                                        <AcceptedBadge />
                                    ) : (<>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Button
                                                className="w-full sm:w-auto"
                                                onClick={() => handleAccept(group)}
                                                disabled={actingId === group.id}
                                            >
                                                {actingId === group.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="mr-1.5 h-4 w-4" />
                                                        Accept
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-auto"
                                                onClick={() => handleDecline(group)}
                                                disabled={actingId === group.id}
                                            >
                                                <X className="mr-1.5 h-4 w-4" />
                                                Decline
                                            </Button>
                                        </div>
                                    </>)}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}