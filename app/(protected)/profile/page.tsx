"use client";

/**
 *
 * IMPORTANT — Persona identity verification:
 * The `onComplete` callback below only tells you the user *finished the
 * flow*, not that they passed. Client-side JS is not a trustworthy source
 * of truth for identity verification. This page writes an `identity_status`
 * of "pending" when the flow completes and expects a server-side webhook
 * (Persona → your backend, verifying Persona's signature) to be the only
 * thing that ever writes "verified" or "failed". Wire that webhook to
 * update the same `profiles` row before treating anyone as verified.
 * 
 *   Env vars: NEXT_PUBLIC_PERSONA_TEMPLATE_ID, NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  XCircle,
  IdCard,
  VaultIcon,
  ChevronDownIcon,
  CalendarClock,
  Bell,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatDatePPPMin } from "@/lib/utils";
import { PhoneInput } from "@/components/reui/phone-input";
import { usePushNotifications } from "@/components/push-notifications-provider";

type IdentityStatus = "unverified" | "pending" | "verified" | "failed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_verified: boolean;
  identity_status: IdentityStatus;
  persona_inquiry_id: string | null;
  updated_at: string | null;
  escort: boolean;
  graduation_date: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilePage() {
  const notifications = usePushNotifications();

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [savingGraduationDate, setSavingGraduationDate] = useState(false);

  const [savingBeAnEscort, setSavingBeAnEscort] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const [resendingEmail, setResendingEmail] = useState(false);

  const [allowNotifications, setAllowNotifications] = useState(false);

  const [savedPhone, setSavedPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  const [personaLoading, setPersonaLoading] = useState(false);

  const refresh = useCallback(async () => {
    const {
      data: { user: current },
    } = await supabase.auth.getUser();
    setUser(current);

    if (!current) {
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", current.id)
      .single();

    setProfile(existing as Profile);
    setFullName(existing.full_name ?? "");

    setSavedPhone(existing.phone ?? "");
    setPhone(existing.phone ?? "");

    setAllowNotifications(existing.send_notifications);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) router.push("/auth/login");
    });

    return () => listener.subscription.unsubscribe();
  }, [refresh, supabase, router]);

  useEffect(() => {
    if (!error && !success) return;
    if (error)
      toast.error(error)
    if (success)
      toast.success(success)

    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [error, success]);

  useEffect(() => {
    if (!user || !profile) return;

    if (allowNotifications)
      notifications.subscribe();
    else notifications.unsubscribe();

  }, [user, profile, allowNotifications]);

  const emailVerified = Boolean(user?.email_confirmed_at);
  const phoneVerified = Boolean(user?.phone_confirmed_at) || Boolean(profile?.phone_verified);
  const identityStatus: IdentityStatus = profile?.identity_status ?? "unverified";

  // --- Full name -----------------------------------------------------
  const handleSaveName = async () => {
    if (!user) return;
    setSavingName(true);
    setError(null);

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (authError) {
      setError(authError.message);
      setSavingName(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() });

    if (profileError) {
      setError(profileError.message);
    } else {
      setSuccess("Name updated.");
      setProfile({ ...profile, full_name: fullName } as Profile);
    }
    setSavingName(false);
  };

  // --- Avatar ----------------------------------------------------------
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    setError(null);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError(uploadError.message);
      setAvatarUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Cache-bust so the new avatar shows immediately even though the
    // filename didn't change.
    const bustedUrl = `${publicUrl}?updated=${Date.now()}`;

    await supabase.auth.updateUser({ data: { avatar_url: bustedUrl } });
    await supabase
      .from("profiles")
      .upsert({ id: user.id, avatar_url: bustedUrl, updated_at: new Date().toISOString() });

    await refresh();
    setSuccess("Avatar updated.");
    setAvatarUploading(false);
  };

  // --- Email verification ----------------------------------------------
  const handleResendEmailVerification = async () => {
    if (!user?.email) return;
    setResendingEmail(true);
    setError(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setSuccess("Verification email sent — check your inbox.");
    }
    setResendingEmail(false);
  };

  // --- Phone number ----------------------------------------
  const handleSavePhoneNumber = async () => {
    if (!user) return;
    setPhoneLoading(true);
    setError(null);

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, phone, updated_at: new Date().toISOString() });

    if (error) {
      setError(error.message);
      setPhoneLoading(false);
      return;
    }
    else {
      setSuccess("Phone number updated.");
      setUser({ ...user, phone });
      setSavedPhone(phone);
    }

    setPhoneLoading(false);
  };

  /* --- Be an escort ----------------------------------------*/
  const handleSaveBeAnEscort = async (value: boolean) => {
    if (!user) return;
    setSavingBeAnEscort(true);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, escort: value, updated_at: new Date().toISOString() });

    if (error) {
      setError(error.message);
    } else {
      setProfile({ ...profile, escort: value } as Profile);
    }
    setSavingBeAnEscort(false);
  };

  /* --- Graduation date ----------------------------------------*/
  const handleSaveGraduationDate = async (value: string) => {
    if (!user) return;

    if (isNaN(new Date(value).getTime()) || (profile?.graduation_date && new Date(value).getTime() === new Date(profile.graduation_date).getTime()))
      return;

    setSavingGraduationDate(true);
    setError(null);

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, graduation_date: value, updated_at: new Date().toISOString() });

    if (error) {
      setError(error.message);
    }
    else {
      setProfile({ ...profile, graduation_date: value } as Profile);
    }
    setSavingGraduationDate(false);
  };

  /* --- Identity verification (Persona) -----------------------------------
  const handleVerifyIdentity = () => {
    if (!user) return;
    setError(null);
    setPersonaLoading(true);

    const client = new Persona.Client({
      templateId: process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID as string,
      environmentId: process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID,
      referenceId: user.id,
      onLoad: () => client.open(),
      onComplete: async ({ inquiryId }: { inquiryId: string; status: string }) => {
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            identity_status: "pending",
            persona_inquiry_id: inquiryId,
            updated_at: new Date().toISOString(),
          });
        await refresh();
        setSuccess("Identity check submitted — we'll email you once it's reviewed.");
        setPersonaLoading(false);
      },
      onCancel: () => setPersonaLoading(false),
      onError: (err: unknown) => {
        console.error(err);
        setError("Identity verification could not be started. Please try again.");
        setPersonaLoading(false);
      },
    });
  };
  */

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center">
        <p className="text-muted-foreground">You need to sign in to view your profile.</p>
      </div>
    );
  }

  const displayName = fullName || "Your account";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal details and verify your identity to keep the
          escort program secure for everyone.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Security checklist */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Security checklist</CardTitle>
          <CardDescription>
            * - Required for using the escort service.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ChecklistItem label="Email verified *" done={emailVerified} />
          <ChecklistItem label="Phone verified" done={phoneVerified} />
          <ChecklistItem label="Identity verified *" done={identityStatus === "verified"} />
        </CardContent>
      </Card>

      {/* Personal information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
          <CardDescription></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={(user.user_metadata?.avatar_url as string) ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change avatar"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground disabled:opacity-50"
              >
                {avatarUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          <FieldGroup className="w-full">
            <Field orientation="horizontal">
              <FieldLabel htmlFor="full-name" className="w-16">
                <IdCard className="h-4 w-4 text-muted-foreground" /> Full name {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
              </FieldLabel>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e: any) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="flex-3 text-sm"
              />

              {fullName !== (profile?.full_name ?? "") &&
                <Button
                  onClick={handleSaveName}
                  disabled={savingName || fullName === (profile?.full_name ?? "")}
                >
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              }
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="email" className="w-16">
                <Mail className="h-4 w-4 text-muted-foreground" /> Email
              </FieldLabel>
              {emailVerified ? (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-amber-600">
                  <ShieldAlert className="h-3 w-3" /> Unverified
                </Badge>
              )}
              {!emailVerified && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResendEmailVerification}
                  disabled={resendingEmail}
                >
                  {resendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Resend verification email"
                  )}
                </Button>
              )}
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="phone-number" className="w-16">
                <Phone className="h-4 w-4 text-muted-foreground" /> Phone number
              </FieldLabel>

              <div className="flex flex-col gap-2 sm:flex-row flex-3">
                <PhoneInput placeholder="Enter phone number" value={phone} onChange={(e) => setPhone(e)} className="w-full" />

                {savedPhone !== phone &&
                  <Button onClick={handleSavePhoneNumber} disabled={phoneLoading || !phone}>
                    {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                }
              </div>
            </Field>

            {/* Allow notifications toggle */}
            <Field orientation="horizontal">
              <FieldLabel htmlFor="allow-notifications" className="w-16">
                <Bell className="h-4 w-4 text-muted-foreground" /> Allow notifications
              </FieldLabel>
              <Switch
                id="allow-notifications"
                checked={allowNotifications}
                onCheckedChange={(checked) => setAllowNotifications(checked)}
              />
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="graduation-data" className="w-16">
                <CalendarClock className="h-4 w-4 text-muted-foreground" /> Graduation Date
              </FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} data-empty={!profile?.graduation_date} className="min-w-62 justify-between text-left font-normal data-[empty=true]:text-muted-foreground">{profile?.graduation_date ? formatDatePPPMin(new Date(profile.graduation_date)) : <span>Pick a date</span>}<ChevronDownIcon data-icon="inline-end" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={profile?.graduation_date ? new Date(profile.graduation_date) : undefined}
                    onSelect={(date) => handleSaveGraduationDate(date?.toISOString() ?? "")}
                    defaultMonth={profile?.graduation_date ? new Date(profile.graduation_date) : undefined}
                    required={false}
                    disabled={savingGraduationDate}
                  />
                  {savingGraduationDate && <div className="absolute inset-0 flex items-center justify-center bg-background/50"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
                </PopoverContent>
              </Popover>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="be-an-escort-switch" className="w-16">
                <VaultIcon className="h-4 w-4 text-muted-foreground" /> Be an escort {savingBeAnEscort && <Loader2 className="h-4 w-4 animate-spin" />}
              </FieldLabel>
              <Switch id="be-an-escort-switch" onCheckedChange={(v: boolean) => handleSaveBeAnEscort(v)} checked={profile?.escort ?? false} disabled={savingBeAnEscort} />
            </Field>
          </FieldGroup>

        </CardContent>
      </Card>

      {/* Identity verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity verification</CardTitle>
          <CardDescription>
            A quick government-ID check so everyone using the escort service
            is a verified member of the UWI community.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <IdentityBadge status={identityStatus} />

          <Button
            /*onClick={handleVerifyIdentity}*/
            disabled={
              personaLoading || identityStatus === "pending" || identityStatus === "verified"
            }
          >
            {personaLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : identityStatus === "verified" ? (
              "Identity verified"
            ) : identityStatus === "pending" ? (
              "Review in progress"
            ) : (
              "Verify identity"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
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
          <ShieldQuestion className="h-3 w-3" /> Pending review
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="gap-1 text-destructive">
          <ShieldAlert className="h-3 w-3" /> Verification failed
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