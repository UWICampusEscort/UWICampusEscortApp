"use client"
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import { createClient } from "@/lib/supabase/client";
import { getInitials, cn } from "@/lib/utils";
import { Suspense, useEffect, useMemo, useState } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Profile } from "../profile/page";
import { createTravelGroup, requestToJoinTravelGroup } from "@/app/actions";
import Link from "next/link";
import { ShieldAlert, Search, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TravelGroupUserData = {
  id: string;
  name: string;
  avatar_url: string;
};

type TravelGroupData = {
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
  idToUserData: Map<string, TravelGroupUserData>;
};

// This page is escortee-only — escorts are routed elsewhere and can never
// reach the "eligible" state below.
type EscorteeEligibility = "checking" | "escort_blocked" | "unverified" | "eligible";

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

const getTimeStatus = (time: string) => {
  const diffInMinutes = Math.floor((new Date(time).getTime() - Date.now()) / 60000);
  if (diffInMinutes <= 0) return "Departed";
  if (diffInMinutes < 60) return `Leaving in ~${diffInMinutes} minutes`;
  return `Leaving in ~${Math.floor(diffInMinutes / 60)} hours`;
};

const hasDeparted = (time: string) => new Date(time).getTime() <= Date.now();

/** Ticking "leaving in ~X" label for a departure time, refreshed every 30s. */
const useDepartureCountdown = (departureTime: string) => {
  const [status, setStatus] = useState("");
  useEffect(() => {
    const update = () => setStatus(getTimeStatus(departureTime));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [departureTime]);
  return status;
};

// ---------------------------------------------------------------------------
// Shared, reusable pieces
// ---------------------------------------------------------------------------

const UserAvatar = ({
  userId,
  data,
  className = "h-7 w-7 border-2 border-primary-foreground",
}: {
  userId: string;
  data: TravelGroupData;
  className?: string;
}) => {
  const user = data.idToUserData?.get(userId);
  return (
    <Avatar className={className}>
      <AvatarImage src={user?.avatar_url} alt={user?.name || "Unknown"} />
      <AvatarFallback className="text-xs">{getInitials(user?.name || "Unknown")}</AvatarFallback>
    </Avatar>
  );
};

const GroupSummaryHeader = ({ data, time }: { data: TravelGroupData; time: string }) => (
  <CardHeader>
    <CardTitle className="text-base flex flex-col gap-2">
      <span>{data.name}</span>
      <div className="flex flex-col sm:flex-row justify-between overflow-x-auto scrollbar-none">
        <span className="text-sm font-semibold">{`${data.start_location} -> ${data.end_location}`}</span>
        <span className="text-sm text-muted-foreground font-normal min-w-fit">{time}</span>
      </div>
    </CardTitle>

    <CardDescription>
      <AvatarGroup className="overflow-x-auto scrollbar-none">
        {data.members.map((memberId) => (
          <Link href={`/profile/${memberId}`} key={memberId}>
            <UserAvatar userId={memberId} data={data} />
          </Link>
        ))}
      </AvatarGroup>
      <span className="text-sm">{data.members.length} of {data.capacity} spots filled</span>
    </CardDescription>
  </CardHeader>
);

const EscortsList = ({
  data,
  canReject,
  onReject,
}: {
  data: TravelGroupData;
  canReject: boolean;
  onReject?: (escortId: string) => void;
}) => {
  const escortIds = Array.from(new Set([...data.escorts, ...data.requested_escorts]));
  if (escortIds.length === 0) return null;

  return (
    <>
      <span className="text-sm mt-2">Escorts ({data.escorts.length})</span>
      <div className="h-48 overflow-y-auto overflow-x-hidden border inset border-border rounded-md p-1 scrollbar-thin">
        {escortIds.map((escortId) => {
          const isConfirmed = data.escorts.includes(escortId);
          const name = data.idToUserData?.get(escortId)?.name || "Unknown";
          return (
            <div key={escortId} className="flex items-center gap-2 p-2">
              <Link href={`/profile/${escortId}`} className="flex gap-2 items-center w-full h-full">
                <UserAvatar userId={escortId} data={data} />
                <span className="text-sm min-w-0 flex-1 truncate">{name}</span>
              </Link>

              {isConfirmed && onReject && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto shrink-0"
                  disabled={!canReject}
                  onClick={() => onReject(escortId)}
                >
                  {canReject ? "Reject" : "Reject (Owner Only)"}
                </Button>
              )}
              {!isConfirmed && <Badge variant="default" className="shrink-0">Requested</Badge>}
            </div>
          );
        })}
      </div>
    </>
  );
};

const MembersList = ({
  data,
  currentUser,
  isOwner,
  onKick,
  onBan,
}: {
  data: TravelGroupData;
  currentUser: string;
  isOwner: boolean;
  onKick: (memberId: string) => void;
  onBan: (memberId: string) => void;
}) => {
  const [confirmingBan, setConfirmingBan] = useState("");

  return (
    <>
      <span className="text-sm mt-2">Members ({data.members.length}/{data.capacity})</span>
      <div className="h-48 overflow-y-auto overflow-x-hidden border inset border-border rounded-md p-1 scrollbar-thin">
        {data.members.map((memberId) => {
          const name = data.idToUserData?.get(memberId)?.name || "~Unknown";
          const canManage = isOwner && currentUser !== memberId;
          return (
            <div key={memberId} className="flex items-center gap-2 p-2">
              <Link href={`/profile/${memberId}`} className="flex gap-2 items-center w-full h-full">
                <UserAvatar userId={memberId} data={data} />
                <span className="text-sm line-clamp-1">{name}</span>
              </Link>

              {canManage && (
                <div className="flex gap-2 ml-auto shrink-0">
                  <Button variant="destructive" size="sm" onClick={() => onKick(memberId)}>Kick</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirmingBan === memberId) {
                        onBan(memberId);
                        setConfirmingBan("");
                      } else {
                        setConfirmingBan(memberId);
                        setTimeout(() => setConfirmingBan(""), 3000);
                      }
                    }}
                  >
                    {confirmingBan === memberId ? "Are you sure?" : "Ban"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Profile preview modal — embeds /profile/[userId] inside a dialog so the
// person never has to leave the page they're browsing groups on.
// ---------------------------------------------------------------------------

const ProfilePreviewDialog = ({
  userId,
  onOpenChange,
}: {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={!!userId} onOpenChange={onOpenChange}>
    <DialogContent className="w-[92vw] sm:w-full sm:max-w-2xl h-[80vh] p-0 overflow-hidden flex flex-col">
      <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
        <DialogTitle className="text-sm sm:text-base">Profile</DialogTitle>
        <DialogDescription className="sr-only">Preview of this user's profile</DialogDescription>
      </DialogHeader>
      {userId && (
        <iframe
          src={`/profile/${userId}`}
          className="w-full flex-1 border-0"
          title="Profile preview"
        />
      )}
    </DialogContent>
  </Dialog>
);

// ---------------------------------------------------------------------------
// Group card (escortee view only)
// ---------------------------------------------------------------------------

const GroupCard = ({
  data,
  currentUser,
  onViewProfile,
}: {
  data: TravelGroupData;
  currentUser: string;
  onViewProfile: (userId: string) => void;
}) => {
  const time = useDepartureCountdown(data.departure_time);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmingDestroy, setConfirmingDestroy] = useState(false);

  const isOwner = currentUser === data.created_by;

  useEffect(() => {
    if (!isDetailsOpen) setConfirmingDestroy(false);
  }, [isDetailsOpen]);

  const joinGroup = async () => {
    if (!currentUser) return;
    const { error } = await requestToJoinTravelGroup(data.id, currentUser);
    if (error) {
      console.error("Error executing query:", error);
      toast.error("Error requesting to join group. Please try again.\n" + error);
    }
  };

  const kick = async (memberId: string) => {
    if (!isOwner) {
      toast.error("Only the group owner can kick members.");
      return;
    }
    const db = createClient();
    const { data: success, error } = await db.rpc("remove_group_member", {
      group_id: data.id,
      member: memberId,
    });
    if (error) {
      console.error("Error executing query:", error);
      toast.error("Error kicking member. Please try again.\n" + error.message);
    } else if (success !== true) {
      toast.error("Failed to kick member.");
    }
  };

  const ban = async (memberId: string) => {
    if (!isOwner) {
      toast.error("Only the group owner can ban members.");
      return;
    }
    const db = createClient();
    const { data: success, error } = await db.rpc("ban_group_member", {
      group_id: data.id,
      member: memberId,
    });
    if (error) {
      console.error("Error executing query:", error);
      toast.error("Error banning member. Please try again.\n" + error.message);
    } else if (success !== true) {
      toast.error("Failed to ban member.");
    }
  };

  const rejectEscort = async (escortId: string) => {
    if (!isOwner) {
      toast.error("Only the group owner can reject escorts.");
      return;
    }
    const db = createClient();
    const { data: success, error } = await db.rpc("remove_group_escort", {
      group_id: data.id,
      escort: escortId,
    });
    if (error) {
      console.error("Error executing query:", error);
      toast.error("Error rejecting escort. Please try again.\n" + error.message);
    } else if (success !== true) {
      toast.error("Failed to reject escort.");
    }
  };

  const destroyGroup = async () => {
    if (!isOwner) {
      toast.error("Only the group owner can destroy the group.");
      return;
    }
    const db = createClient();
    const { error } = await db.from("groups").update({ alive: false }).eq("id", data.id);
    if (error) {
      console.error("Error destroying group:", error);
      toast.error("Error destroying group. Please try again.\n" + error.message);
    }
    setIsDetailsOpen(false);
  };

  const renderPrimaryAction = () => {
    if (currentUser && data.members.includes(currentUser)) {
      return <Button variant="secondary" size="sm" className="w-full" disabled>Already Joined</Button>;
    }
    if (data.requesting_members.includes(currentUser)) {
      return <Button variant="secondary" size="sm" className="w-full" disabled>Request Pending</Button>;
    }
    if (data.banned_members.includes(currentUser)) {
      return <Button variant="destructive" size="sm" className="w-full" disabled>Banned from Group</Button>;
    }
    return <Button variant="secondary" size="sm" className="w-full" onClick={joinGroup}>Join Group</Button>;
  };

  return (
    <Card className="mb-6 w-full h-fit">
      <GroupSummaryHeader data={data} time={time} />

      <CardContent className="flex justify-between items-center gap-4">
        {renderPrimaryAction()}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">Details</Button>
          </DialogTrigger>
          <DialogContent className="w-[92vw] sm:w-full sm:max-w-2xl max-h-[85vh] overflow-x-hidden overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">{data.name}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm" asChild>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm font-semibold min-w-0 flex-1 truncate">
                      {`${data.start_location} -> ${data.end_location}`}
                    </span>
                    <span className="text-sm text-muted-foreground font-normal shrink-0">{time}</span>
                  </div>

                  <EscortsList data={data} canReject={isOwner} onReject={rejectEscort} />

                  <MembersList
                    data={data}
                    currentUser={currentUser}
                    isOwner={isOwner}
                    onKick={kick}
                    onBan={ban}
                  />
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <div className="flex gap-2 w-full justify-between">
                {isOwner && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirmingDestroy) destroyGroup();
                      else {
                        setConfirmingDestroy(true);
                        setTimeout(() => setConfirmingDestroy(false), 3000);
                      }
                    }}
                  >
                    {confirmingDestroy ? "Are you sure?" : "Destroy"}
                  </Button>
                )}

                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Create-group wizard
//   Step 1 — group details (name, capacity, locations, departure, visibility)
//   Step 2 — pick escorts from a profile list, with a "View Profile" preview
// ---------------------------------------------------------------------------

const EscortPickerRow = ({
  escort,
  selected,
  onToggle,
  onViewProfile,
}: {
  escort: Profile;
  selected: boolean;
  onToggle: () => void;
  onViewProfile: () => void;
}) => (
  <div
    className={cn(
      "flex items-center gap-3 p-2 rounded-md border transition-colors",
      selected ? "border-primary bg-primary/5" : "border-border"
    )}
  >
    <Checkbox
      checked={selected}
      onCheckedChange={onToggle}
      aria-label={`Select ${escort.full_name || escort.email}`}
      className="focus-visible:ring-1 focus-visible:ring-offset-0"
    />

    <Avatar className="h-8 w-8 border-2 border-primary-foreground shrink-0">
      <AvatarImage src={escort.avatar_url ?? ""} alt={escort.full_name || escort.email} />
      <AvatarFallback className="text-xs">{getInitials(escort.full_name || escort.email)}</AvatarFallback>
    </Avatar>

    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium truncate">{escort.full_name || escort.email}</div>
      <div className="text-xs text-muted-foreground truncate">{escort.email}</div>
    </div>

    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onViewProfile}>
      View Profile
    </Button>
  </div>
);

const CreateGroup = ({
  isCreateGroupOpen,
  setIsCreateGroupOpen,
  handleTravelGroupCreation,
  specificEscorts,
  setSpecificEscorts,
  availableEscorts,
  userId,
  destination,
}: {
  isCreateGroupOpen: boolean;
  setIsCreateGroupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleTravelGroupCreation: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  specificEscorts: string[];
  setSpecificEscorts: React.Dispatch<React.SetStateAction<string[]>>;
  availableEscorts: Profile[];
  userId: string;
  destination?: string;
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [escortSearch, setEscortSearch] = useState("");
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [escortStepReady, setEscortStepReady] = useState(false);

  // Reset the wizard whenever the dialog is reopened.
  useEffect(() => {
    if (isCreateGroupOpen) {
      setStep(1);
      setEscortSearch("");
    }
  }, [isCreateGroupOpen]);

  useEffect(() => {
    if (step !== 2) {
      setEscortStepReady(false);
      return;
    }
    const timeout = setTimeout(() => setEscortStepReady(true), 350);
    return () => clearTimeout(timeout);
  }, [step]);

  const goToEscortStep = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const form = document.getElementById("createTravelGroup") as HTMLFormElement | null;
    if (form && !form.reportValidity()) return;
    setStep(2);
  };

  const toggleEscort = (escortId: string) => {
    setSpecificEscorts((prev) =>
      prev.includes(escortId) ? prev.filter((id) => id !== escortId) : [...prev, escortId]
    );
  };

  const filteredEscorts = availableEscorts.filter((user) => {
    if (user.id === userId) return false;
    const q = escortSearch.trim().toLowerCase();
    if (!q) return true;
    return (user.full_name || "").toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
  });

  return (
    <>
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm">Create</Button>
        </DialogTrigger>
        <DialogContent className="min-w-[75vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">
              {step === 1 ? "Create Travel Group" : "Request Escorts"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {step === 1
                ? "Set up a group to travel together with others heading your way."
                : "Optionally pick escorts to invite for added safety. You can also skip this and create the group without requesting anyone."}
            </DialogDescription>
          </DialogHeader>

          {/* Sliding two-panel wizard. Both steps stay mounted so the form
              data collected in step 1 survives the transition to step 2. */}
          <div className="overflow-hidden flex-1">
            <div
              className="flex w-[200%] transition-transform duration-300 ease-in-out"
              style={{ transform: step === 1 ? "translateX(0%)" : "translateX(-50%)" }}
            >
              {/* Step 1 */}
              <div className="w-1/2 pr-2 overflow-y-auto max-h-[60vh] scrollbar-thin">
                <form
                  className="flex flex-col w-full gap-4 py-4"
                  id="createTravelGroup"
                  onSubmit={handleTravelGroupCreation}
                  key={destination ?? "blank"}
                >
                  <FieldGroup>
                    <div className="flex w-full gap-4">
                      <Field>
                        <InputGroup className="h-auto focus-within:ring-1 focus-within:ring-ring/40 focus-within:ring-offset-0">
                          <InputGroupInput name="group_name" placeholder="eg. travellers009" className="text-sm sm:text-base" required />
                          <InputGroupAddon align="block-start">
                            <InputGroupText className="text-xs sm:text-sm">Group Name</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      </Field>

                      <Field>
                        <InputGroup className="h-auto focus-within:ring-1 focus-within:ring-ring/40 focus-within:ring-offset-0">
                          <InputGroupInput name="capacity" type="number" min={1} placeholder="eg. 3" className="text-sm sm:text-base" required />
                          <InputGroupAddon align="block-start">
                            <InputGroupText className="text-xs sm:text-sm">Capacity</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      </Field>
                    </div>

                    <div className="flex w-full gap-4">
                      <Field>
                        <InputGroup className="h-auto focus-within:ring-1 focus-within:ring-ring/40 focus-within:ring-offset-0">
                          <InputGroupInput name="start_location" placeholder="eg. FST Block Entrance" className="text-sm sm:text-base" required />
                          <InputGroupAddon align="block-start">
                            <InputGroupText className="text-xs sm:text-sm">Start Location</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      </Field>

                      <Field>
                        <InputGroup className="h-auto focus-within:ring-1 focus-within:ring-ring/40 focus-within:ring-offset-0">
                          <InputGroupInput name="end_location" placeholder="eg. Seacole Entrance" defaultValue={destination} className="text-sm sm:text-base" required />
                          <InputGroupAddon align="block-start">
                            <InputGroupText className="text-xs sm:text-sm">End Location</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      </Field>
                    </div>

                    <Field>
                      <InputGroup className="h-auto focus-within:ring-1 focus-within:ring-ring/40 focus-within:ring-offset-0">
                        <InputGroupInput name="departure_time" type="datetime-local" placeholder="eg. 2024-06-15 14:00" className="text-sm sm:text-base" required />
                        <InputGroupAddon align="block-start">
                          <InputGroupText className="text-xs sm:text-sm">Departure Time</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>

                    <Field orientation="horizontal">
                      <Checkbox
                        id="is_public"
                        name="is_public"
                        defaultChecked={false}
                        value="on"
                        className="focus-visible:ring-1 focus-visible:ring-offset-0"
                      />
                      <FieldContent>
                        <FieldLabel htmlFor="is_public">Public Group?</FieldLabel>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </form>
              </div>

              {/* Step 2 */}
              <div className="w-1/2 pl-2 overflow-y-auto max-h-[60vh] scrollbar-thin">
                <div className="flex flex-col gap-3 py-4">
                  <InputGroup className="h-auto focus-within:ring-1 focus-within:ring-ring/40 focus-within:ring-offset-0">
                    <InputGroupInput
                      placeholder="Search escorts by name or email"
                      value={escortSearch}
                      onChange={(e) => setEscortSearch(e.target.value)}
                      className="text-sm sm:text-base"
                    />
                    <InputGroupAddon>
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </InputGroupAddon>
                  </InputGroup>

                  <div className="flex flex-col gap-2">
                    {filteredEscorts.length === 0 && (
                      <span className="text-sm text-muted-foreground py-4 text-center">
                        No escorts match your search.
                      </span>
                    )}
                    {filteredEscorts.map((escort) => (
                      <EscortPickerRow
                        key={escort.id}
                        escort={escort}
                        selected={specificEscorts.includes(escort.id)}
                        onToggle={() => toggleEscort(escort.id)}
                        onViewProfile={() => setPreviewUserId(escort.id)}
                      />
                    ))}
                  </div>

                  {specificEscorts.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2">
                      <span className="text-sm">Selected ({specificEscorts.length}):</span>
                      <div className="flex flex-wrap gap-2">
                        {specificEscorts.map((escortId) => {
                          const escort = availableEscorts.find((e) => e.id === escortId);
                          if (!escort) return null;
                          return (
                            <Badge key={escortId} variant="secondary" className="flex items-center gap-2">
                              <Avatar className="h-5 w-5 border-2 border-primary-foreground">
                                <AvatarImage src={escort.avatar_url ?? ""} alt={escort.full_name || escort.email} />
                                <AvatarFallback className="text-xs">{getInitials(escort.full_name || escort.email)}</AvatarFallback>
                              </Avatar>
                              <span>{escort.full_name || escort.email}</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => toggleEscort(escortId)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full justify-between">
              {step === 1 ? (
                <>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button variant="default" type="button" onClick={goToEscortStep}>
                    Next <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" type="button" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button variant="default" type="submit" id="create-travel-group" form="createTravelGroup" disabled={!escortStepReady}>
                    Create {specificEscorts.length > 0 ? `(${specificEscorts.length} escort${specificEscorts.length > 1 ? "s" : ""})` : "(no escorts)"}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfilePreviewDialog userId={previewUserId} onOpenChange={(open) => !open && setPreviewUserId(null)} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function HomePageContent() {
  const searchParams = useSearchParams();
  const destination = searchParams.get("destination") ?? undefined;

  const [userId, setUserId] = useState<string>("");
  const [groups, setGroups] = useState<TravelGroupData[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [eligibility, setEligibility] = useState<EscorteeEligibility>("checking");
  const [specificEscorts, setSpecificEscorts] = useState<string[]>([]);
  const [availableEscorts, setAvailableEscorts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // Arriving with a ?destination= (e.g. from the "Where To?" shortcuts on
  // My Trips) opens the create dialog immediately with it prefilled.
  useEffect(() => {
    if (destination !== undefined) setIsCreateGroupOpen(true);
  }, [destination]);

  const aliveGroups = useMemo(() => groups.filter((group) => group.alive), [groups]);

  const fetchUserDataFor = async (db: ReturnType<typeof createClient>, group: TravelGroupData) => {
    const { data: userData } = await db
      .from("profiles")
      .select("*")
      .in("id", Array.from(new Set([...group.members, ...group.escorts, ...group.requested_escorts])));

    const idToUserData = new Map<string, TravelGroupUserData>();
    userData?.forEach((user) => {
      idToUserData.set(user.id, { id: user.id, name: user.full_name, avatar_url: user.avatar_url });
    });
    return idToUserData;
  };

  const refresh = async () => {
    const db = createClient();

    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    // Use the id we just fetched, not the `userId` state — setUserId()
    // above won't have flushed into this closure yet on the first run,
    // so reading `userId` here would query with an empty string.
    const currentUserId = user.id;
    setUserId(currentUserId);

    db.from("groups")
      .select("*")
      .eq("alive", true)
      .eq("is_public", true)
      .neq("created_by", currentUserId)
      .then(async ({ data }) => {
        if (!data) return;
        const groupsWithUserData = await Promise.all(
          data.map(async (grp) => ({ ...grp, idToUserData: await fetchUserDataFor(db, grp) }))
        );
        setGroups(groupsWithUserData);
      });

    // Escorts eligible to be requested for a trip — profiles flagged as
    // escorts who haven't graduated yet.
    db.from("profiles")
      .select("*")
      .eq("escort", true)
      .gt("graduation_date", new Date().toISOString())
      .then(({ data }) => {
        if (data) setAvailableEscorts(data);
      });

    const { data: profile } = await db
      .from("profiles")
      .select("escort, identity_status")
      .eq("id", currentUserId)
      .maybeSingle();

    // Escorts no longer have access to this page — they're routed elsewhere.
    if (profile?.escort) {
      setEligibility("escort_blocked");
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
    setLoading(false);
  };

  useEffect(() => {
    refresh();

    const db = createClient();
    const channel = db
      .channel("public:groups")
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, (payload) => {
        const updatedGroup = payload.new as TravelGroupData;

        if (payload.eventType === "DELETE") {
          setGroups((prevGroups) => prevGroups.filter((group) => group.id !== payload.old.id));
          return;
        }

        setGroups((prevGroups) => {
          const index = prevGroups.findIndex((group) => group.id === updatedGroup.id);
          if (index === -1) return [...prevGroups, updatedGroup];
          const newGroups = [...prevGroups];
          newGroups[index] = updatedGroup;
          return newGroups;
        });

        fetchUserDataFor(db, updatedGroup).then((idToUserData) => {
          setGroups((prevGroups) => {
            const index = prevGroups.findIndex((group) => group.id === updatedGroup.id);
            if (index === -1) return prevGroups;
            const newGroups = [...prevGroups];
            newGroups[index] = { ...newGroups[index], idToUserData };
            return newGroups;
          });
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleTravelGroupCreation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);

    const { success, error } = await createTravelGroup(formData.get("group_name") as string,
      parseInt(formData.get("capacity") as string, 10),
      formData.get("start_location") as string,
      formData.get("end_location") as string,
      new Date(formData.get("departure_time") as string).toISOString(),
      specificEscorts.length > 0,
      userId,
      specificEscorts,
      formData.get("is_public") === "on",
    );

    if (success) {
      setIsCreateGroupOpen(false);
      setSpecificEscorts([]);
      redirect("/trips");
    } else {
      console.error(error);
      toast.error(`Failed to create travel group: ${error}`);
    }
  };

  const browsableGroups = [...aliveGroups]
    .filter((group) => !hasDeparted(group.departure_time))
    .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());

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

  if (eligibility === "escort_blocked") {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground">
          This page is for escortees. As a registered escort, use your escort dashboard instead.
        </p>
        <Button asChild className="mt-4">
          <Link href="/escort">Go to escort dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-8">
      <div className="w-full flex justify-between items-center">
        <span className="md:text-lg font-semibold">Public groups forming now</span>
        <div className="flex gap-2 items-center">
          <span className="text-sm hidden md:block">Join one heading your way or</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <CreateGroup
              isCreateGroupOpen={isCreateGroupOpen}
              setIsCreateGroupOpen={setIsCreateGroupOpen}
              handleTravelGroupCreation={handleTravelGroupCreation}
              specificEscorts={specificEscorts}
              setSpecificEscorts={setSpecificEscorts}
              availableEscorts={availableEscorts}
              userId={userId}
              destination={destination}
            />
          </div>
        </div>
      </div>

      {browsableGroups.length === 0 ? (
        <div className="w-full h-full min-h-[70vh] flex justify-center items-center">
          <span className="text-sm text-muted-foreground">No groups available at the moment. Create one or check back later!</span>
        </div>
      ) : (
        <div className="h-160 grid grid-cols-1 gap-6 md:grid-cols-2 py-12 px-4 sm:px-6 scrollbar-none overflow-y-auto">
          {browsableGroups.map((group) => (
            <GroupCard key={group.id} data={group} currentUser={userId} onViewProfile={setPreviewUserId} />
          ))}
        </div>
      )}

      <ProfilePreviewDialog userId={previewUserId} onOpenChange={(open) => !open && setPreviewUserId(null)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}