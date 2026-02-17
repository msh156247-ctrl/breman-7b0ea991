import { useState, useEffect, useRef } from 'react';
import { getSignedUrls } from '@/lib/storageUtils';

/**
 * Hook to resolve chat-attachment URLs to signed URLs.
 * Caches results to avoid redundant signing requests.
 */
export function useSignedUrls(urls: string[]) {
  const [signedUrls, setSignedUrls] = useState<string[]>(urls);
  const [loading, setLoading] = useState(urls.length > 0);
  const keyRef = useRef('');

  useEffect(() => {
    const key = urls.join('|');
    if (key === keyRef.current) return;
    keyRef.current = key;

    if (urls.length === 0) {
      setSignedUrls([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getSignedUrls(urls).then(resolved => {
      if (keyRef.current === key) {
        setSignedUrls(resolved);
        setLoading(false);
      }
    });
  }, [urls]);

  return { signedUrls, loading };
}
