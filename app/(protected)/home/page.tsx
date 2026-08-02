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
import { getInitials } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Profile } from "../profile/page";
import RequestEscortSearch from "./requestescortsearch";
import { createTravelGroup } from "@/app/actions";
import Link from "next/link";

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
// Shared, reusable pieces (previously duplicated across the two card types)
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
  /** Omit to render escorts read-only (no reject action at all). */
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
  onKick?: (memberId: string) => void;
  onBan?: (memberId: string) => void;
}) => {
  const [confirmingBan, setConfirmingBan] = useState("");

  return (
    <>
      <span className="text-sm mt-2">Members ({data.members.length}/{data.capacity})</span>
      <div className="h-48 overflow-y-auto overflow-x-hidden border inset border-border rounded-md p-1 scrollbar-thin">
        {data.members.map((memberId) => {
          const name = data.idToUserData?.get(memberId)?.name || "~Unknown";
          const canManage = isOwner && currentUser !== memberId && onKick && onBan;
          return (
            <div key={memberId} className="flex items-center gap-2 p-2">
              <Link href={`/profile/${memberId}`} className="flex gap-2 items-center w-full h-full">
                <UserAvatar userId={memberId} data={data} />
                <span className="text-sm line-clamp-1">{name}</span>
              </Link>

              {canManage && (
                <div className="flex gap-2 ml-auto shrink-0">
                  <Button variant="destructive" size="sm" onClick={() => onKick!(memberId)}>Kick</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirmingBan === memberId) {
                        onBan!(memberId);
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
// Group card — replaces the old EscortTravelGroup / TravelGroup duplicate pair
// ---------------------------------------------------------------------------

type GroupCardVariant = "browse" | "escort";

const GroupCard = ({
  data,
  currentUser,
  variant,
}: {
  data: TravelGroupData;
  currentUser: string;
  variant: GroupCardVariant;
}) => {
  const time = useDepartureCountdown(data.departure_time);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmingDestroy, setConfirmingDestroy] = useState(false);

  const isOwner = currentUser === data.created_by;
  const isBrowseVariant = variant === "browse";

  // Reset the "are you sure" state whenever the details dialog is reopened,
  // instead of the previous ref-based callback that was never wired up.
  useEffect(() => {
    if (!isDetailsOpen) setConfirmingDestroy(false);
  }, [isDetailsOpen]);

  const joinGroup = async () => {
    if (!currentUser) return;
    const db = createClient();
    const { data: success, error } = await db.rpc("add_group_member", {
      group_id: data.id,
      new_member: currentUser,
    });
    if (error) {
      console.error("Error executing query:", error);
      toast.error("Error joining group. Please try again.\n" + error.message);
    } else if (success !== true) {
      toast.error("Group is full!");
    }
  };

  const escortGroup = async () => {
    if (!currentUser || currentUser === data.created_by) return;
    const db = createClient();
    const { error } = await db.rpc("add_group_escort", {
      group_id: data.id,
      escort: currentUser,
    });
    if (error) {
      console.error("Error executing query:", error);
      toast.error("Error escorting group. Please try again.\n" + error.message);
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
    if (isBrowseVariant) {
      if (currentUser && data.members.includes(currentUser)) {
        return <Button variant="secondary" size="sm" className="w-full" disabled>Already Joined</Button>;
      }
      if (data.banned_members.includes(currentUser)) {
        return <Button variant="destructive" size="sm" className="w-full" disabled>Banned from Group</Button>;
      }
      return <Button variant="secondary" size="sm" className="w-full" onClick={joinGroup}>Join Group</Button>;
    }

    if (currentUser && data.escorts.includes(currentUser)) {
      return <Button variant="secondary" size="sm" className="w-full" disabled>Already Escorting</Button>;
    }
    if (data.rejected_escorts.includes(currentUser)) {
      return <Button variant="destructive" size="sm" className="w-full" disabled>Rejected from Group</Button>;
    }
    return (
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={escortGroup}
        disabled={currentUser === data.created_by || hasDeparted(data.departure_time)}
      >
        Escort Group{data.requested_escorts.includes(currentUser) ? " (Requested)" : ""}
      </Button>
    );
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

                  <EscortsList
                    data={data}
                    canReject={isOwner}
                    onReject={isBrowseVariant ? rejectEscort : undefined}
                  />

                  <MembersList
                    data={data}
                    currentUser={currentUser}
                    isOwner={isBrowseVariant && isOwner}
                    onKick={isBrowseVariant ? kick : undefined}
                    onBan={isBrowseVariant ? ban : undefined}
                  />
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <div className="flex gap-2 w-full justify-between">
                {isBrowseVariant && isOwner && (
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
// Escort request picker (used inside the "Create Group" form)
// ---------------------------------------------------------------------------

const RequestEscort = ({
  escortUsers,
  specificEscorts,
  setSpecificEscorts,
}: {
  escortUsers: Profile[];
  specificEscorts: string[];
  setSpecificEscorts: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const [searchValue, setSearchValue] = useState<string>("");
  const matchedEscort = escortUsers.find((e) => e.email.toLowerCase() === searchValue.toLowerCase());

  const handleRequestEscort = () => {
    if (matchedEscort && !specificEscorts.includes(matchedEscort.id)) {
      setSpecificEscorts((prev) => [...prev, matchedEscort.id]);
    }
    setSearchValue("");
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col gap-2 mx-auto w-[90%] sm:w-[50%] min-w-[40vw]">
        <div className="flex gap-2">
          <Button
            variant={specificEscorts.length === 0 ? "default" : "outline"}
            size="sm"
            type="button"
            className="flex-1"
            onClick={() => setSpecificEscorts([])}
          >
            Any
          </Button>
          {/* "Specific" mode is entered implicitly by adding an escort below;
              this is a status indicator rather than a separate clickable action. */}
          <Button variant={specificEscorts.length > 0 ? "default" : "outline"} size="sm" type="button" className="flex-1" disabled>
            Specific
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <RequestEscortSearch className="flex-3" escortUsers={escortUsers} value={searchValue} setValue={setSearchValue} />
          <Button variant="outline" size="sm" type="button" className="sm:flex-1" disabled={!searchValue} onClick={handleRequestEscort}>
            {/* TODO: wire up real credit cost once available from the backend */}
            Request {matchedEscort?.full_name || searchValue} (XX credits)
          </Button>
        </div>
      </div>

      {specificEscorts.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm">Requested Escorts:</span>
          <div className="flex flex-wrap gap-2">
            {specificEscorts.map((escortId) => {
              const escort = escortUsers.find((e) => e.id === escortId);
              if (!escort) return null;
              return (
                <Badge key={escortId} variant="secondary" className="flex items-center gap-2">
                  <Avatar className="h-5 w-5 border-2 border-primary-foreground">
                    <AvatarImage src={escort.avatar_url ?? ""} alt={escort.full_name || escort.email} />
                    <AvatarFallback className="text-xs">{getInitials(escort.full_name || escort.email)}</AvatarFallback>
                  </Avatar>
                  <span>{escort.full_name || escort.email}</span>
                  <Button variant="ghost" size="icon" onClick={() => setSpecificEscorts((prev) => prev.filter((id) => id !== escortId))}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateGroup = ({ isCreateGroupOpen, setIsCreateGroupOpen, handleTravelGroupCreation, requestingEscort, setRequestingEscort, specificEscorts, setSpecificEscorts, availableEscorts, userId }: { isCreateGroupOpen: boolean; setIsCreateGroupOpen: React.Dispatch<React.SetStateAction<boolean>>; handleTravelGroupCreation: (event: React.FormEvent<HTMLFormElement>) => Promise<void>; requestingEscort: boolean; setRequestingEscort: React.Dispatch<React.SetStateAction<boolean>>; specificEscorts: string[]; setSpecificEscorts: React.Dispatch<React.SetStateAction<string[]>>; availableEscorts: Profile[]; userId: string; }) => (
  <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
    <DialogTrigger asChild>
      <Button variant="secondary" size="sm">Create</Button>
    </DialogTrigger>
    <DialogContent className="min-w-[75vw] max-h-[85vh] overflow-x-hidden overflow-y-auto scrollbar-thin">
      <DialogHeader>
        <DialogTitle className="text-sm sm:text-base">Create Travel Group</DialogTitle>
        <DialogDescription className="text-xs sm:text-sm">
          Create a new group to travel together with others heading your way. You may also request escorts to join your group for added safety.
        </DialogDescription>
      </DialogHeader>
      <form className="flex flex-col w-full gap-4 py-4" id="createTravelGroup" onSubmit={handleTravelGroupCreation}>
        <FieldGroup>
          <div className="flex w-full gap-4">
            <Field>
              <InputGroup className="h-auto">
                <InputGroupInput name="group_name" placeholder="eg. travellers009" className="text-sm sm:text-base" required />
                <InputGroupAddon align="block-start">
                  <InputGroupText className="text-xs sm:text-sm">Group Name</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <InputGroup className="h-auto">
                <InputGroupInput name="capacity" type="number" placeholder="eg. 3" className="text-sm sm:text-base" required />
                <InputGroupAddon align="block-start">
                  <InputGroupText className="text-xs sm:text-sm">Capacity</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>

          <div className="flex w-full gap-4">
            <Field>
              <InputGroup className="h-auto">
                <InputGroupInput name="start_location" placeholder="eg. FST Block Entrance" className="text-sm sm:text-base" required />
                <InputGroupAddon align="block-start">
                  <InputGroupText className="text-xs sm:text-sm">Start Location</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <InputGroup className="h-auto">
                <InputGroupInput name="end_location" placeholder="eg. Seacole Entrance" className="text-sm sm:text-base" required />
                <InputGroupAddon align="block-start">
                  <InputGroupText className="text-xs sm:text-sm">End Location</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>

          <Field>
            <InputGroup className="h-auto">
              <InputGroupInput name="departure_time" type="datetime-local" placeholder="eg. 2024-06-15 14:00" className="text-sm sm:text-base" required />
              <InputGroupAddon align="block-start">
                <InputGroupText className="text-xs sm:text-sm">Departure Time</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="request_escorts"
              name="request_escorts"
              defaultChecked={requestingEscort}
              onCheckedChange={(v: boolean) => setRequestingEscort(v)}
              value={requestingEscort ? "on" : "off"}
            />
            <FieldContent>
              <FieldLabel htmlFor="request_escorts">Request Escort(s)?</FieldLabel>
            </FieldContent>
          </Field>

          {requestingEscort && (
            <>
              <span className="text-xs sm:text-sm text-muted-foreground">Please note that escorts may not always be available.</span>
              <div className="flex gap-2 items-center">
                <RequestEscort
                  escortUsers={availableEscorts.filter((user) => user.id !== userId)}
                  specificEscorts={specificEscorts}
                  setSpecificEscorts={setSpecificEscorts}
                />
              </div>
            </>
          )}
        </FieldGroup>
      </form>
      <DialogFooter>
        <div className="flex gap-2 w-full justify-between">
          <DialogClose asChild>
            <Button variant="outline" type="reset" form="createTravelGroup">Cancel</Button>
          </DialogClose>
          <Button variant="default" type="submit" form="createTravelGroup">Create</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const EscortGroup = ({ groups, userId, isEscortGroupOpen, setIsEscortGroupOpen }: { groups: TravelGroupData[]; userId: string; isEscortGroupOpen: boolean; setIsEscortGroupOpen: React.Dispatch<React.SetStateAction<boolean>>; }) => {
  const escortableGroups = groups
    .filter(
      (group) =>
        group.alive &&
        group.need_escort &&
        !hasDeparted(group.departure_time) &&
        (group.requested_escorts.length === 0 || group.requested_escorts.includes(userId))
    )
    .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());

  return (
    <Dialog open={isEscortGroupOpen} onOpenChange={setIsEscortGroupOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Escort</Button>
      </DialogTrigger>
      <DialogContent className="min-w-[75vw] max-h-[85vh] overflow-x-hidden overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">Escort Travel Group</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Escort a group traveling together with others heading your way.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 w-full h-[60vh] overflow-y-auto scrollbar-thin px-4 py-4">
          {escortableGroups.map((group) => (
            <GroupCard key={group.id} data={group} currentUser={userId} variant="escort" />
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [userId, setUserId] = useState<string>("");
  const [groups, setGroups] = useState<TravelGroupData[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isEscortGroupOpen, setIsEscortGroupOpen] = useState(false);
  const [requestingEscort, setRequestingEscort] = useState(false);
  const [specificEscorts, setSpecificEscorts] = useState<string[]>([]);
  const [availableEscorts, setAvailableEscorts] = useState<Profile[]>([]);

  // Derived rather than duplicated in state — avoids an extra render pass
  // every time `groups` changes.
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

    db.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    db.from("groups")
      .select("*")
      .eq("alive", true)
      .then(async ({ data }) => {
        if (!data) return;
        const groupsWithUserData = await Promise.all(
          data.map(async (grp) => ({ ...grp, idToUserData: await fetchUserDataFor(db, grp) }))
        );
        setGroups(groupsWithUserData);
      });

    db.from("profiles")
      .select("*")
      .eq("escort", true)
      .gt("graduation_date", new Date().toISOString())
      .then(({ data }) => {
        if (data) setAvailableEscorts(data);
      });
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

    const { success, error } = await createTravelGroup({
      groupName: formData.get("group_name") as string,
      capacity: parseInt(formData.get("capacity") as string, 10),
      startLocation: formData.get("start_location") as string,
      endLocation: formData.get("end_location") as string,
      departureTime: formData.get("departure_time") as string,
      requestEscorts: formData.get("request_escorts") === "on",
      userId,
      specificEscorts,
    });

    if (success) {
      setIsCreateGroupOpen(false);
      setRequestingEscort(false);
      setSpecificEscorts([]);
    } else {
      console.error(error);
      toast.error(`Failed to create travel group: ${error}`);
    }
  };

  const browsableGroups = [...aliveGroups]
    .filter((group) => !hasDeparted(group.departure_time))
    .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-8">
      <div className="w-full flex justify-between items-center">
        <span className="md:text-lg font-semibold">Groups forming now</span>
        <div className="flex gap-2 items-center">
          <span className="text-sm hidden md:block">Join one heading your way or</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <CreateGroup
              isCreateGroupOpen={isCreateGroupOpen}
              setIsCreateGroupOpen={setIsCreateGroupOpen}
              handleTravelGroupCreation={handleTravelGroupCreation}
              requestingEscort={requestingEscort}
              setRequestingEscort={setRequestingEscort}
              specificEscorts={specificEscorts}
              setSpecificEscorts={setSpecificEscorts}
              availableEscorts={availableEscorts}
              userId={userId}
            />
            {availableEscorts.some((user) => user.id === userId) && (
              <EscortGroup
                groups={groups}
                userId={userId}
                isEscortGroupOpen={isEscortGroupOpen}
                setIsEscortGroupOpen={setIsEscortGroupOpen}
              />
            )}
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
            <GroupCard key={group.id} data={group} currentUser={userId} variant="browse" />
          ))}
        </div>
      )}
    </div>
  );
}