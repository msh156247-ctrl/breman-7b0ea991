import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractStoragePath } from '@/lib/storageUtils';

export interface FileMetadata {
  size: number;
  created_at: string;
}

export function useFileMetadata(urlsOrPaths: string[]) {
  const [metadata, setMetadata] = useState<Record<string, FileMetadata>>({});
  const keyRef = useRef('');

  useEffect(() => {
    const key = urlsOrPaths.join('|');
    if (key === keyRef.current || urlsOrPaths.length === 0) return;
    keyRef.current = key;

    async function fetchMetadata() {
      const result: Record<string, FileMetadata> = {};

      // Group paths by folder (userId prefix)
      const folderMap = new Map<string, { originalUrl: string; fileName: string }[]>();

      for (const url of urlsOrPaths) {
        const path = extractStoragePath(url);
        if (!path) continue;

        const lastSlash = path.lastIndexOf('/');
        const folder = lastSlash >= 0 ? path.substring(0, lastSlash) : '';
        const fileName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

        if (!folderMap.has(folder)) folderMap.set(folder, []);
        folderMap.get(folder)!.push({ originalUrl: url, fileName });
      }

      for (const [folder, files] of folderMap.entries()) {
        const { data } = await supabase.storage
          .from('chat-attachments')
          .list(folder);

        if (data) {
          for (const { originalUrl, fileName } of files) {
            const meta = data.find(d => d.name === fileName);
            if (meta) {
              result[originalUrl] = {
                size: (meta.metadata as Record<string, number>)?.size || 0,
                created_at: meta.created_at,
              };
            }
          }
        }
      }

      setMetadata(result);
    }

    fetchMetadata();
  }, [urlsOrPaths]);

  return { metadata };
}
