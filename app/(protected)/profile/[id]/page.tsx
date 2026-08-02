import { notFound } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    ShieldCheck,
    ShieldAlert,
    ShieldQuestion,
    Phone,
    CalendarClock,
    BadgeCheck,
    Vault,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { formatDatePPP } from "@/lib/utils";
import type { Profile } from "../page";
import { Suspense } from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

type IdentityStatus = Profile["identity_status"];

type PublicProfile = Pick<
    Profile,
    "id" | "full_name" | "email" | "avatar_url" | "identity_status" | "escort" | "graduation_date"
>;

function getInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export default async function UserProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user: viewer },
    } = await supabase.auth.getUser();

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, identity_status, escort, graduation_date")
        .eq("id", id)
        .maybeSingle<PublicProfile>();

    if (error) {
        console.error("Error fetching profile:", error);
    }

    if (!profile) notFound();

    const displayName = profile.full_name || "~Unknown";
    const identityStatus: IdentityStatus = profile.identity_status ?? "unverified";
    const isOwnProfile = viewer?.id === profile.id;

    return (<Suspense fallback={<div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:px-8">Loading profile...</div>}>
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <Link
                href="/home"
                className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </Link>

            {isOwnProfile && (
                <div className="mb-6 flex items-center justify-between rounded-md border bg-accent/40 px-4 py-3 text-sm">
                    <span>This is your public profile.</span>
                    <Link href="/profile" className="font-medium underline underline-offset-2">
                        Edit profile
                    </Link>
                </div>
            )}

            <Card className="min-h-[60vh]">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
                                    <AvatarFallback className="text-lg">{getInitials(displayName)}</AvatarFallback>
                                </Avatar>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm">
                                <div className="flex justify-center items-center gap-4 w-fit aspect-square mt-3">
                                    {
                                        profile.avatar_url ?
                                            <Image src={profile.avatar_url} alt={displayName} width={200} height={200} className="rounded-md object-cover w-full h-full" />
                                            : <span className="text-sm text-muted-foreground text-center">No Profile Picture</span>
                                    }
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-xl">{displayName}</CardTitle>
                                {identityStatus === "verified" && (
                                    <BadgeCheck className="h-5 w-5 text-emerald-600" aria-label="Identity verified" />
                                )}
                            </div>
                            <CardDescription>
                                {profile.escort ? "Campus escort" : "Campus member"} · {profile.email}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Trust badges */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm">Identity</span>
                            <span className="ml-auto">
                                <IdentityBadge status={identityStatus} />
                            </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                            <Vault className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm">Escort</span>
                            {profile.escort ? (
                                <Badge variant="secondary" className="ml-auto gap-1">
                                    <ShieldCheck className="h-3 w-3" /> Yes
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="ml-auto gap-1 text-amber-600">
                                    <ShieldAlert className="h-3 w-3" /> No
                                </Badge>
                            )}
                        </div>
                    </div>

                    {profile.graduation_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarClock className="h-4 w-4 shrink-0" />
                            {new Date(profile.graduation_date).getTime() > Date.now() ? "Graduating " : "Graduated "} {formatDatePPP(new Date(profile.graduation_date))}
                        </div>
                    )}

                    {!isOwnProfile && profile.escort && (
                        <Button asChild className="w-full sm:w-auto">
                            <Link href={`/home?escort=${profile.id}`}>Request this escort for next group</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    </Suspense>);
}

function IdentityBadge({ status }: { status: IdentityStatus }) {
    switch (status) {
        case "verified":
            return (
                <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
            );
        case "pending":
            return (
                <Badge variant="outline" className="gap-1 text-blue-600">
                    <ShieldQuestion className="h-3 w-3" /> Pending
                </Badge>
            );
        case "failed":
            return (
                <Badge variant="outline" className="gap-1 text-destructive">
                    <ShieldAlert className="h-3 w-3" /> Failed
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="gap-1 text-amber-600">
                    <ShieldAlert className="h-3 w-3" /> Not started
                </Badge>
            );
    }
}