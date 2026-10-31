import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { LANG_COOKIE, SITE_DESCRIPTION, SITE_NAME, type AppLang } from "@/lib/constants";
import { Providers } from "@/components/providers";
import { bootScript } from "@/lib/init-scripts";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HireReady · Software Engineering Interview Prep",
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "software engineering interview",
    "new grad",
    "junior developer",
    "DSA",
    "system design",
    "behavioral interview",
    "interview preparation",
  ],
  openGraph: {
    title: "HireReady · Software Engineering Interview Prep",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const lang: AppLang = cookieStore.get(LANG_COOKIE)?.value === "bn" ? "bn" : "en";

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} ${hindSiliguri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme (and practice mode and lang) before first paint — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      {/* Extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before hydration. */}
      <body className="min-h-full bg-background font-sans text-foreground" suppressHydrationWarning>
        <Providers initialLang={lang}>
          <div className="flex min-h-dvh flex-col overflow-x-clip">
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex flex-1 scroll-mt-14 flex-col outline-none">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
