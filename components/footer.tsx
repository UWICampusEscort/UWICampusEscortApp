import Link from "next/link";
import {
  MapPinned,
  Phone,
  Mail,
  ShieldCheck,
  Facebook,
  Instagram,
  Twitter,
} from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { APP_NAME, CAMPUS_SECURITY, CAMPUS_SECURITY_HREF, EMAIL, TELEPHONE, TELEPHONE_HREF } from "@/lib/constants";

const quickLinks = [
  { href: "/home", label: "Request Escort" },
  { href: "/trips", label: "My Trips" },
  { href: "/safety", label: "Safety Tips" },
  { href: "/faq", label: "FAQ" },
];

const resourceLinks = [
  { href: "/about", label: "About the Program" },
  { href: "/profile", label: "Become an Escort" },
  { href: "/support", label: "Support" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/#", label: "Accessibility" },
];

const socialLinks = [
  { href: "https://facebook.com", label: "Facebook", icon: Facebook },
  { href: "https://instagram.com", label: "Instagram", icon: Instagram },
  { href: "https://twitter.com", label: "Twitter", icon: Twitter },
];

export function Footer() {
  return (
    <footer className="w-full flex justify-center border-t border-t-foreground/10">
      <div className="w-full max-w-5xl px-5 py-12 text-sm">
        {/* Emergency banner */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-destructive" />
            <p className="font-medium">
              In an emergency, always call Campus Security first.
            </p>
          </div>
          <a
            href={`tel:${CAMPUS_SECURITY_HREF}`}
            className="flex items-center gap-2 rounded-md bg-destructive px-3 py-2 font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
          >
            <Phone className="h-4 w-4" />
            {CAMPUS_SECURITY}
          </a>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 md:col-span-1">
            <Link href="/" className="font-semibold">
              {APP_NAME}
            </Link>
            <p className="mt-3 max-w-xs text-muted-foreground">
              A free, student-run safety escort service helping the UWI
              community get around campus securely, day or night.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-medium">Quick Links</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-medium">Resources</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-medium">Contact</h3>
            <ul className="mt-3 flex flex-col gap-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPinned className="mt-0.5 h-4 w-4 shrink-0" />
                <span>UWI Mona Campus, Jamaica</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${TELEPHONE_HREF}`} className="hover:text-foreground">
                  {TELEPHONE}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a
                  href={`mailto:${EMAIL}`}
                  className="hover:text-foreground"
                >
                  {EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-t-foreground/10 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {2026} {APP_NAME}. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}

            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}