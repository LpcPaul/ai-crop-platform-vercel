"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function LangUpdater() {
  const pathname = usePathname();

  useEffect(() => {
    const segments = pathname.split("/");
    const locale = segments[1];

    // Only update if it's a valid locale
    if (locale && ["zh", "en", "es", "ja"].includes(locale)) {
      document.documentElement.lang = locale;
    }
  }, [pathname]);

  return null;
}