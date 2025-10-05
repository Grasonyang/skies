import { useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';

export interface DiscussionSharePayload {
  cityName: string;
  appUrl?: string;
  mayorHandle?: string;
  pollutant?: string;
  peakWindow?: string;
  platform?: 'twitter' | 'facebook';
}

const TWITTER_BASE = 'https://twitter.com/intent/tweet';
const FACEBOOK_BASE = 'https://www.facebook.com/sharer/sharer.php';

function buildMessage(t: (k: string, vars?: Record<string, unknown>) => string, { cityName, mayorHandle, pollutant, peakWindow }: DiscussionSharePayload) {
  const pollutantLabel = pollutant ? `${pollutant.toUpperCase()} ` : '';
  const windowText = peakWindow ? ` ${peakWindow}` : '';
  const mayorText = mayorHandle ? ` @${mayorHandle}` : '';

  return t('share.message', { cityName, pollutantLabel, windowText, mayorText, url: '${URL_PLACEHOLDER}' });
}

export function useSocialShare() {
  const { t } = useTranslation();

  return useCallback((payload: DiscussionSharePayload) => {
    const platform = payload.platform ?? 'twitter';
    const url = payload.appUrl || (typeof window !== 'undefined' ? window.location.href : 'https://skies.app');

    const messageTemplate = buildMessage(t, payload);
    const message = messageTemplate.replace('${URL_PLACEHOLDER}', url);

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: t('share.title'),
          text: message,
          url,
        })
        .catch((error) => console.warn('[useSocialShare] navigator.share failed', error));
      return;
    }

    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(message);

    const shareUrl = platform === 'facebook'
      ? `${FACEBOOK_BASE}?u=${encodedUrl}&quote=${encodedText}`
      : `${TWITTER_BASE}?text=${encodedText}`;

    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=520');
    }
  }, [t]);
}
