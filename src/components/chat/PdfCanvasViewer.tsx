import { useEffect, useRef, useState } from 'react';

interface PdfCanvasViewerProps {
  url: string;
}

export function PdfCanvasViewer({ url }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    async function renderAllPages() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
        const pdf = await loadingTask.promise;

        if (cancelled || !containerRef.current) return;

        setPageCount(pdf.numPages);
        containerRef.current.innerHTML = '';

        const containerWidth = containerRef.current.clientWidth;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);

          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth * window.devicePixelRatio) / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';

          if (i > 1) {
            const separator = document.createElement('div');
            separator.style.height = '2px';
            separator.className = 'bg-muted';
            containerRef.current?.appendChild(separator);
          }

          containerRef.current?.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    renderAllPages();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>PDF를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          PDF 로딩 중...
        </div>
      )}
      <div ref={containerRef} className="w-full" />
      {!loading && pageCount > 0 && (
        <div className="text-center text-xs text-muted-foreground py-3">
          전체 {pageCount}페이지
        </div>
      )}
    </div>
  );
}
