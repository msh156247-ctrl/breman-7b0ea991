import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, FileArchive } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ImageLightbox } from './ImageLightbox';
import { getSignedUrl } from '@/lib/storageUtils';

interface SharedFile {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'file';
  createdAt: string;
  senderName: string;
}

interface SharedFilesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function SharedFilesSheet({ open, onOpenChange, conversationId }: SharedFilesSheetProps) {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'files'>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (open) fetchSharedFiles();
  }, [open, conversationId]);

  const fetchSharedFiles = async () => {
    setLoading(true);
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, attachments, created_at, sender_id')
        .eq('conversation_id', conversationId)
        .not('attachments', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const allFiles: SharedFile[] = [];
      for (const msg of messages || []) {
        if (!msg.attachments || msg.attachments.length === 0) continue;
        const { data: sender } = await supabase.from('profiles').select('name').eq('id', msg.sender_id).single();
        for (const urlOrPath of msg.attachments) {
          // Resolve to signed URL
          const signedUrl = await getSignedUrl(urlOrPath);
          const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(signedUrl) || signedUrl.includes('/image/') || signedUrl.includes('image%2F');
          const urlParts = signedUrl.split('/');
          const encodedName = urlParts[urlParts.length - 1];
          const name = decodeURIComponent(encodedName.split('?')[0]);
          allFiles.push({
            id: `${msg.id}-${urlOrPath}`,
            url: signedUrl, name: name || '파일',
            type: isImage ? 'image' : 'file',
            createdAt: msg.created_at,
            senderName: sender?.name || '알 수 없음'
          });
        }
      }
      setFiles(allFiles);
    } catch (error) {
      console.error('Error fetching shared files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(f => {
    if (activeTab === 'all') return true;
    if (activeTab === 'images') return f.type === 'image';
    return f.type === 'file';
  });

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleImageClick = (clickedUrl: string) => {
    // Collect all image URLs for the lightbox carousel
    const imageUrls = filteredFiles.filter(f => f.type === 'image').map(f => f.url);
    const idx = imageUrls.indexOf(clickedUrl);
    setLightboxImages(imageUrls);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  const handleFileClick = (url: string) => {
    // Open file in lightbox (supports PDF inline, others show preview card)
    setLightboxImages([url]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  const content = (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="images">이미지</TabsTrigger>
          <TabsTrigger value="files">파일</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileArchive className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">공유된 파일이 없습니다</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              {activeTab === 'images' || (activeTab === 'all' && filteredFiles.some(f => f.type === 'image')) ? (
                <>
                  {activeTab === 'all' && <h4 className="text-sm font-medium mb-2">이미지</h4>}
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {filteredFiles
                      .filter(f => f.type === 'image')
                      .map((file) => (
                        <div
                          key={file.id}
                          className="rounded-lg overflow-hidden bg-muted cursor-pointer group relative"
                          onClick={() => handleImageClick(file.url)}
                        >
                          <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                            <img src={file.url} alt={file.name}
                              className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs">보기</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : null}

              {activeTab === 'files' || (activeTab === 'all' && filteredFiles.some(f => f.type === 'file')) ? (
                <>
                  {activeTab === 'all' && <h4 className="text-sm font-medium mb-2 mt-4">파일</h4>}
                  <div className="space-y-2">
                    {filteredFiles
                      .filter(f => f.type === 'file')
                      .map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
                          onClick={() => handleFileClick(file.url)}
                        >
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.senderName} · {format(new Date(file.createdAt), 'M월 d일', { locale: ko })}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0"
                            onClick={(e) => { e.stopPropagation(); handleDownload(file.url, file.name); }}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </>
              ) : null}
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>교류된 파일</DrawerTitle>
            <DrawerDescription>대화에서 공유된 파일과 이미지를 확인하세요</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle>교류된 파일</SheetTitle>
          <SheetDescription>대화에서 공유된 파일과 이미지를 확인하세요</SheetDescription>
        </SheetHeader>
        <div className="mt-4">{content}</div>
      </SheetContent>
    </Sheet>
  );
}
