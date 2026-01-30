import { useNavigate } from 'react-router-dom';
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
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Proposal {
  id: string;
  project_id: string;
  status: string;
  proposed_budget: number | null;
  proposed_timeline_weeks: number | null;
  project?: {
    id: string;
    title: string;
  } | null;
}

interface ProposalListSheetProps {
  proposals: Proposal[];
  loading: boolean;
}

export function ProposalListSheet({ proposals, loading }: ProposalListSheetProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'accepted': return '수락됨';
      case 'rejected': return '거절됨';
      case 'pending': return '대기중';
      default: return status || '알 수 없음';
    }
  };

  const content = (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          보낸 제안이 없습니다
        </div>
      ) : (
        proposals.map((proposal) => (
          <Card 
            key={proposal.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/projects/${proposal.project_id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {proposal.project?.title || '프로젝트'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {proposal.proposed_budget ? `${(proposal.proposed_budget / 10000).toLocaleString()}만원` : '예산 미정'}
                    {proposal.proposed_timeline_weeks && ` · ${proposal.proposed_timeline_weeks}주`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(proposal.status)}
                  <span className="text-sm">{getStatusLabel(proposal.status)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
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
              <Inbox className="w-5 h-5" />
              제안 리스트
            </DrawerTitle>
            <DrawerDescription>
              프로젝트에 보낸 제안 현황을 확인하세요.
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
            <Inbox className="w-5 h-5" />
            제안 리스트
          </DialogTitle>
          <DialogDescription>
            프로젝트에 보낸 제안 현황을 확인하세요.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
