import { useCallback } from 'react';

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

function buildMessage({ cityName, mayorHandle, pollutant, peakWindow }: DiscussionSharePayload) {
  const pollutantLabel = pollutant ? `${pollutant.toUpperCase()} ` : '';
  const windowText = peakWindow ? `，預估高峰 ${peakWindow}` : '';
  const mayorText = mayorHandle ? ` @${mayorHandle}` : '';

  return `NASA EarthData 預測 ${cityName} ${pollutantLabel}PM2.5 將升高${windowText}！請檢視：` +
    '${URL_PLACEHOLDER}' +
    `${mayorText} #CleanSkyNow #SpaceApps`;
}

export function useSocialShare() {
  return useCallback((payload: DiscussionSharePayload) => {
    const platform = payload.platform ?? 'twitter';
    const url = payload.appUrl || (typeof window !== 'undefined' ? window.location.href : 'https://skies.app');

    const messageTemplate = buildMessage(payload);
    const message = messageTemplate.replace('${URL_PLACEHOLDER}', url);

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: 'Skies 行動建議',
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
  }, []);
}
