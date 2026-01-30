import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import { TeamApplicationManagement } from './TeamApplicationManagement';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ApplicationManagementSheetProps {
  teamId: string;
  onApplicationHandled?: () => void;
}

export function ApplicationManagementSheet({ 
  teamId, 
  onApplicationHandled 
}: ApplicationManagementSheetProps) {
  const isMobile = useIsMobile();

  const content = (
    <TeamApplicationManagement 
      teamId={teamId} 
      onApplicationHandled={onApplicationHandled}
    />
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm">
            확인
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              지원서 관리
            </DrawerTitle>
            <DrawerDescription>
              팀 지원서를 검토하고 수락/거절하세요.
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-y-auto px-4 pb-6" style={{ maxHeight: 'calc(85vh - 100px)' }}>
            {content}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          확인
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            지원서 관리
          </DialogTitle>
          <DialogDescription>
            팀 지원서를 검토하고 수락/거절하세요.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
