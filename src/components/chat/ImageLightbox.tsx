import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Share2, FileText } from 'lucide-react';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

function getFileExtInfo(url: string): { icon: string; label: string } {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  switch (ext) {
    case 'pdf': return { icon: '📕', label: 'PDF' };
    case 'doc': case 'docx': return { icon: '📘', label: 'Word' };
    case 'xls': case 'xlsx': return { icon: '📗', label: 'Excel' };
    case 'ppt': case 'pptx': return { icon: '📙', label: 'PPT' };
    case 'txt': return { icon: '📄', label: 'TXT' };
    default: return { icon: '📎', label: ext.toUpperCase() || 'FILE' };
  }
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) ||
    url.includes('/image/') || url.includes('image%2F');
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url);
}

function getFileName(url: string): string {
  try {
    const pathParts = url.split('/');
    const fullName = pathParts[pathParts.length - 1].split('?')[0];
    const decoded = decodeURIComponent(fullName);
    const dashIndex = decoded.indexOf('-');
    if (dashIndex > 0 && dashIndex < 20) {
      const afterDash = decoded.substring(dashIndex + 1);
      if (afterDash.lastIndexOf('.') > 0) return afterDash;
    }
    return decoded;
  } catch {
    return 'file';
  }
}

export function ImageLightbox({ images, initialIndex = 0, open, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Swipe state
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwiping = useRef(false);
  const containerWidth = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  useEffect(() => {
    if (containerRef.current) {
      containerWidth.current = containerRef.current.clientWidth;
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, images.length, onClose]);

  // Touch handlers for smooth carousel swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't handle swipe if touching inside a PDF viewer (scrollable content)
    const target = e.target as HTMLElement;
    if (target.closest('[data-pdf-viewer]')) return;
    
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    isSwiping.current = false;
    if (containerRef.current) {
      containerWidth.current = containerRef.current.clientWidth;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Don't handle swipe if touching inside a PDF viewer
    const target = e.target as HTMLElement;
    if (target.closest('[data-pdf-viewer]')) return;
    
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;

    // Prevent overscroll at edges
    if ((currentIndex === 0 && delta > 0) || (currentIndex === images.length - 1 && delta < 0)) {
      // Rubber-band effect at edges
      const dampened = delta * 0.3;
      if (Math.abs(dampened) > 5) isSwiping.current = true;
      setSwipeOffset(dampened);
      return;
    }

    if (Math.abs(delta) > 5) {
      isSwiping.current = true;
      setSwipeOffset(delta);
    }
  }, [currentIndex, images.length]);

  const handleTouchEnd = useCallback(() => {
    const threshold = containerWidth.current ? containerWidth.current * 0.2 : 60;
    if (Math.abs(touchDeltaX.current) > threshold) {
      if (touchDeltaX.current < 0 && currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (touchDeltaX.current > 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
    setSwipeOffset(0);
    setTimeout(() => { isSwiping.current = false; }, 50);
  }, [currentIndex, images.length]);

  const handleDownload = useCallback(async () => {
    const src = images[currentIndex];
    if (!src) return;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName(src);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank');
    }
  }, [images, currentIndex]);

  const handleShare = useCallback(async () => {
    const src = images[currentIndex];
    if (!src) return;
    if (navigator.share) {
      try {
        await navigator.share({ url: src, title: getFileName(src) });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(src);
        }
      }
    } else {
      await navigator.clipboard.writeText(src);
      const el = document.getElementById('share-btn-lightbox');
      if (el) {
        el.setAttribute('data-copied', 'true');
        setTimeout(() => el.removeAttribute('data-copied'), 1500);
      }
    }
  }, [images, currentIndex]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSwiping.current) {
      onClose();
    }
  }, [onClose]);

  if (!open || images.length === 0) return null;

  const hasMultiple = images.length > 1;
  const currentSrc = images[currentIndex];
  const isImage = isImageUrl(currentSrc);
  const isPdf = isPdfUrl(currentSrc);

  // Render a single slide item
  const renderSlide = (src: string, idx: number) => {
    const slideIsImage = isImageUrl(src);
    const slideIsPdf = isPdfUrl(src);

    if (slideIsImage) {
      return (
        <img
          src={src}
          alt={`이미지 ${idx + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
        />
      );
    }

    if (slideIsPdf) {
      return (
        <div className="bg-background rounded-none md:rounded-2xl w-screen md:w-full md:max-w-[90vw] h-[100dvh] md:h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl">📕</span>
              <span className="text-sm font-medium truncate">{getFileName(src)}</span>
            </div>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline shrink-0 ml-2"
            >
              새 탭에서 열기
            </a>
          </div>
          <PdfCanvasViewer url={src} />
        </div>
      );
    }

    // Generic file preview
    return (
      <div className="bg-background rounded-2xl p-8 max-w-[340px] w-full text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">{getFileExtInfo(src).icon}</div>
        <p className="text-sm font-medium truncate mb-1">{getFileName(src)}</p>
        <p className="text-xs text-muted-foreground mb-6">{getFileExtInfo(src).label} 파일</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <FileText className="h-4 w-4" />
          파일 열기
        </a>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {hasMultiple && (
          <span className="text-white/70 text-sm font-medium px-2">
            {currentIndex + 1} / {images.length}
          </span>
        )}
        <button
          id="share-btn-lightbox"
          onClick={handleShare}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors data-[copied=true]:bg-green-600/70"
          aria-label="공유"
        >
          <Share2 className="h-5 w-5" />
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="다운로드"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation arrows (desktop) */}
      {hasMultiple && currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev - 1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="이전"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {hasMultiple && currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev + 1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="다음"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Carousel track with smooth swipe */}
      <div
        className="w-full h-full flex items-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex items-center h-full"
          style={{
            transform: `translateX(calc(${-currentIndex * 100}vw + ${swipeOffset}px))`,
            transition: swipeOffset ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)',
            width: `${images.length * 100}vw`,
          }}
        >
          {images.map((src, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center"
              style={{ width: '100vw', height: '100%', flexShrink: 0 }}
            >
              {renderSlide(src, idx)}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {hasMultiple && images.length <= 10 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`이미지 ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
