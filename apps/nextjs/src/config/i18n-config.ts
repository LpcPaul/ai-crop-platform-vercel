export const i18n = {
  defaultLocale: "zh",
  locales: ["en", "zh", "es", "hi", "ar", "pt", "fr", "ru", "ja"],
} as const;

export type Locale = (typeof i18n)["locales"][number];

// 新增的映射对象
export const localeMap = {
  en: "English",
  zh: "中文",
  es: "Español",
  hi: "हिन्दी",
  ar: "العربية",
  pt: "Português",
  fr: "Français",
  ru: "Русский",
  ja: "日本語",
} as const;
