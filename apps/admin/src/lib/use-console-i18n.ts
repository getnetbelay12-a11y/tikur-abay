'use client';

import { useEffect, useState } from 'react';
import { readConsoleLanguage, translate, translateUiText, type ConsoleLanguage } from './i18n';

export function useConsoleI18n() {
  const [language, setLanguage] = useState<ConsoleLanguage>('en');

  useEffect(() => {
    const sync = () => setLanguage(readConsoleLanguage());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('tikur-abay-language-change', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('tikur-abay-language-change', sync as EventListener);
    };
  }, []);

  return {
    language,
    t: (key: string, fallback?: string) => translate(language, key, fallback),
    tx: (text: string) => translateUiText(language, text),
  };
}
