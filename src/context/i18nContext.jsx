import React, { createContext, useContext, useState, useEffect } from 'react';
import { presentationDict, getLocalizedText } from '../utils/presentationTranslations';

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('tozon_lang') || 'ru';
  });

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === 'ru' ? 'tg' : 'ru';
      localStorage.setItem('tozon_lang', next);
      return next;
    });
  };

  const changeLanguage = (newLang) => {
    if (newLang === 'ru' || newLang === 'tg') {
      setLang(newLang);
      localStorage.setItem('tozon_lang', newLang);
    }
  };

  const t = (key, fallback = '') => {
    const dict = presentationDict[lang] || presentationDict.ru;
    return dict[key] || presentationDict.ru[key] || fallback || key;
  };

  const getText = (valTg, valRu, fallback = '') => {
    return getLocalizedText(valTg, valRu, lang, fallback);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLanguage, toggleLanguage, t, getText }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    // Provide fallback if component is used outside provider
    const storedLang = localStorage.getItem('tozon_lang') || 'ru';
    return {
      lang: storedLang,
      setLang: () => {},
      toggleLanguage: () => {},
      t: (key, fallback = '') => {
        const dict = presentationDict[storedLang] || presentationDict.ru;
        return dict[key] || presentationDict.ru[key] || fallback || key;
      },
      getText: (valTg, valRu, fallback = '') => getLocalizedText(valTg, valRu, storedLang, fallback),
    };
  }
  return context;
};
