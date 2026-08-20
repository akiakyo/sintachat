import type { Metadata } from "next";
import "./globals.css";
import ConsentGuard from "../components/ConsentGuard";
import RouteTransition from "../components/RouteTransition";

export const metadata: Metadata = {
  title: {
    default: "SintaChat | Anonymous Chat Philippines",
    template: "%s | SintaChat",
  },

  description:
    "SintaChat is an anonymous real-time chat platform for students and young adults across the Philippines. Find people who match your vibe, interests, and campus preferences through safe and meaningful conversations.",

  keywords: [
    "SintaChat",
    "anonymous chat Philippines",
    "random chat Philippines",
    "student chat Philippines",
    "campus chat",
    "Filipino chat platform",
    "anonymous messaging",
    "chat app Philippines",
  ],

  authors: [
    {
      name: "SintaChat",
    },
  ],

  creator: "SintaChat",

  metadataBase: new URL("https://sintachat.com"),

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },

  manifest: "/site.webmanifest",

  openGraph: {
    title:
      "SintaChat - Anonymous Chat Philippines | Student Connections",

    description:
      "Meet people who match your vibe, interests, and campus preferences. SintaChat provides anonymous conversations, icebreakers, voice notes, reactions, and a safe student community.",

    url: "https://sintachat.com",

    siteName: "SintaChat",

    locale: "en_PH",

    type: "website",

    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "SintaChat Logo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "SintaChat - Anonymous Chat Philippines",

    description:
      "A safe anonymous chat platform for Filipino students and young adults.",

    images: ["/icon.png"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,600;1,600&display=swap"
          rel="stylesheet"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",

              name: "SintaChat",

              applicationCategory:
                "SocialNetworkingApplication",

              operatingSystem: "Web",

              description:
                "Anonymous real-time chat platform for students and young adults in the Philippines.",

              url: "https://sintachat.com",

              image:
                "https://sintachat.com/icon.png",

              creator: {
                "@type": "Organization",
                name: "SintaChat",
              },
            }),
          }}
        />
      </head>

      <body>
        <ConsentGuard>
          {children}
        </ConsentGuard>

        <RouteTransition />
      </body>
    </html>
  );
}
