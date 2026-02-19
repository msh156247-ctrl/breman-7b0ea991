import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Image, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';
import { ImageLightbox } from '@/components/chat/ImageLightbox';
import { Progress } from '@/components/ui/progress';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { FileThumbnail } from '@/components/chat/FileThumbnail';
import { useFileMetadata } from '@/hooks/useFileMetadata';

interface AttachmentFile {
  file: File;
  preview?: string;
  uploading: boolean;
  progress: number;
}

interface ChatAttachmentsProps {
  userId: string;
  onAttachmentsChange: (urls: string[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export function ChatAttachments({ userId, onAttachmentsChange, disabled }: ChatAttachmentsProps) {
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: AttachmentFile[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}은(는) 10MB를 초과합니다`);
        continue;
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name}은(는) 지원하지 않는 파일 형식입니다`);
        continue;
      }

      let processedFile = file;
      if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        try {
          processedFile = await compressImage(file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            initialQuality: 0.85,
          });
        } catch (err) {
          console.warn('Image compression failed, using original:', err);
        }
      }

      const preview = ALLOWED_IMAGE_TYPES.includes(processedFile.type)
        ? URL.createObjectURL(processedFile)
        : undefined;

      validFiles.push({ file: processedFile, preview, uploading: false, progress: 0 });
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const attachment = prev[index];
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        setAttachments(prev => prev.map((a, idx) =>
          idx === i ? { ...a, uploading: true, progress: 0 } : a
        ));

        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const progressInterval = setInterval(() => {
          setAttachments(prev => prev.map((a, idx) =>
            idx === i && a.progress < 90 ? { ...a, progress: a.progress + 15 } : a
          ));
        }, 150);

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, attachment.file);

        clearInterval(progressInterval);

        if (uploadError) throw uploadError;

        setAttachments(prev => prev.map((a, idx) =>
          idx === i ? { ...a, progress: 100 } : a
        ));

        uploadedUrls.push(fileName);
      }

      attachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setAttachments([]);

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast.error('파일 업로드에 실패했습니다');
      return [];
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatUploadSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return {
    attachments,
    uploading,
    uploadAttachments,
    AttachmentButton: (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </>
    ),
    AttachmentPreview: attachments.length > 0 ? (
      <div className="flex flex-wrap gap-2 p-3 border-t bg-muted/30">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="relative group bg-background rounded-lg border overflow-hidden"
          >
            {attachment.preview ? (
              <div className="w-20 h-20">
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-16 flex items-center gap-2 px-3">
                {getFileIcon(attachment.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{attachment.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatUploadSize(attachment.file.size)}
                  </p>
                </div>
              </div>
            )}

            {attachment.uploading && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1 px-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <Progress value={attachment.progress} className="h-1 w-full" />
                <span className="text-[10px] text-muted-foreground">{attachment.progress}%</span>
              </div>
            )}

            {!attachment.uploading && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    ) : null,
  };
}

// ─── Helper functions for MessageAttachments ───────────────────────────────

const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB
const FILE_RETENTION_DAYS = 14;

function getExpiryFromMeta(meta: { size: number; created_at: string } | undefined): Date | null {
  if (!meta || meta.size <= FILE_SIZE_THRESHOLD) return null;
  return new Date(new Date(meta.created_at).getTime() + FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function formatExpiryDate(date: Date | null): string {
  if (!date) return '';
  return `~${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtInfo(url: string): { icon: string; label: string; color: string } {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return { icon: '📕', label: 'PDF', color: 'bg-red-500/10 text-red-600 dark:text-red-400' };
    case 'doc':
    case 'docx':
      return { icon: '📘', label: 'Word', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
    case 'xls':
    case 'xlsx':
      return { icon: '📗', label: 'Excel', color: 'bg-green-500/10 text-green-600 dark:text-green-400' };
    case 'ppt':
    case 'pptx':
      return { icon: '📙', label: 'PPT', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' };
    case 'txt':
      return { icon: '📄', label: 'TXT', color: 'bg-muted text-muted-foreground' };
    case 'zip':
    case 'rar':
    case '7z':
      return { icon: '📦', label: ext.toUpperCase(), color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
    default:
      return { icon: '📎', label: ext.toUpperCase() || 'FILE', color: 'bg-muted text-muted-foreground' };
  }
}

function getFileName(url: string): string {
  try {
    const cleanUrl = url.split('?')[0];
    const pathParts = cleanUrl.split('/');
    const fullName = pathParts[pathParts.length - 1];
    const decoded = decodeURIComponent(fullName);
    // Remove timestamp prefix: "<timestamp>-<randomStr>.<ext>" → keep after first dash
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

// ─── Component to display attachments in messages with lightbox ────────────

export function MessageAttachments({ attachments }: { attachments: string[] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { signedUrls, loading } = useSignedUrls(attachments || []);
  const { metadata } = useFileMetadata(attachments || []);

  if (!attachments || attachments.length === 0) return null;
  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

  // Maintain index correlation: signedUrls[i] corresponds to attachments[i]
  const indexedItems = attachments.map((originalPath, i) => ({
    originalPath,
    signedUrl: signedUrls[i] || originalPath,
  }));

  const imageItems = indexedItems.filter(item => isImage(item.signedUrl));
  const fileItems = indexedItems.filter(item => !isImage(item.signedUrl));
  const allItems = [...imageItems, ...fileItems].map(item => item.signedUrl);

  const handleImageClick = (url: string) => {
    const idx = allItems.indexOf(url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  const handleFileClick = (url: string) => {
    const idx = allItems.indexOf(url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  const getImageGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-[220px]';
    if (count === 2) return 'grid-cols-2 max-w-[280px]';
    if (count === 3) return 'grid-cols-2 max-w-[280px]';
    return 'grid-cols-3 max-w-[320px]';
  };

  return (
    <>
      {imageItems.length > 0 && (
        <div className={`grid gap-1 mt-1 ${getImageGridClass(imageItems.length)}`}>
          {imageItems.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleImageClick(item.signedUrl)}
              className={`block rounded-lg overflow-hidden border hover:opacity-90 transition-opacity cursor-pointer ${
                imageItems.length === 3 && index === 0 ? 'col-span-2' : ''
              }`}
            >
              <img
                src={item.signedUrl}
                alt={`이미지 ${index + 1}`}
                className="w-full h-full object-cover aspect-square"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {fileItems.length > 0 && (
        <div className="flex flex-col gap-2 mt-1.5">
          {fileItems.map((item, index) => {
            const extInfo = getFileExtInfo(item.signedUrl);
            const fileName = getFileName(item.signedUrl);
            const meta = metadata[item.originalPath];
            const expiry = getExpiryFromMeta(meta);
            const expiryStr = formatExpiryDate(expiry);
            const sizeStr = meta ? formatBytes(meta.size) : '';

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleFileClick(item.signedUrl)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted/70 border border-border hover:bg-muted transition-colors text-left w-full min-w-[260px] max-w-[340px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight break-all">{fileName}</p>
                  {expiryStr && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      유효기간 {expiryStr}
                    </p>
                  )}
                  {sizeStr && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      용량 {sizeStr}
                    </p>
                  )}
                  {!sizeStr && !expiryStr && (
                    <p className="text-xs text-muted-foreground mt-0.5">{extInfo.label} 파일</p>
                  )}
                </div>
                <FileThumbnail
                  url={item.signedUrl}
                  fileType={item.signedUrl.split('?')[0].split('.').pop()?.toLowerCase() || ''}
                  icon={extInfo.icon}
                  colorClass={extInfo.color}
                  className="w-16 h-16 shrink-0"
                />
              </button>
            );
          })}
        </div>
      )}

      <ImageLightbox
        images={allItems}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
