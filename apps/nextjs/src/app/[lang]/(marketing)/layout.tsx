import React from "react";
// import { getCurrentUser } from "@saasfly/auth";

// import { ModalProvider } from "~/components/modal-provider";
import { SiteFooter } from "~/components/site-footer";
import type { Locale } from "~/config/i18n-config";
import { getDictionary } from "~/lib/get-dictionary";

export default async function MarketingLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: {
    lang: Locale;
  };
}) {
  const dict = await getDictionary(lang);
  // const user = await getCurrentUser();

  // Clone children with dict and lang props
  const childrenWithProps = React.cloneElement(children as React.ReactElement, { dict, lang });

  return (
    <div className="flex min-h-screen flex-col">
      {/* <ModalProvider dict={dict.login} /> */}
      <main className="flex-1">{childrenWithProps}</main>
      <SiteFooter
        className="border-t border-border"
        params={{ lang: `${lang}` }}
        dict={dict.common}
      />
    </div>
  );
}
