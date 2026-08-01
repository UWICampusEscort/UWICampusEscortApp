import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Footer } from "@/components/footer";
import Navbar from "@/components/navbar";
import { ToastContainer } from "react-toastify";

const defaultUrl = process.env.URL
  ? `https://${process.env.URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),

  title: {
    default: "UWI Campus Escort",
    template: "%s | UWI Campus Escort",
  },

  description:
    "Safe, reliable, and convenient campus escort services for students at The University of the West Indies. Book rides, request assistance, and travel safely around campus.",

  applicationName: "UWI Campus Escort",

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
    siteName: "UWI Campus Escort",
    title: "UWI Campus Escort",
    description:
      "Safe and reliable campus escort services for students at The University of the West Indies.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UWI Campus Escort",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "UWI Campus Escort",
    description:
      "Safe, reliable campus escort services at The University of the West Indies.",
    images: ["/og-image.png"],
    creator: "@uwicampusescort", // Remove if you don't have an X account
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },

  manifest: "/site.webmanifest",

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
    title: "UWI Campus Escort",
    statusBarStyle: "default",
  },

  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
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
          <Navbar />
          {children}
          <Footer />
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}