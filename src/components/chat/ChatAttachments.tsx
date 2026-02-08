import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Image, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';
import { ImageLightbox } from '@/components/chat/ImageLightbox';

interface AttachmentFile {
  file: File;
  preview?: string;
  uploading: boolean;
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

      // Compress images before adding to attachment list
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

      validFiles.push({ file: processedFile, preview, uploading: false });
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }

    // Reset input
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
          idx === i ? { ...a, uploading: true } : a
        ));

        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, attachment.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Clear attachments after successful upload
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

  const formatFileSize = (bytes: number) => {
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
                    {formatFileSize(attachment.file.size)}
                  </p>
                </div>
              </div>
            )}

            {attachment.uploading ? (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
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

// Component to display attachments in messages with lightbox
export function MessageAttachments({ attachments }: { attachments: string[] }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((url, index) => (
          isImage(url) ? (
            <button
              key={index}
              type="button"
              onClick={() => setLightboxSrc(url)}
              className="block rounded-lg overflow-hidden border hover:opacity-90 transition-opacity cursor-pointer"
            >
              <img
                src={url}
                alt="Attachment"
                className="max-w-[200px] max-h-[200px] object-cover"
                loading="lazy"
              />
            </button>
          ) : (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm">첨부파일</span>
            </a>
          )
        ))}
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}
