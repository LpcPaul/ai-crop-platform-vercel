import { getDictionary } from "~/lib/get-dictionary";
import { Locale } from "~/config/i18n-config";
import { ClientIndexPage } from "./client-page";

interface PageProps {
  params: {
    lang: Locale;
  };
}

export default async function IndexPage({ params: { lang } }: PageProps) {
  const dict = await getDictionary(lang);

  return <ClientIndexPage dict={dict} lang={lang} />;
}