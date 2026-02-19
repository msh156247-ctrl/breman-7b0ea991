import { useEffect, useRef, useState } from 'react';

interface FileThumbnailProps {
  url: string;
  fileType: string; // 'pdf', 'doc', 'xls', etc.
  icon: string;
  colorClass: string;
  className?: string;
}

export function FileThumbnail({ url, fileType, icon, colorClass, className = '' }: FileThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (fileType !== 'pdf' || !url) return;

    let cancelled = false;

    async function renderPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale: 0.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (!cancelled) setRendered(true);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    renderPdf();
    return () => { cancelled = true; };
  }, [url, fileType]);

  const baseClass = `flex items-center justify-center rounded-xl shrink-0 overflow-hidden ${className}`;

  if (fileType === 'pdf' && !error) {
    return (
      <div className={`${baseClass} ${colorClass} relative`}>
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover transition-opacity ${rendered ? 'opacity-100' : 'opacity-0'}`}
          style={{ position: rendered ? 'static' : 'absolute' }}
        />
        {!rendered && (
          <span className="text-3xl">{icon}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`${baseClass} ${colorClass}`}>
      <span className="text-3xl">{icon}</span>
    </div>
  );
}
