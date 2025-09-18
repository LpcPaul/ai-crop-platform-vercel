// Translation utility for AI analysis content
import { Locale } from "~/config/i18n-config";

// Simple translation service using browser translation API or fallback to static translations
export async function translateAnalysisContent(
  content: string,
  fromLang: string = 'zh',
  toLang: Locale
): Promise<string> {
  // If target language is Chinese, return original content
  if (toLang === 'zh') {
    return content;
  }

  try {
    // Try to use browser's built-in translation API if available
    if ('translation' in navigator && 'createTranslator' in (navigator as any).translation) {
      const translator = await (navigator as any).translation.createTranslator({
        sourceLanguage: fromLang,
        targetLanguage: toLang,
      });
      const result = await translator.translate(content);
      return result;
    }
  } catch (error) {
    console.warn('Browser translation not available, using fallback');
  }

  // Fallback to external translation service or static translations
  return await translateWithService(content, toLang);
}

async function translateWithService(content: string, toLang: Locale): Promise<string> {
  try {
    // Use a simple translation service (e.g., Google Translate API)
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content,
        from: 'zh',
        to: toLang,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.translatedText || content;
    }
  } catch (error) {
    console.warn('Translation service failed:', error);
  }

  // Ultimate fallback - return original content
  return content;
}

// Pre-defined translations for common analysis terms
const staticTranslations: Record<Locale, Record<string, string>> = {
  en: {
    '强调': 'emphasizes',
    '弱化': 'de-emphasizes',
    '保留': 'preserves',
    '突出': 'highlights',
    '构图': 'composition',
    '留白': 'negative space',
    '透视': 'perspective',
    '引导线': 'leading lines',
    '对比': 'contrast',
    '层次': 'layering',
    '背景': 'background',
    '前景': 'foreground',
    '主体': 'subject',
  },
  es: {
    '强调': 'enfatiza',
    '弱化': 'minimiza',
    '保留': 'conserva',
    '突出': 'destaca',
    '构图': 'composición',
    '留白': 'espacio negativo',
    '透视': 'perspectiva',
    '引导线': 'líneas de guía',
    '对比': 'contraste',
    '层次': 'capas',
    '背景': 'fondo',
    '前景': 'primer plano',
    '主体': 'sujeto',
  },
  ja: {
    '强调': '強調',
    '弱化': '弱化',
    '保留': '保持',
    '突出': '際立たせる',
    '构图': '構図',
    '留白': '余白',
    '透视': '遠近法',
    '引导线': '誘導線',
    '对比': 'コントラスト',
    '层次': '階層',
    '背景': '背景',
    '前景': '前景',
    '主体': '主体',
  },
  zh: {}, // No translation needed for Chinese
};

// Simple static translation for common terms
export function translateStaticTerms(content: string, toLang: Locale): string {
  if (toLang === 'zh' || !staticTranslations[toLang]) {
    return content;
  }

  let translated = content;
  const translations = staticTranslations[toLang];

  Object.entries(translations).forEach(([chinese, translation]) => {
    translated = translated.replace(new RegExp(chinese, 'g'), translation);
  });

  return translated;
}