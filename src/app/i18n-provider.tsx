import fs from 'fs';
import path from 'path';
import type { ReactNode } from 'react';
import { I18nProviderClient } from '@/lib/i18n';
import { flattenMessages, MessagesMap } from '@/lib/i18n-utils';

type Props = { children: ReactNode; locale: string };

function readAndFlatten(file: string): MessagesMap {
  if (!fs.existsSync(file)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return flattenMessages(parsed);
  } catch {
    return {};
  }
}

function loadMessages(locale: string): MessagesMap {
  const primary = path.resolve(process.cwd(), `src/locales/${locale}.json`);
  const messages = readAndFlatten(primary);
  if (Object.keys(messages).length > 0) {
    return messages;
  }

  const fallback = path.resolve(process.cwd(), 'src/locales/zh-TW.json');
  return readAndFlatten(fallback);
}

export default function I18nProvider({ children, locale }: Props) {
  const messages = loadMessages(locale);
  // render client provider and pass messages directly to avoid missing provider during prerender
  return (
    <I18nProviderClient locale={locale} messages={messages}>
      {children}
    </I18nProviderClient>
  );
}
