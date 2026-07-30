import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";

const TravelGroup = () => {
  return (
    <Card className="mb-6 w-full h-fit">
        <CardHeader>
          <CardTitle className="text-base flex flex-col gap-2">
            <span>{"Group Name"}</span>
            <div className="flex flex-col sm:flex-row justify-between overflow-x-auto scrollbar-none">
              <span className="text-sm font-semibold">{"Location A -> Location B"}</span>
              <span className="text-sm text-muted-foreground font-normal min-w-fit">{"Leaving in ~8 minutes"}</span>
            </div>
          </CardTitle>

          <CardDescription>
            <AvatarGroup className="overflow-x-auto scrollbar-none">
              <Avatar className="h-7 w-7 border-2 border-primary-foreground">
                <AvatarImage src={"https://via.placeholder.com/150"} alt={"User Name"} />
                <AvatarFallback className="text-xs">{getInitials("User Name")}</AvatarFallback>
              </Avatar>

              <Avatar className="h-7 w-7 border-2 border-primary-foreground">
                <AvatarImage src={"https://via.placeholder.com/150"} alt={"User Name"} />
                <AvatarFallback className="text-xs">{getInitials("User Name")}</AvatarFallback>
              </Avatar>

              <Avatar className="h-7 w-7 border-2 border-primary-foreground">
                <AvatarImage src={"https://via.placeholder.com/150"} alt={"User Name"} />
                <AvatarFallback className="text-xs">{getInitials("User Name")}</AvatarFallback>
              </Avatar>
            </AvatarGroup>

            <span className="text-sm">{3} of {6} spots filled</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button variant={"secondary"} size={"sm"} className="w-full">
            Join Group
          </Button>
        </CardContent>
      </Card>
  );
};

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-8">
      <div className="w-full flex justify-between items-center">
        <span className="md:text-lg font-semibold  ">Groups forming now</span>
        <div className="flex gap-2 items-center">
          <span className="text-sm hidden md:block">Join one heading your way or</span>
          <Button variant={"default"} size={"sm"}>Create new</Button>
        </div>
      </div>

      <div className="h-[640px] grid grid-cols-1 gap-6 md:grid-cols-2 py-12 px-4 sm:px-6 overflow-y-auto">
        {Array(6).fill(0).map((_, index) => (
          <TravelGroup key={index} />
        ))}
      </div>
    </div>
  );
}
