"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "@saasfly/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@saasfly/ui/dropdown-menu";
import * as Icons from "@saasfly/ui/icons";

import { i18n, localeMap } from "~/config/i18n-config";

export function LocaleChange({ url }: { url: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChanging, setIsChanging] = React.useState(false);

  function onClick(locale: string) {
    const segments = pathname.split('/');
    const currentLocale = segments[1];

    // Don't change if already on the selected locale
    if (currentLocale === locale) return;

    setIsChanging(true);

    // Replace the locale segment
    segments[1] = locale;
    const newPath = segments.join('/');

    // Use startTransition for better perceived performance
    React.startTransition(() => {
      router.push(newPath);
    });

    // Reset loading state after a short delay
    setTimeout(() => setIsChanging(false), 1000);
  }

  const currentLocale = pathname.split('/')[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 px-0" disabled={isChanging}>
          {isChanging ? (
            <Icons.Spinner className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.Languages />
          )}
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div>
          {i18n.locales.map((locale) => {
            const isActive = currentLocale === locale;
            return (
              <DropdownMenuItem
                key={locale}
                onClick={() => onClick(locale)}
                disabled={isActive || isChanging}
                className={isActive ? "bg-accent" : ""}
              >
                <span className={isActive ? "font-medium" : ""}>
                  {localeMap[locale]}
                </span>
                {isActive && <Icons.Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
