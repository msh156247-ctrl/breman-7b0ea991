import { supabase } from '@/integrations/supabase/client';

/**
 * Extract the storage path from a full public URL or return path as-is.
 */
export function extractStoragePath(urlOrPath: string): string | null {
  if (!urlOrPath.startsWith('http')) return urlOrPath;
  
  const match = urlOrPath.match(/\/chat-attachments\/(.+?)(\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Get a signed URL for a chat attachment. Handles both old public URLs and new path-only values.
 * Returns the original URL as fallback if signing fails.
 */
export async function getSignedUrl(urlOrPath: string): Promise<string> {
  const path = extractStoragePath(urlOrPath);
  if (!path) return urlOrPath;

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) return urlOrPath;
  return data.signedUrl;
}

/**
 * Get signed URLs for an array of chat attachment paths/URLs.
 */
export async function getSignedUrls(urlsOrPaths: string[]): Promise<string[]> {
  if (urlsOrPaths.length === 0) return [];
  
  // Use batch API for efficiency
  const paths = urlsOrPaths.map(u => extractStoragePath(u)).filter(Boolean) as string[];
  
  if (paths.length === 0) return urlsOrPaths;

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrls(paths, 3600);

  if (error || !data) {
    // Fallback: return originals
    return urlsOrPaths;
  }

  // Map back: for each original, find its signed URL
  const signedMap = new Map<string, string>();
  data.forEach(item => {
    if (item.signedUrl) {
      signedMap.set(item.path!, item.signedUrl);
    }
  });

  return urlsOrPaths.map(original => {
    const path = extractStoragePath(original);
    if (path && signedMap.has(path)) return signedMap.get(path)!;
    return original;
  });
}
