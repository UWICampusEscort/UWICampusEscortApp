import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Footer } from "@/components/footer";
import Navbar from "@/components/navbar";
import { PushNotificationsProvider } from "@/components/push-notifications-provider";
import { ToastContainer } from "react-toastify";
import { APP_NAME } from "@/lib/constants";

const defaultUrl = process.env.URL
  ? `https://${process.env.URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),

  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },

  description:
    "Safe, reliable, and convenient campus escort services for students at The University of the West Indies. Book rides, request assistance, and travel safely around campus.",

  applicationName: APP_NAME,

  keywords: [
    "UWI",
    "University of the West Indies",
    "Campus Escort",
    "Campus Safety",
    "Student Transportation",
    "Campus Shuttle",
    "University Safety",
    "Campus Ride",
    "Jamaica",
    "UWI Mona",
    "Student Escort Service",
    "Safe Campus",
    "FST",
    "Faculty of Science and Technology",
    "FST Escort",
    "FST EST",
  ],

  authors: [
    {
      name: "UWI Mona Faculty of Science and Technology",
    },

    {
      name: "Simon Smith",
    },
  ],

  creator: "Simon Smith",
  publisher: "UWI Mona Faculty of Science and Technology",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_JM",
    url: defaultUrl,
    siteName: APP_NAME,
    title: APP_NAME,
    description:
      "Safe and reliable campus escort services for students at The University of the West Indies.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description:
      "Safe, reliable campus escort services at The University of the West Indies.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },

  manifest: "/manifest.webmanifest",

  category: "Transportation",

  verification: {
    // Add these once available
    google: "",
    // yandex: "",
    // yahoo: "",
    // other: {},
  },

  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },

  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PushNotificationsProvider>
            <Navbar />
            {children}
            <Footer />
            <ToastContainer />
          </PushNotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}