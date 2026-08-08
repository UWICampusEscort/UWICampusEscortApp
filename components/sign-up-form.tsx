"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ShieldCheck,
  Footprints,
  Mail,
  Lock,
  KeyRound,
  UserPlus,
  Loader2,
  XCircle,
  Check,
} from "lucide-react";

type Role = "escortee" | "escort";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [role, setRole] = useState<Role>("escortee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!email.endsWith(".uwi.edu")) {
      setError("Please use a valid UWI email address");
      setIsLoading(false);
      return;
    }

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${role === "escort" ? "escort" : "home"}`,
        },
      });
      if (error) throw error;
      await supabase.from("profiles")
        .update({ escort: role === "escort" })
        .eq("id", data.user?.id);

      router.push("/auth/login");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex w-full max-w-2xl flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Join the UWI Campus Escort community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              {/* Role picker */}
              <div className="grid gap-2">
                <Label>I want to...</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <RoleOption
                    icon={Footprints}
                    title="Be an Escortee"
                    description="Request an escort to get around campus safely."
                    selected={role === "escortee"}
                    onSelect={() => setRole("escortee")}
                  />
                  <RoleOption
                    icon={ShieldCheck}
                    title="Be an Escort"
                    description="Help others get where they're going safely."
                    selected={role === "escort"}
                    onSelect={() => setRole("escort")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@my.uwi.edu"
                    required
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      required
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="repeat-password">Repeat password</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      className="pl-9"
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Sign up
                  </>
                )}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:bg-accent"
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}