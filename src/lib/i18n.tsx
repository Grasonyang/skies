"use client";
import React, { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { flattenMessages, MessagesMap } from '@/lib/i18n-utils';

type Messages = MessagesMap;

type I18nValue = { locale: string; messages: Messages; t: (key: string, vars?: Record<string, unknown>) => string };

const I18nContext = createContext<I18nValue | undefined>(undefined);

type GlobalI18nWindow = Window & { __I18N_MESSAGES__?: MessagesMap; __I18N_LOCALE__?: string };

export function I18nProviderClient({ locale, messages, children }: { locale?: string; messages?: Record<string, unknown>; children: ReactNode }) {
  const globalMessages = typeof window !== 'undefined'
    ? (window as unknown as GlobalI18nWindow).__I18N_MESSAGES__
    : undefined;
  const globalLocale = typeof window !== 'undefined' ? (window as unknown as Window & { __I18N_LOCALE__?: string }).__I18N_LOCALE__ : undefined;
  const flattenedMessages = useMemo<Messages>(
    () => flattenMessages(messages ?? globalMessages ?? {}),
    [messages, globalMessages]
  );
  const usedLocale = locale ?? globalLocale ?? 'zh-TW';

  const t = useCallback((key: string, vars?: Record<string, unknown>) => {
    const msg = flattenedMessages[key] ?? key;
    if (!vars) return msg;
    return String(msg).replace(/\{(.*?)\}/g, (_match: string, k: string) => String(vars[k.trim()] ?? `{${k}}`));
  }, [flattenedMessages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const target = window as unknown as GlobalI18nWindow;
      target.__I18N_MESSAGES__ = flattenedMessages;
      target.__I18N_LOCALE__ = usedLocale;
    }
  }, [flattenedMessages, usedLocale]);

  const value = useMemo<I18nValue>(
    () => ({ locale: usedLocale, messages: flattenedMessages, t }),
    [usedLocale, flattenedMessages, t]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProviderClient');
  return { t: ctx.t, locale: ctx.locale };
}

export default I18nContext;
