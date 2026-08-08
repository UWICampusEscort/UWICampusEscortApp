"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Loader2,
    MapPin,
    Navigation,
    Phone,
    XCircle,
    Ban,
    Clock,
    Users,
    ShieldCheck,
    History,
    LogOut,
    Eye,
    Check,
    X,
    ArrowLeft,
    ArrowRight,
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
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { formatDatePPP } from "@/lib/utils";
import { CAMPUS_SECURITY_HREF } from "@/lib/constants";

type Group = {
    id: string;
    name: string;
    start_location: string;
    end_location: string;
    capacity: number;
    members: string[];
    requesting_members: string[];
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

type Role = "organizer" | "member" | "escort" | "requested_escort" | null;

const MAX_SUGGESTIONS = 6;

function getInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function getRole(group: Group, userId: string): Role {
    if (group.created_by === userId) return "organizer";
    if (group.members.includes(userId)) return "member";
    if (group.escorts.includes(userId)) return "escort";
    if (group.requested_escorts.includes(userId)) return "requested_escort";
    return null;
}

function PersonChip({ person, fallbackLabel, currentUser }: { person?: PersonLite; fallbackLabel: string, currentUser: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={person?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                    {getInitials(person?.full_name || fallbackLabel)}{person?.id == currentUser ? " (You)" : ""}
                </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs">{person?.full_name || fallbackLabel}</span>
        </div>
    );
}

function AliveBadge() {
    return (
        <Badge className="gap-1 bg-blue-600 text-white hover:bg-blue-600">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Active
        </Badge>
    );
}

// ---------------------------------------------------------------------------
// Profile preview modal — embeds /profile/[userId] inside a dialog so the
// person never has to leave the trips page to see who they're travelling
// or being asked to travel with.
// ---------------------------------------------------------------------------

function ProfilePreviewDialog({
    userId,
    onOpenChange,
}: {
    userId: string | null;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={!!userId} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[80vh] w-[92vw] flex-col overflow-hidden p-0 sm:w-full sm:max-w-2xl">
                <DialogHeader className="border-b px-4 pb-2 pt-4">
                    <DialogTitle className="text-sm sm:text-base">Profile</DialogTitle>
                    <DialogDescription className="sr-only">Preview of this user&apos;s profile</DialogDescription>
                </DialogHeader>
                {userId && (
                    <iframe src={`/profile/${userId}`} className="w-full flex-1 border-0" title="Profile preview" />
                )}
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// A single pending join request, with accept/deny and a profile preview.
// ---------------------------------------------------------------------------

function RequestRow({
    person,
    onAccept,
    onDeny,
    onViewProfile,
    disabledToAccept,
    acting,
}: {
    person?: PersonLite;
    onAccept: () => void;
    onDeny: () => void;
    onViewProfile: () => void;
    disabledToAccept: boolean;
    acting: boolean;
}) {
    return (
        <div className="flex items-center gap-2 rounded-md border p-2">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={person?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{getInitials(person?.full_name || "Unknown")}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm">{person?.full_name || "Unknown"}</span>

            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onViewProfile}>
                <Eye className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700"
                onClick={onAccept}
                disabled={disabledToAccept || acting}
                title={disabledToAccept ? "Group is at capacity" : "Accept"}
            >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={onDeny}
                disabled={acting}
                title="Deny"
            >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            </Button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Trip details modal.
//   Step 1 — members & escorts on the trip.
//   Step 2 (organizer, active trips only) — pending join requests, with
//   accept/deny and a "view profile" preview for each requester.
// ---------------------------------------------------------------------------

function TripDetailsDialog({
    group,
    role,
    peopleById,
    onViewProfile,
    onAcceptRequest,
    onDenyRequest,
    actingRequestId,
    currentUser
}: {
    group: Group;
    role: Role;
    peopleById: Map<string, PersonLite>;
    onViewProfile: (userId: string) => void;
    onAcceptRequest?: (group: Group, requesterId: string) => void;
    onDenyRequest?: (group: Group, requesterId: string) => void;
    actingRequestId?: string | null;
    currentUser: string;
}) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);

    const canManageRequests = group.alive && role === "organizer";
    const pendingCount = group.requesting_members?.length ?? 0;
    const isFull = group.members.length >= group.capacity;

    useEffect(() => {
        if (open) setStep(1);
    }, [open]);

    const memberRow = (id: string, kind: "member" | "escort", currentUser: string) => {
        const person = peopleById.get(id);
        return (
            <button
                key={id}
                type="button"
                onClick={() => onViewProfile(id)}
                className="flex items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-accent"
            >
                <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={person?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                        {getInitials(person?.full_name || (kind === "member" ? "Member" : "Escort"))}
                    </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm">
                    {person?.full_name || (kind === "member" ? "Member" : "Escort")}{person?.id == currentUser && " (You)"}
                </span>
                {kind === "member" && id === group.created_by && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Organizer
                    </Badge>
                )}
                {kind === "escort" && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
            </button>
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    View Details
                    {pendingCount > 0 && canManageRequests && (
                        <Badge className="ml-1.5 h-4 rounded-full px-1.5 text-[10px]">{pendingCount}</Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[80vh] w-[92vw] flex-col overflow-hidden p-0 sm:w-full sm:max-w-lg">
                <DialogHeader className="px-6 pb-2 pt-6">
                    <DialogTitle className="text-base">
                        {step === 1 ? group.name || "Trip details" : "Pending requests"}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        {step === 1
                            ? `${group.start_location} → ${group.end_location}`
                            : "Review who's asked to join, and let them in or turn them away."}
                    </DialogDescription>
                </DialogHeader>

                {/* Sliding two-panel wizard. Both panels stay mounted so the
                    transition can animate between them. */}
                <div className="flex-1 overflow-hidden">
                    <div
                        className="flex w-[200%] transition-transform duration-300 ease-in-out"
                        style={{ transform: step === 1 ? "translateX(0%)" : "translateX(-50%)" }}
                    >
                        {/* Step 1: members + escorts */}
                        <div className="max-h-[55vh] w-1/2 overflow-y-auto px-6 pb-6 scrollbar-thin">
                            <div className="flex flex-col gap-4">
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

                                <div>
                                    <p className="mb-2 text-sm font-medium">Members</p>
                                    <div className="flex flex-col gap-2">
                                        {group.members.map((id) => memberRow(id, "member", currentUser))}
                                    </div>
                                </div>

                                {group.escorts.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-sm font-medium">Escorts</p>
                                        <div className="flex flex-col gap-2">
                                            {group.escorts.map((id) => memberRow(id, "escort", currentUser))}
                                        </div>
                                    </div>
                                )}

                                {group.escorts.length === 0 && group.members.length <= 1 && (
                                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                                        Just you on this trip{group.alive && group.capacity > 1 ? " so far" : ""}.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Step 2: requesting members */}
                        <div className="max-h-[55vh] w-1/2 overflow-y-auto px-6 pb-6 scrollbar-thin">
                            <div className="flex flex-col gap-2">
                                {isFull && pendingCount > 0 && (
                                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                        This group is at capacity — a spot needs to free up before you can accept
                                        anyone else.
                                    </p>
                                )}
                                {pendingCount === 0 && (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No pending requests.
                                    </p>
                                )}
                                {group.requesting_members?.map((id) => (
                                    <RequestRow
                                        key={id}
                                        person={peopleById.get(id)}
                                        onAccept={() => onAcceptRequest?.(group, id)}
                                        onDeny={() => onDenyRequest?.(group, id)}
                                        onViewProfile={() => onViewProfile(id)}
                                        disabledToAccept={isFull}
                                        acting={actingRequestId === id}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 pb-6 pt-2">
                    <div className="flex w-full items-center justify-between gap-2">
                        {step === 1 ? (
                            <>
                                <DialogClose asChild>
                                    <Button variant="outline" size="sm">
                                        Close
                                    </Button>
                                </DialogClose>
                                {canManageRequests && (
                                    <Button variant="secondary" size="sm" onClick={() => setStep(2)}>
                                        Requests {pendingCount > 0 && `(${pendingCount})`}
                                        <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                                </Button>
                                <DialogClose asChild>
                                    <Button variant="outline" size="sm">
                                        Close
                                    </Button>
                                </DialogClose>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function TripsPage() {
    const supabase = useMemo(() => createClient(), []);

    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);
    const [actingRequestId, setActingRequestId] = useState<string | null>(null);
    const [previewUserId, setPreviewUserId] = useState<string | null>(null);

    const [groups, setGroups] = useState<Group[]>([]);
    const [peopleById, setPeopleById] = useState<Map<string, PersonLite>>(new Map());

    const fetchGroups = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }
        setUserId(user.id);

        const { data, error: fetchError } = await supabase
            .from("groups")
            .select("*")
            .order("departure_time", { ascending: false });

        if (fetchError) {
            setError(fetchError.message);
            setLoading(false);
            return;
        }

        const rows = (data as Group[]) ?? [];
        // RLS should already scope this to groups the user belongs to, but
        // filter again client-side as a defensive check and to compute roles.
        const mine = rows.filter((g) => getRole(g, user.id) !== null);
        setGroups(mine);

        const ids = new Set<string>();
        for (const g of mine) {
            ids.add(g.created_by);
            g.members.forEach((id) => ids.add(id));
            g.escorts.forEach((id) => ids.add(id));
            g.requesting_members?.forEach((id) => ids.add(id));
        }

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
        fetchGroups();
    }, [fetchGroups]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel("groups-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () =>
                fetchGroups()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, fetchGroups]);

    const currentGroups = groups.filter((g) => g.alive);
    const pastGroups = groups.filter((g) => !g.alive);

    const suggestions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const g of groups) {
            for (const loc of [g.start_location, g.end_location]) {
                if (!loc) continue;
                counts.set(loc, (counts.get(loc) ?? 0) + 1);
            }
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_SUGGESTIONS)
            .map(([loc]) => loc);
    }, [groups]);

    const handleLeaveOrEnd = async (group: Group) => {
        if (!userId) return;
        const role = getRole(group, userId);
        if (!role) return;

        setActingId(group.id);
        setError(null);

        let update: Partial<Group> = {};
        if (role === "organizer") update = { alive: false };
        else if (role === "member") update = { members: group.members.filter((m) => m !== userId) };
        else if (role === "escort") update = { escorts: group.escorts.filter((e) => e !== userId) };
        else if (role === "requested_escort")
            update = { requested_escorts: group.requested_escorts.filter((e) => e !== userId) };

        const { error: updateError } = await supabase.from("groups").update(update).eq("id", group.id);

        if (updateError) setError(updateError.message);
        else await fetchGroups();
        setActingId(null);
    };

    const handleAcceptRequest = async (group: Group, requesterId: string) => {
        if (!userId || getRole(group, userId) !== "organizer") return;
        if (group.members.length >= group.capacity) {
            setError("This group is already full.");
            return;
        }

        setActingRequestId(requesterId);
        setError(null);

        const update: Partial<Group> = {
            members: Array.from(new Set([...group.members, requesterId])),
            requesting_members: group.requesting_members.filter((id) => id !== requesterId),
        };

        const { error: updateError } = await supabase.from("groups").update(update).eq("id", group.id);

        if (updateError) setError(updateError.message);
        else await fetchGroups();
        setActingRequestId(null);
    };

    const handleDenyRequest = async (group: Group, requesterId: string) => {
        if (!userId || getRole(group, userId) !== "organizer") return;

        setActingRequestId(requesterId);
        setError(null);

        const update: Partial<Group> = {
            requesting_members: group.requesting_members.filter((id) => id !== requesterId),
        };

        const { error: updateError } = await supabase.from("groups").update(update).eq("id", group.id);

        if (updateError) setError(updateError.message);
        else await fetchGroups();
        setActingRequestId(null);
    };

    const leaveLabel = (role: Role) => {
        switch (role) {
            case "organizer":
                return "End trip";
            case "member":
                return "Leave group";
            case "escort":
                return "Stop escorting";
            case "requested_escort":
                return "Cancel request";
            default:
                return "Leave";
        }
    };

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-10 sm:px-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center">
                <p className="text-muted-foreground">Sign in to see your trips.</p>
                <Button asChild className="mt-4">
                    <Link href="/auth/login">Sign in</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6">
            <div>
                <h1 className="text-2xl font-semibold">My Trips</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your current groups and a history of who and where you've travelled with.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Where To? */}
            {suggestions.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-medium text-muted-foreground">Where to?</h2>
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                        {suggestions.map((loc) => (
                            <Link
                                key={loc}
                                href={`/home?destination=${encodeURIComponent(loc)}`}
                                className="flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                            >
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                {loc}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Current trips */}
            <section>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">Current trips</h2>

                {currentGroups.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                            <History className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No active trip right now.</p>
                            <Button asChild size="sm">
                                <Link href="/home?destination=">Request an escort</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {currentGroups.map((group) => {
                            const role = getRole(group, userId);
                            return (
                                <Card key={group.id} className="border-blue-600/30">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-base">{group.name || "Escort request"}</CardTitle>
                                            <AliveBadge />
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
                                            {group.escorts.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    {group.escorts.length} escort{group.escorts.length > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>

                                        {group.escorts.length === 0 && group.need_escort && (
                                            <p className="text-sm text-muted-foreground">
                                                Looking for an available escort — this usually only takes a minute.
                                            </p>
                                        )}

                                        {group.members.length > 1 && (
                                            <div>
                                                <p className="mb-1.5 text-xs text-muted-foreground">Travelling with</p>
                                                <div className="flex flex-wrap gap-3">
                                                    {group.members
                                                        .filter((id) => id !== userId)
                                                        .slice(0, 4)
                                                        .map((id) => (
                                                            <PersonChip key={id} person={peopleById.get(id)} currentUser={userId} fallbackLabel="Member" />
                                                        ))}
                                                    {group.members.length - 1 > 4 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            +{group.members.length - 1 - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <a
                                                href={`tel:${CAMPUS_SECURITY_HREF}`}
                                                className="flex w-full items-center justify-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 sm:w-auto"
                                            >
                                                <Phone className="h-4 w-4" />
                                                Emergency
                                            </a>

                                            <TripDetailsDialog
                                                group={group}
                                                role={role}
                                                peopleById={peopleById}
                                                onViewProfile={setPreviewUserId}
                                                onAcceptRequest={handleAcceptRequest}
                                                onDenyRequest={handleDenyRequest}
                                                actingRequestId={actingRequestId}
                                                currentUser={userId}
                                            />

                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-auto"
                                                onClick={() => handleLeaveOrEnd(group)}
                                                disabled={actingId === group.id}
                                            >
                                                {actingId === group.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <LogOut className="mr-1.5 h-4 w-4" />
                                                        {leaveLabel(role)}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* History */}
            <section>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">Trip history</h2>

                {pastGroups.length === 0 ? (
                    <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                        Your past trips will show up here.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {pastGroups.map((group) => {
                            const role = getRole(group, userId);
                            return (
                                <Card key={group.id}>
                                    <CardContent className="flex items-center gap-3 py-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {group.start_location} → {group.end_location}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDatePPP(new Date(group.departure_time))}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
                                            <Ban className="h-3 w-3" /> Ended
                                        </Badge>
                                        <TripDetailsDialog
                                            group={group}
                                            role={role}
                                            peopleById={peopleById}
                                            onViewProfile={setPreviewUserId}
                                            currentUser={userId}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            <ProfilePreviewDialog userId={previewUserId} onOpenChange={(open) => !open && setPreviewUserId(null)} />
        </div>
    );
}