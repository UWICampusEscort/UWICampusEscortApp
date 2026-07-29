import {
  Phone,
  MapPin,
  Moon,
  Bus,
  Smartphone,
  Home,
  Eye,
  Siren,
  Users,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CAMPUS_SECURITY, CAMPUS_SECURITY_HREF } from "@/lib/constants";

type TipSection = {
  title: string;
  description: string;
  icon: typeof Phone;
  tips: string[];
};

const sections: TipSection[] = [
  {
    title: "Before You Head Out",
    description: "A little planning goes a long way.",
    icon: MapPin,
    tips: [
      "Share your route and expected arrival time with a friend, roommate, or family member.",
      "Charge your phone fully before heading out, and keep a portable charger in your bag if you'll be out late.",
      "Know the fastest route between your building and the nearest well-lit, populated area.",
      "Save Campus Security's number and the Escort Service number directly in your phone's favorites, not just your contacts list.",
      "If you've been drinking or are otherwise not feeling 100% yourself, request an escort rather than walking alone.",
      "Check the weather and lighting conditions along your route, especially after dusk.",
    ],
  },
  {
    title: "Using the Campus Escort Service",
    description: "How to get the most out of the program.",
    icon: Users,
    tips: [
      "Request an escort for any walk after dark, not just late at night — visibility drops fast at dusk.",
      "Confirm the name and photo of your assigned escort in the app before they arrive.",
      "Wait for your escort in a well-lit, visible spot — near an entrance or under a working light, not in a shadowed corner.",
      "If your escort ever asks you to go somewhere off the confirmed route, decline and contact dispatch immediately.",
      "Rate and report your experience after every trip — it's how the program catches problems early.",
      "The service is free and unlimited — never feel like you're \"using it too much.\"",
    ],
  },
  {
    title: "Walking on Campus at Night",
    description: "If you are walking without an escort.",
    icon: Moon,
    tips: [
      "Stick to main paths and well-lit walkways, even if a shortcut through a dark area is faster.",
      "Walk with a friend whenever possible — there's real safety in numbers.",
      "Keep your phone accessible but your eyes and ears free — save the earbuds and scrolling for when you're indoors.",
      "Walk facing traffic on roads without sidewalks so you can see approaching vehicles.",
      "Trust your instincts — if a path or person feels wrong, cross the street, turn around, or head into a nearby open building.",
      "Vary your routine occasionally so your movements aren't predictable to someone watching.",
    ],
  },
  {
    title: "Public Transport & Rideshares",
    description: "Getting to and from campus safely.",
    icon: Bus,
    tips: [
      "Verify the license plate, driver name, and photo match your rideshare app before getting in.",
      "Sit in the back seat of rideshares, and share your trip status with a friend using the app's live-tracking feature.",
      "Wait for buses and taxis in well-lit, populated stops — not isolated corners.",
      "Keep valuables out of sight while commuting, especially at night.",
      "If a driver deviates from the expected route, say so out loud and ask them to correct course — or ask to be let out in a public, well-lit area.",
    ],
  },
  {
    title: "Personal & Digital Safety",
    description: "Protecting your information as well as yourself.",
    icon: Smartphone,
    tips: [
      "Avoid publicly posting your real-time location, class schedule, or home address on social media.",
      "Use your phone's built-in emergency SOS feature and know how to trigger it quickly (most phones support rapid button presses).",
      "Turn on location sharing with a trusted contact when heading somewhere unfamiliar.",
      "Be cautious about how much personal detail you share with people you've only met online before meeting in person — meet in public, tell someone where you'll be.",
      "Keep your student ID and any campus-safety apps easily accessible, not buried in a bag.",
    ],
  },
  {
    title: "Residence & Dorm Safety",
    description: "Safety doesn't stop once you're home.",
    icon: Home,
    tips: [
      "Always lock your door and windows, even for quick trips down the hall.",
      "Don't prop open exterior doors — it defeats the building's access control for everyone, not just you.",
      "Don't let unfamiliar people follow you into a secured building, even if they seem to belong there.",
      "Know your building's fire exits and emergency assembly point in addition to the main entrance.",
      "Report broken locks, lighting, or door sensors to campus facilities right away rather than assuming someone else will.",
    ],
  },
  {
    title: "Staying Aware of Your Surroundings",
    description: "Situational awareness is your first line of defense.",
    icon: Eye,
    tips: [
      "Keep your head up and take out one earbud in low-traffic areas so you can hear what's around you.",
      "Notice who's nearby and where the closest exits, open businesses, or blue-light emergency phones are.",
      "If you feel like you're being followed, head toward the nearest populated, well-lit area — a store, security post, or open building — rather than straight home.",
      "Carry your keys or a personal alarm in hand, not buried in the bottom of a bag, when walking to your door at night.",
      "Trust discomfort over politeness — it's okay to cross the street, end a conversation, or walk away.",
    ],
  },
  {
    title: "In an Emergency",
    description: "What to do if something happens right now.",
    icon: Siren,
    tips: [
      "Call Campus Security or local emergency services immediately — don't wait to see if the situation resolves itself.",
      "If you can't speak safely, text where your phone system supports it, or use your emergency app's silent alert feature.",
      "Move toward people, light, and noise if you're able to — isolation favors an attacker, crowds don't.",
      "Yell a specific instruction like \"call security\" or \"call 911\" rather than just screaming — it prompts bystanders to act.",
      "After the immediate danger has passed, report the incident to Campus Security so the area and pattern can be tracked.",
    ],
  },
  {
    title: "Protecting Your Belongings",
    description: "Reducing the risk of theft alongside personal safety.",
    icon: Lock,
    tips: [
      "Never leave laptops, phones, or bags unattended in libraries, cafes, or common areas — even for \"just a minute.\"",
      "Use the lock features on your laptop and phone, and enable remote-wipe/find-my-device tools in case of loss or theft.",
      "Register bikes and other valuables with campus security where the program exists — it speeds up recovery if something is stolen.",
      "Keep photos and serial numbers of your electronics somewhere safe, off the device itself.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Safety Tips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practical guidance for getting around campus safely, day or night —
          whether you're using the Escort Service or on your own.
        </p>
      </div>

      {/* Emergency banner */}
      <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Siren className="h-5 w-5 shrink-0 text-destructive" />
          <p className="font-medium">
            In an emergency, call Campus Security first — every second
            counts.
          </p>
        </div>
        <a
          href={`tel:${CAMPUS_SECURITY_HREF}`}
          className="flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
        >
          <Phone className="h-4 w-4" />
          {CAMPUS_SECURITY}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        These tips are general guidance and don't replace the judgment of
        Campus Security or local emergency services. If you're ever unsure,
        call for help.
      </p>
    </div>
  );
}