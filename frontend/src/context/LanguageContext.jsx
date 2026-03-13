import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, translate } from '../translations';

const LANGUAGE_KEY = 'settings_language';

const LanguageContext = createContext(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: 'english',
      setLanguage: () => {},
      t: (key, params) => translate(key, 'english', params),
    };
  }
  return ctx;
}

function getStoredLanguage() {
  try {
    const lang = localStorage.getItem(LANGUAGE_KEY) || 'english';
    return lang === 'filipino' ? 'filipino' : 'english';
  } catch {
    return 'english';
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage);

  useEffect(() => {
    const lang = getStoredLanguage();
    setLanguageState(lang);
  }, []);

  const setLanguage = (lang) => {
    const normalized = lang === 'filipino' ? 'filipino' : 'english';
    try {
      localStorage.setItem(LANGUAGE_KEY, normalized);
    } catch (e) {
      console.warn('Failed to save language:', e);
    }
    setLanguageState(normalized);
  };

  const t = (key, params = {}) => translate(key, language, params);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
