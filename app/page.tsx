"use client";

import Link from "next/link";
import {
  ShieldCheck,
  MapPinned,
  Clock,
  UserCheck,
  Bell,
  ArrowRight,
  UserPlus,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";

const stats = [
  { label: "Free & unlimited groups", value: "$0" },
  { label: "Available", value: "24/7" },
  { label: "ID-verified escorts", value: "100%" },
  { label: "Campus", value: "Mona" },
];

const steps = [
  {
    icon: UserPlus,
    title: "Verify your account",
    description:
      "Confirm your email, phone, and identity once — it keeps every trip on the platform trustworthy.",
  },
  {
    icon: MapPinned,
    title: "Create a group",
    description:
      "Set your start and end point. As many as you decide, will be able to join your journey. You may also request available, verified escorts.",
  },
  {
    icon: Navigation,
    title: "Track it live",
    description:
      "See your escort's location in real time from request to arrival, and share it with a friend.",
  },
  {
    icon: CheckCircle2,
    title: "Arrive safely",
    description:
      "Confirm you've reached your destination. Rate the trip so the program keeps improving.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Verified escorts only",
    description:
      "Every escort completes ID verification before they can accept a single request.",
  },
  {
    icon: Clock,
    title: "Day or night",
    description:
      "Most incidents happen at dusk, not just midnight — the service runs around the clock.",
  },
  {
    icon: Bell,
    title: "Built-in emergency alerts",
    description:
      "One tap connects you to Campus Security if something feels wrong mid-trip.",
  },
  {
    icon: UserCheck,
    title: "Always your choice",
    description:
      "See your escort's name and photo before they arrive, and cancel anytime, no questions asked.",
  },
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const db = createClient();
    db.auth.getClaims().then((claims) => {
      if (claims.data)
        setSignedIn(true);
    });
  }, []);

  useEffect(() => {
    // get /#access_token=? variable from the # section of the url and alert it
    const parts = window.location.hash.substring(1).split("&"); // key=value
    // convert to dictionary
    const dict = parts.map(part => {
      const [key, value] = part.split("=");
      return { [key]: value };
    }).reduce((acc, dict) => ({ ...acc, ...dict }), {} as Record<string, string>);

    if (dict["type"] && (dict["access_token"] || dict["token"])) {
      redirect(`/auth/confirm?token_hash=${dict["access_token"] || dict["token"]}&type=${dict["type"]}&next=/home`)
    }
  }, [])

  return (
    <main className="flex min-h-screen w-full flex-col items-center">
      {/* Hero */}
      <section className="flex w-full flex-col items-center border-b border-b-foreground/10 px-5 py-20 text-center">
        <div className="flex max-w-2xl flex-col items-center gap-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Travel safely, <br className="hidden sm:block" />
            day or night.
          </h1>
          <p className="max-w-lg text-muted-foreground">
            UWI Campus Escort connects you with a verified escort for any
            walk across campus — request one in seconds, track them live, and
            arrive with peace of mind.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/home">
                Request an escort
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/safety">View safety tips</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="w-full max-w-5xl px-5 py-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-5xl px-5 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            From request to arrival in four simple steps.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex flex-col items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Step {i + 1}
                </p>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="w-full border-t border-t-foreground/10 bg-accent/30 px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold">Built around safety, not just convenience</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every part of the service is designed with one goal — reducing
              risk on your walk.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-background">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      {!signedIn &&
        <section className="flex w-full max-w-5xl flex-col items-center gap-4 px-5 py-20 text-center">
          <h2 className="text-2xl font-semibold">Ready for your next walk?</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Sign up in under a minute — it's free, verified, and available
            whenever you need it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </section>
      }
    </main>
  );
}