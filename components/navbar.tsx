"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  MapPinned,
  History,
  ShieldCheck,
  Menu,
  ChevronDown,
  User as UserIcon,
  LifeBuoy,
  LogOut,
} from "lucide-react";

import { getInitials, hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "./env-var-warning";
import { createClient } from "@/lib/supabase/client";

import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import Image from "next/image";

import Logo from "@/app/assets/images/logo.png"

// Edit to match your real routes.
const navLinks = [
  { href: "/home", label: "Request/Accept Escort", icon: MapPinned },
  { href: "/trips", label: "My Trips", icon: History },
  { href: "/safety", label: "Safety Tips", icon: ShieldCheck },
];

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hasEnvVars) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/auth/login");
    router.refresh();
  };

  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Account";
  const email = user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-8 items-center">
          <div className="flex gap-5 items-center font-semibold">
            <Image src={Logo} className="h-10 w-10 rounded-md" alt="UWI Campus Escort Logo" />
            <Link href="/" className="font-semibold shrink-0">
              UWI Campus Escort
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <div className="flex items-center gap-2">
            {/* Desktop auth */}
            <div className="hidden md:block">
              {loading ? (
                <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex h-auto items-center gap-2 px-2 py-1.5">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={avatarUrl} alt={name} />
                        <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <span className="hidden max-w-30 truncate font-medium lg:inline">
                        {name}
                      </span>
                      <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:inline" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex flex-col">
                      <span className="truncate text-sm font-medium">{name}</span>
                      {email && (
                        <span className="truncate text-xs font-normal text-muted-foreground">
                          {email}
                        </span>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/support" className="cursor-pointer">
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        Support
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button asChild size="sm" variant="default">
                    <Link href="/auth/sign-up">Sign up</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu */}
            <div className="md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="flex w-72 flex-col gap-6">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>

                  <nav className="flex flex-col gap-1">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <Icon className="h-4 w-4" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="mt-auto flex flex-col gap-3 border-t pt-4">
                    {loading ? null : user ? (
                      <>
                        <div className="flex items-center gap-3 px-1">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={avatarUrl} alt={name} />
                            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{name}</p>
                            {email && (
                              <p className="truncate text-xs text-muted-foreground">{email}</p>
                            )}
                          </div>
                        </div>

                        <Link
                          href="/profile"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          <UserIcon className="h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          href="/support"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          <LifeBuoy className="h-4 w-4" />
                          Support
                        </Link>

                        <Button
                          variant="link"
                          className="mt-1 justify-start text-destructive hover:text-destructive"
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Log out
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                            Sign in
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="default">
                          <Link href="/auth/sign-up" onClick={() => setMobileOpen(false)}>
                            Sign up
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}