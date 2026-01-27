import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X, Clock, DollarSign, Users, Star, MessageSquare, TrendingUp, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Proposal {
  id: string;
  proposal_text: string | null;
  proposed_budget: number | null;
  proposed_timeline_weeks: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string | null;
  team: {
    id: string;
    name: string;
    emblem_url: string | null;
    rating_avg: number | null;
    avg_level: number | null;
  } | null;
}

interface ProposalAuctionListProps {
  proposals: Proposal[];
  projectBudgetMin?: number | null;
  projectBudgetMax?: number | null;
  onAccept: (proposalId: string, teamId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  updatingId: string | null;
}

function formatBudget(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(0)}천만원`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}백만원`;
  return `${amount.toLocaleString()}원`;
}

type SortKey = 'budget_low' | 'budget_high' | 'timeline' | 'rating' | 'level';

export function ProposalAuctionList({ 
  proposals, 
  projectBudgetMin,
  projectBudgetMax,
  onAccept, 
  onReject,
  updatingId 
}: ProposalAuctionListProps) {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('budget_low');

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const processedProposals = proposals.filter(p => p.status !== 'pending');

  // Sort proposals
  const sortedPending = [...pendingProposals].sort((a, b) => {
    switch (sortBy) {
      case 'budget_low':
        return (a.proposed_budget || 0) - (b.proposed_budget || 0);
      case 'budget_high':
        return (b.proposed_budget || 0) - (a.proposed_budget || 0);
      case 'timeline':
        return (a.proposed_timeline_weeks || 0) - (b.proposed_timeline_weeks || 0);
      case 'rating':
        return (b.team?.rating_avg || 0) - (a.team?.rating_avg || 0);
      case 'level':
        return (b.team?.avg_level || 0) - (a.team?.avg_level || 0);
      default:
        return 0;
    }
  });

  // Find best proposal (lowest budget with highest rating)
  const bestProposal = sortedPending.length > 0 ? sortedPending[0] : null;

  const getStatusVariant = (status: Proposal['status']) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'destructive';
      case 'withdrawn': return 'muted';
      default: return 'muted';
    }
  };

  const getStatusLabel = (status: Proposal['status']) => {
    switch (status) {
      case 'pending': return '검토중';
      case 'accepted': return '수락됨';
      case 'rejected': return '거절됨';
      case 'withdrawn': return '철회됨';
      default: return status;
    }
  };

  if (proposals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>아직 들어온 제안서가 없습니다.</p>
        <p className="text-sm">팀들이 제안을 보내면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      {pendingProposals.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">정렬:</span>
          {[
            { key: 'budget_low' as SortKey, label: '낮은 예산순' },
            { key: 'budget_high' as SortKey, label: '높은 예산순' },
            { key: 'timeline' as SortKey, label: '빠른 일정순' },
            { key: 'rating' as SortKey, label: '평점순' },
            { key: 'level' as SortKey, label: '레벨순' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={sortBy === key ? 'default' : 'outline'}
              onClick={() => setSortBy(key)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {/* Pending Proposals - Auction Style */}
      {sortedPending.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              입찰 현황 ({sortedPending.length}건)
            </h3>
          </div>
          
          <div className="space-y-3">
            {sortedPending.map((proposal, index) => {
              const isBest = proposal.id === bestProposal?.id && sortedPending.length > 1;
              
              return (
                <Card 
                  key={proposal.id} 
                  className={cn(
                    "transition-all",
                    isBest && "border-2 border-success ring-2 ring-success/20",
                    !isBest && "border-border/50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* Header with Ranking */}
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                          index === 0 && "bg-success text-success-foreground",
                          index === 1 && "bg-secondary text-secondary-foreground",
                          index === 2 && "bg-primary/20 text-primary",
                          index > 2 && "bg-muted text-muted-foreground"
                        )}>
                          {index === 0 ? <Trophy className="w-4 h-4" /> : index + 1}
                        </div>

                        {/* Team Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            {proposal.team?.emblem_url ? (
                              <AvatarImage src={proposal.team.emblem_url} />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-lg">
                                {proposal.team?.name?.[0] || '?'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{proposal.team?.name || '알 수 없음'}</h4>
                              {isBest && (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                                  최적 제안
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-secondary fill-secondary" />
                                {proposal.team?.rating_avg?.toFixed(1) || '0.0'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Lv.{proposal.team?.avg_level || 1}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Budget & Timeline - Prominent Display */}
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <div className="text-xs text-muted-foreground">제안 예산</div>
                            <div className="font-bold text-lg text-success">
                              {proposal.proposed_budget ? formatBudget(proposal.proposed_budget) : '협의'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">예상 기간</div>
                            <div className="font-bold text-lg text-primary">
                              {proposal.proposed_timeline_weeks || '?'}주
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedProposal(proposal)}
                        >
                          상세보기
                        </Button>
                        
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                                disabled={updatingId === proposal.id}
                              >
                                <X className="w-4 h-4 mr-1" />
                                거절
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>제안 거절</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{proposal.team?.name}</strong> 팀의 제안을 거절하시겠습니까?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onReject(proposal.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  거절하기
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm"
                                className="bg-gradient-primary"
                                disabled={updatingId === proposal.id}
                              >
                                {updatingId === proposal.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    선택하기
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>🎉 팀 선택</AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                  <p>
                                    <strong>{proposal.team?.name}</strong> 팀을 선택하시겠습니까?
                                  </p>
                                  <div className="bg-muted/50 rounded-lg p-3 mt-3">
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between">
                                        <span>제안 예산:</span>
                                        <span className="font-medium text-success">
                                          {proposal.proposed_budget ? formatBudget(proposal.proposed_budget) : '협의'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>예상 기간:</span>
                                        <span className="font-medium">{proposal.proposed_timeline_weeks}주</span>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    • 선택 시 다른 팀들에게 알림이 전송됩니다<br/>
                                    • 협상 채팅방이 자동으로 생성됩니다<br/>
                                    • 프로젝트 상태가 '협상 중'으로 변경됩니다
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => proposal.team && onAccept(proposal.id, proposal.team.id)}
                                  className="bg-gradient-primary"
                                >
                                  선택하기
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Processed Proposals */}
      {processedProposals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            처리 완료 ({processedProposals.length}건)
          </h3>
          <div className="space-y-3">
            {processedProposals.map((proposal) => (
              <Card key={proposal.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0 opacity-70">
                      {proposal.team?.emblem_url ? (
                        <AvatarImage src={proposal.team.emblem_url} />
                      ) : (
                        <AvatarFallback className="bg-muted text-lg">
                          {proposal.team?.name?.[0] || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate opacity-70">{proposal.team?.name || '알 수 없음'}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {proposal.proposed_budget ? formatBudget(proposal.proposed_budget) : '협의'}
                        </span>
                        <span>•</span>
                        <span>{proposal.proposed_timeline_weeks || '?'}주</span>
                      </div>
                    </div>
                    <StatusBadge 
                      status={getStatusLabel(proposal.status)} 
                      variant={getStatusVariant(proposal.status)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Proposal Detail Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-sm">
                  {selectedProposal?.team?.name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              {selectedProposal?.team?.name} 팀의 제안
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.created_at && new Date(selectedProposal.created_at).toLocaleDateString('ko-KR')} 제출
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">제안 예산</div>
                <div className="font-semibold text-success text-lg">
                  {selectedProposal?.proposed_budget ? formatBudget(selectedProposal.proposed_budget) : '협의'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">예상 기간</div>
                <div className="font-semibold text-lg">
                  {selectedProposal?.proposed_timeline_weeks || '?'}주
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">팀 평점</div>
                <div className="font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4 text-secondary fill-secondary" />
                  {selectedProposal?.team?.rating_avg?.toFixed(1) || '0.0'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">팀 레벨</div>
                <div className="font-semibold">
                  Lv.{selectedProposal?.team?.avg_level || 1}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">제안 내용</div>
              <div className="p-3 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap">
                {selectedProposal?.proposal_text || '내용이 없습니다.'}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
