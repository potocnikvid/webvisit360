"use client";

import { useCallback, useEffect, useState } from "react";
import { pickLang, type Lang } from "./i18n";

const LANG_KEY = "wv360-lang";

/** The visitor's language: their saved choice, else the browser's; shared by every page. */
export function useLang() {
  const [lang, setLang] = useState<Lang>("sl");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {}
    setLang(saved === "sl" || saved === "en" ? saved : pickLang(navigator.languages ?? [navigator.language]));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const switchLang = useCallback(() => {
    setLang((cur) => {
      const next = cur === "sl" ? "en" : "sl";
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  return { lang, switchLang };
}
