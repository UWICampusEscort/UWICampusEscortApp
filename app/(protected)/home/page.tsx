 "use client"
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

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

  const updateTime = () => {
    setTime(get_time_status(data.departure_time));
  };

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 30000); // Update every minute
    return () => clearInterval(interval);
  }, [data.departure_time]);

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
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          { current_user && data.members.includes(current_user) ?
            <Button variant={"secondary"} size={"sm"} className="w-full" disabled>
              Already Joined
            </Button>
            :
            <Button variant={"secondary"} size={"sm"} className="w-full" onClick={joinGroup}>
              Join Group
            </Button>
          }
        </CardContent>
      </Card>
  );
};

export default function HomePage() {
  const [userId, setUserId] = useState<string>('');
  const [groups, setGroups] = useState<TravelGroupData[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const refresh = async () => {
    const db = createClient();

    db.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });

    db.from("groups")
      .select("*")
      .then(async ({ data }) => {
        var groupsWithUserData: TravelGroupData[] = [];
        if (data) {
          await Promise.all(data.map(async (grp) => {
            const { data: userData } = await db.from("profiles")
              .select("*")
              .in("id", grp.members);
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
  };

  useEffect(() => {
    refresh();

    const db = createClient();

    const channel = db.channel('public:groups').on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, payload => {
      // update/add only the affected record
      const updatedGroup = payload.new as TravelGroupData;
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
      db.from("profiles")
        .select("*")
        .in("id", updatedGroup.members)
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
    
    const db = createClient();
    const { data, error } = await db.from("groups").insert([{
      name: groupName,
      capacity: capacity,
      start_location: startLocation,
      end_location: endLocation,
      departure_time: new Date(departureTime).toISOString(),
      members: [userId],
      requested_escorts: requestEscorts ? [] : [],
    }]);

    if (error) {
      console.error('Error creating travel group:', error);
      toast.error('Error creating travel group. Please try again.\n' + error.message);
    } 
    else {
      setIsCreateGroupOpen(false);
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
            <DialogContent className="min-w-[75vw]">
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
                        defaultChecked={false}
                      />
                      <FieldContent>
                        <FieldLabel htmlFor="request_escorts">
                          Request Escort(s)?
                        </FieldLabel>
                      </FieldContent>
                    </Field>

                  </FieldGroup>
                </form>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="reset" form="createTravelGroup">Cancel</Button>
                </DialogClose>
                 <Button variant="default" type="submit" form="createTravelGroup">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="h-160 grid grid-cols-1 gap-6 md:grid-cols-2 py-12 px-4 sm:px-6 scrollbar-none overflow-y-auto">
        {groups.map((group) => (has_departed(group.departure_time) ? null :
          <TravelGroup key={group.id} data={group} current_user={userId} />
        ))}
      </div>
    </div>
  );
}
