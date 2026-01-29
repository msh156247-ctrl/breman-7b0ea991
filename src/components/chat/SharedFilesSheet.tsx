import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download, ExternalLink, Loader2, FileArchive } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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

export function SharedFilesSheet({
  open,
  onOpenChange,
  conversationId
}: SharedFilesSheetProps) {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'files'>('all');

  useEffect(() => {
    if (open) {
      fetchSharedFiles();
    }
  }, [open, conversationId]);

  const fetchSharedFiles = async () => {
    setLoading(true);
    try {
      // Fetch messages with attachments
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, attachments, created_at, sender_id')
        .eq('conversation_id', conversationId)
        .not('attachments', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract files from attachments
      const allFiles: SharedFile[] = [];
      
      for (const msg of messages || []) {
        if (!msg.attachments || msg.attachments.length === 0) continue;

        // Fetch sender name
        const { data: sender } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', msg.sender_id)
          .single();

        for (const url of msg.attachments) {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || 
                         url.includes('/image/') ||
                         url.includes('image%2F');
          
          // Extract filename from URL
          const urlParts = url.split('/');
          const encodedName = urlParts[urlParts.length - 1];
          const name = decodeURIComponent(encodedName.split('?')[0]);

          allFiles.push({
            id: `${msg.id}-${url}`,
            url,
            name: name || '파일',
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
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
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
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {filteredFiles
                      .filter(f => f.type === 'image')
                      .map((file) => (
                        <div
                          key={file.id}
                          className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group relative"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-5 w-5 text-white" />
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
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => handleDownload(file.url, file.name)}
                          >
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
          <div className="px-4 pb-6">
            {content}
          </div>
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
        <div className="mt-4">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
