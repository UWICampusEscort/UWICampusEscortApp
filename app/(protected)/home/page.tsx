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
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Profile } from "../profile/page";
import RequestEscortSearch from "./requestescortsearch";
import { createTravelGroup } from "@/app/actions";

type TravelGroupUserData = {
  id: string;
  name: string;
  avatar_url: string;
}

type TravelGroupData = {
  id: string;
  name: string;
  start_location: string;
  end_location: string;
  capacity: number;
  members: Array<string>;
  departure_time: string;
  escorts: Array<string>;
  created_at: string;
  created_by: string;
  requested_escorts: Array<string>;
  alive: boolean;
  rejected_escorts: Array<string>;
  banned_members: Array<string>;
  idToUserData: Map<string, TravelGroupUserData>;
}

const get_time_status = (time: string) => {
  const now = new Date();
  const departure = new Date(time);
  const diffInMinutes = Math.floor((departure.getTime() - now.getTime()) / 60000);
  if (diffInMinutes <= 0) return "Departed";
  if (diffInMinutes < 60) return `Leaving in ~${diffInMinutes} minutes`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  return `Leaving in ~${diffInHours} hours`;
};

const has_departed = (time: string) => {
  const now = new Date();
  const departure = new Date(time);
  return departure.getTime() <= now.getTime();
};

const TravelGroup = ({ data, current_user }: { data: TravelGroupData, current_user: string }) => {
  const [time, setTime] = useState<string>('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmingDestroy, setConfirmingDestroy] = useState(false);
  const [confirmingBan, setConfirmingBan] = useState("");
  const dismissConfirm = useRef<() => void>(() => { });

  const updateTime = () => {
    setTime(get_time_status(data.departure_time));
  };

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 30000); // Update every minute
    return () => clearInterval(interval);
  }, [data.departure_time]);

  useEffect(() => {
    if (!isDetailsOpen)
      dismissConfirm.current();
  }, [isDetailsOpen])

  const joinGroup = async () => {
    if (!!!current_user)
      return

    const db = createClient();
    const { data: success, error } = await db
      .rpc('add_group_member', {
        group_id: data.id,
        new_member: current_user,
      });

    if (error) {
      console.error('Error executing query:', error);
      toast.error('Error joining group. Please try again.\n' + error.message);
    } else if (success !== true) {
      toast.error('Group is full!');
    }
  }

  const kick = async (memberId: string) => {
    if (current_user !== data.created_by) {
      toast.error('Only the group owner can kick members.');
      return;
    }

    const db = createClient();
    const { data: success, error } = await db
      .rpc('remove_group_member', {
        group_id: data.id,
        member: memberId,
      });

    if (error) {
      console.error('Error executing query:', error);
      toast.error('Error kicking member. Please try again.\n' + error.message);
    } else if (success !== true) {
      toast.error('Failed to kick member.');
    }
  }

  const ban = async (memberId: string) => {
    if (current_user !== data.created_by) {
      toast.error('Only the group owner can ban members.');
      return;
    }

    const db = createClient();
    const { data: success, error } = await db
      .rpc('ban_group_member', {
        group_id: data.id,
        member: memberId,
      });

    if (error) {
      console.error('Error executing query:', error);
      toast.error('Error banning member. Please try again.\n' + error.message);
    } else if (success !== true) {
      toast.error('Failed to ban member.');
    }
  }

  const rejectEscort = async (escortId: string) => {
    if (current_user !== data.created_by) {
      toast.error('Only the group owner can reject escorts.');
      return;
    }

    const db = createClient();
    const { data: success, error } = await db
      .rpc('remove_group_escort', {
        group_id: data.id,
        escort: escortId,
      });

    if (error) {
      console.error('Error executing query:', error);
      toast.error('Error rejecting escort. Please try again.\n' + error.message);
    } else if (success !== true) {
      toast.error('Failed to reject escort.');
    }
  }

  const destroyGroup = async () => {
    if (current_user !== data.created_by) {
      toast.error('Only the group owner can destroy the group.');
      return;
    }

    const db = createClient();
    const { data: _, error } = await db.from("groups")
      .update({ alive: false })
      .eq("id", data.id);
    if (error) {
      console.error('Error destroying group:', error);
      toast.error('Error destroying group. Please try again.\n' + error.message);
    }
    setIsDetailsOpen(false);
  }

  return (
    <Card className="mb-6 w-full h-fit">
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
            {data.members.map((memberId) => {
              return <Avatar className="h-7 w-7 border-2 border-primary-foreground" key={memberId}>
                <AvatarImage src={data.idToUserData?.get(memberId)?.avatar_url} alt={data.name} />
                <AvatarFallback className="text-xs">{getInitials(data.idToUserData?.get(memberId)?.name || "Unknown")}</AvatarFallback>
              </Avatar>
            })}
          </AvatarGroup>

          <span className="text-sm">{data.members.length} of {data.capacity} spots filled</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-between items-center gap-4">
        {current_user && data.members.includes(current_user) ?
          <Button variant={"secondary"} size={"sm"} className="w-full" disabled>
            Already Joined
          </Button>
          : (data.banned_members.includes(current_user) ?
            <Button variant={"destructive"} size={"sm"} className="w-full" disabled>
              Banned from Group
            </Button>
            :
            <Button variant={"secondary"} size={"sm"} className="w-full" onClick={joinGroup}>
              Join Group
            </Button>
          )
        }

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <Button variant={"outline"} size={"sm"} className="w-full">Details</Button>
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

                  {(data.escorts.length > 0 || data.requested_escorts.length > 0) && <>
                    <span className="text-sm mt-2">Escorts ({data.escorts.length})</span>
                    <div className="h-48 overflow-y-auto overflow-x-hidden border inset border-border rounded-md p-1 scrollbar-thin">
                      {Array.from(new Set([...data.escorts, ...data.requested_escorts])).map((escortId) => {
                        return <div key={escortId} className="flex items-center gap-2 p-2">
                          <Avatar className="h-7 w-7 shrink-0 border-2 border-primary-foreground">
                            <AvatarImage src={data.idToUserData?.get(escortId)?.avatar_url} alt={data.name} />
                            <AvatarFallback className="text-xs">{getInitials(data.idToUserData?.get(escortId)?.name || "Unknown")}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm min-w-0 flex-1 truncate">
                            {data.idToUserData?.get(escortId)?.name || "Unknown"}
                          </span>

                          {current_user !== escortId && data.escorts.includes(escortId) &&
                            <Button variant={"destructive"} size={"sm"} className="ml-auto shrink-0" disabled={current_user !== data.created_by} onClick={() => rejectEscort(escortId)}>
                              {current_user === data.created_by ? "Reject" : "Reject (Owner Only)"}
                            </Button>
                          }

                          {!data.escorts.includes(escortId) && <Badge variant={"default"} className="shrink-0">Requested</Badge>}
                        </div>
                      })}
                    </div>
                  </>}

                  <span className="text-sm mt-2">Members ({data.members.length}/{data.capacity})</span>
                  <div className="h-48 overflow-y-auto overflow-x-hidden border inset border-border rounded-md p-1 scrollbar-thin">
                    {data.members.map((memberId) => {
                      return <div key={memberId} className="flex items-center gap-2 p-2">
                        <Avatar className="h-7 w-7 shrink-0 border-2 border-primary-foreground">
                          <AvatarImage src={data.idToUserData?.get(memberId)?.avatar_url} alt={data.name} />
                          <AvatarFallback className="text-xs">{getInitials(data.idToUserData?.get(memberId)?.name || "Unknown")}</AvatarFallback>
                        </Avatar>

                        <span className="text-sm line-clamp-1">
                          {data.idToUserData?.get(memberId)?.name || "~Unknown"}
                        </span>

                        {current_user !== memberId && current_user === data.created_by && <div className="flex gap-2 ml-auto shrink-0">
                          <Button variant={"destructive"} size={"sm"} onClick={() => kick(memberId)}>Kick</Button>
                          <Button variant={"destructive"} size={"sm"} onClick={() => {
                            if (confirmingBan === memberId) {
                              ban(memberId);
                              setConfirmingBan("");
                            } else {
                              setConfirmingBan(memberId);
                              setTimeout(() => setConfirmingBan(""), 3000);
                            }
                          }}>{confirmingBan === memberId ? "Are you sure?" : "Ban"}</Button>
                        </div>}
                      </div>
                    })}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <div className="flex gap-2 w-full justify-between">
                {current_user === data.created_by &&
                  <Button variant="destructive" size="sm" onClick={() => {
                    if (confirmingDestroy)
                      destroyGroup();
                    else {
                      setConfirmingDestroy(true);
                      setTimeout(() => setConfirmingDestroy(false), 3000);
                    }
                  }}>{confirmingDestroy ? "Are you sure?" : "Destroy"}</Button>
                }

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

const RequestEscort = ({ escortUsers, specificEscorts, setSpecificEscorts }: { escortUsers: Profile[], specificEscorts: string[], setSpecificEscorts: React.Dispatch<React.SetStateAction<string[]>> }) => {
  const [searchValue, setSearchValue] = useState<string>('');

  const handleRequestEscort = () => {
    const selectedEscort = escortUsers.find(e => e.email.toLowerCase() === searchValue.toLowerCase());
    if (selectedEscort)
      setSpecificEscorts(prev => [...prev, selectedEscort.id]);

    setSearchValue('');
  }


  return (<div className="flex flex-col gap-2 w-full">
    <div className="flex flex-col gap-2 mx-auto w-[90%] sm:w-[50%] min-w-[40vw]">
      <div className="flex gap-2">
        <Button variant={specificEscorts.length === 0 ? "default" : "outline"} size="sm" type="button" className="flex-1" onClick={() => setSpecificEscorts([])}>Any</Button>
        <Button variant={specificEscorts.length > 0 ? "default" : "outline"} size="sm" type="button" className="flex-1">Specific</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <RequestEscortSearch className="flex-3" escortUsers={escortUsers} value={searchValue} setValue={setSearchValue} />
        <Button variant={"outline"} size="sm" type="button" className="sm:flex-1" disabled={!searchValue} onClick={handleRequestEscort}>
          Request {escortUsers.find(e => e.email.toLowerCase() === searchValue.toLowerCase())?.full_name || searchValue} ({"XX"} credits)
        </Button>
      </div>

    </div>

    {specificEscorts.length > 0 && <div className="flex flex-col gap-2">
      <span className="text-sm">Requested Escorts:</span>
      <div className="flex flex-wrap gap-2">
        {specificEscorts.map((escortId) => {
          const escort = escortUsers.find(e => e.id === escortId);
          if (!escort) return null;
          return <Badge key={escortId} variant={"secondary"} className="flex items-center gap-2">
            <Avatar className="h-5 w-5 border-2 border-primary-foreground">
              <AvatarImage src={escort.avatar_url ?? ""} alt={escort.full_name || escort.email} />
              <AvatarFallback className="text-xs">{getInitials(escort.full_name || escort.email)}</AvatarFallback>
            </Avatar>
            <span>{escort.full_name || escort.email}</span>
            <Button variant={"ghost"} size={"icon"} onClick={() => setSpecificEscorts(prev => prev.filter(id => id !== escortId))}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </Badge>
        })}
      </div>
    </div>}
  </div>);
};

export default function HomePage() {
  const [userId, setUserId] = useState<string>('');
  const [groups, setGroups] = useState<TravelGroupData[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [requestingEscort, setRequestingEscort] = useState(false);
  const [specificEscorts, setSpecificEscorts] = useState<string[]>([]);

  const [availableEscorts, setAvailableEscorts] = useState<Profile[]>([]);

  const refresh = async () => {
    const db = createClient();

    db.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });

    db.from("groups")
      .select("*")
      .eq("alive", true)
      .then(async ({ data }) => {
        var groupsWithUserData: TravelGroupData[] = [];
        if (data) {
          await Promise.all(data.map(async (grp) => {
            const { data: userData } = await db.from("profiles")
              .select("*")
              .in("id", Array.from(new Set([...grp.members, ...grp.escorts, ...grp.requested_escorts])));
            if (userData) {
              const idToUserData = new Map<string, TravelGroupUserData>();
              userData.forEach(user => {
                idToUserData.set(user.id, {
                  id: user.id,
                  name: user.full_name,
                  avatar_url: user.avatar_url
                });
              });
              groupsWithUserData.push({
                ...grp,
                idToUserData
              });
            }
          }));
        }
        setGroups(groupsWithUserData);
      });

    db.from("profiles")
      .select("*")
      .eq("escort", true)
      .gt("graduation_date", new Date().toISOString())
      .then(({ data }) => {
        if (data) {
          setAvailableEscorts(data);
        }
      });
  };

  useEffect(() => {
    refresh();

    const db = createClient();

    const channel = db.channel('public:groups').on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, payload => {
      // update/add only the affected record
      const updatedGroup = payload.new as TravelGroupData;
      if (payload.eventType === 'DELETE') {
        setGroups(prevGroups => prevGroups.filter(group => group.id !== payload.old.id));
      }
      else
        setGroups(prevGroups => {
          const index = prevGroups.findIndex(group => group.id === updatedGroup.id);
          var newGroups: TravelGroupData[] = [];

          if (index !== -1) {
            // Update existing group
            newGroups = [...prevGroups];
            newGroups[index] = updatedGroup;
          } else {
            // Add new group
            newGroups = [...prevGroups, updatedGroup];
          }

          return newGroups;
        });

      // Rebuild the idToUserData map for the updated group by fetching user data from the profiles table
      if (payload.eventType === 'DELETE')
        return;

      db.from("profiles")
        .select("*")
        .in("id", Array.from(new Set([...updatedGroup.members, ...updatedGroup.escorts, ...updatedGroup.requested_escorts])))
        .then(({ data: userData }) => {
          if (userData) {
            const idToUserData = new Map<string, TravelGroupUserData>();
            userData.forEach(user => {
              idToUserData.set(user.id, {
                id: user.id,
                name: user.full_name,
                avatar_url: user.avatar_url
              });
            });

            setGroups(prevGroups => {
              const index = prevGroups.findIndex(group => group.id === updatedGroup.id);
              if (index !== -1) {
                const updatedGroup = { ...prevGroups[index], idToUserData };
                const newGroups = [...prevGroups];
                newGroups[index] = updatedGroup;
                return newGroups;
              }
              return prevGroups;
            });
          }
        });
    }).subscribe();
    return () => {
      channel.unsubscribe();
    };

  }, []);

  const handleTravelGroupCreation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const groupName = formData.get("group_name") as string;
    const capacity = parseInt(formData.get("capacity") as string, 10);
    const startLocation = formData.get("start_location") as string;
    const endLocation = formData.get("end_location") as string;
    const departureTime = formData.get("departure_time") as string;
    const requestEscorts = formData.get("request_escorts") === "on";

    const { success, error } = await createTravelGroup({
      groupName,
      capacity,
      startLocation,
      endLocation,
      departureTime,
      requestEscorts,
      userId,
      specificEscorts
    });

    if (success) {
      setIsCreateGroupOpen(false);
      setRequestingEscort(false);
      setSpecificEscorts([]);
    } else {
      toast.error(`Failed to create travel group: ${error}`);
      console.log(error)
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-8">
      <div className="w-full flex justify-between items-center">
        <span className="md:text-lg font-semibold  ">Groups forming now</span>
        <div className="flex gap-2 items-center">
          <span className="text-sm hidden md:block">Join one heading your way or</span>
          <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
            <DialogTrigger asChild>
              <Button variant={"default"} size={"sm"}>Create new</Button>
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
                        <InputGroupInput
                          name="group_name"
                          placeholder="eg. travellers009"
                          className="text-sm sm:text-base"
                          required
                        />
                        <InputGroupAddon align="block-start">
                          <InputGroupText className="text-xs sm:text-sm">Group Name</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>

                    <Field>
                      <InputGroup className="h-auto">
                        <InputGroupInput
                          name="capacity"
                          type="number"
                          placeholder="eg. 3"
                          className="text-sm sm:text-base"
                          required
                        />
                        <InputGroupAddon align="block-start">
                          <InputGroupText className="text-xs sm:text-sm">Capacity</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <div className="flex w-full gap-4">
                    <Field>
                      <InputGroup className="h-auto">
                        <InputGroupInput
                          name="start_location"
                          placeholder="eg. FST Block Entrance"
                          className="text-sm sm:text-base"
                          required
                        />
                        <InputGroupAddon align="block-start">
                          <InputGroupText className="text-xs sm:text-sm">Start Location</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>

                    <Field>
                      <InputGroup className="h-auto">
                        <InputGroupInput
                          name="end_location"
                          placeholder="eg. Seacole Entrance"
                          className="text-sm sm:text-base"
                          required
                        />
                        <InputGroupAddon align="block-start">
                          <InputGroupText className="text-xs sm:text-sm">End Location</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>
                  </div>

                  <Field>
                    <InputGroup className="h-auto">
                      <InputGroupInput
                        name="departure_time"
                        type="datetime-local"
                        placeholder="eg. 2024-06-15 14:00"
                        className="text-sm sm:text-base"
                        required
                      />
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
                      <FieldLabel htmlFor="request_escorts">
                        Request Escort(s)?
                      </FieldLabel>
                    </FieldContent>
                  </Field>

                  {requestingEscort && <>
                    <span className="text-xs sm:text-sm text-muted-foreground">Please note that escorts may not always be available.</span>

                    <div className="flex gap-2 items-center">
                      <RequestEscort escortUsers={availableEscorts} specificEscorts={specificEscorts} setSpecificEscorts={setSpecificEscorts} />
                    </div>
                  </>}

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
        </div>
      </div>

      <div className="h-160 grid grid-cols-1 gap-6 md:grid-cols-2 py-12 px-4 sm:px-6 scrollbar-none overflow-y-auto">
        {groups.filter(group => group.alive).map((group) => (has_departed(group.departure_time) ? null :
          <TravelGroup key={group.id} data={group} current_user={userId} />
        ))}
      </div>
    </div>
  );
}
