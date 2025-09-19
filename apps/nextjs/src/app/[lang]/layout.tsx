import { NextDevtoolsProvider } from "@next-devtools/core";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Toaster } from "@saasfly/ui/toaster";

import { TailwindIndicator } from "~/components/tailwind-indicator";
import { ThemeProvider } from "~/components/theme-provider";
import { LangUpdater } from "~/components/lang-updater";
import { i18n } from "~/config/i18n-config";
import { siteConfig } from "~/config/site";


export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Next.js",
    "Shadcn ui",
    "Sass",
    "Fast ",
    "Simple ",
    "Easy",
    "Cloud Native",
  ],
  authors: [
    {
      name: "saasfly",
    },
  ],
  creator: "Saasfly",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=1758207191", sizes: "any" },
      { url: "/favicon-16x16.png?v=1758207191", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=1758207191", sizes: "32x32", type: "image/png" },
      { url: "/snapcrop-logo.svg?v=1758207191", type: "image/svg+xml" }
    ],
    apple: "/apple-touch-icon.png?v=1758207191",
    shortcut: "/favicon.ico?v=1758207191",
  },
  manifest: "/site.webmanifest",
  other: {
    "mask-icon": "/safari-pinned-tab.svg",
    "msapplication-TileColor": "#000000",
    "theme-color": "#ffffff",
  },
  metadataBase: new URL("https://show.saasfly.io/"),
};

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  const { lang } = params;

  // Validate the language
  const validLanguages = ['zh', 'en', 'es', 'ja'];
  const currentLang = validLanguages.includes(lang) ? lang : 'en';

  return (
    <div data-lang={currentLang} className="h-full">
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
      >
        <LangUpdater />
        <NextDevtoolsProvider>{children}</NextDevtoolsProvider>
        <Analytics />
        <SpeedInsights />
        <Toaster />
        <TailwindIndicator />
      </ThemeProvider>
    </div>
  );
}
