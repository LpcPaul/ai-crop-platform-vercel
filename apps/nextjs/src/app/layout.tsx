import "~/styles/globals.css";

import { cn } from "@saasfly/ui";

import { i18n } from "~/config/i18n-config";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={i18n.defaultLocale} suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>{children}</body>
    </html>
  );
}
