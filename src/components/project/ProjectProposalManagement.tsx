import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X, Clock, DollarSign, Users, Star, MessageSquare } from 'lucide-react';
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

interface ProjectProposalManagementProps {
  projectId: string;
  onProposalAccepted?: () => void;
}

function formatBudget(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(0)}천만원`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}백만원`;
  return `${amount.toLocaleString()}원`;
}

export function ProjectProposalManagement({ 
  projectId,
  onProposalAccepted 
}: ProjectProposalManagementProps) {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    fetchProposals();
  }, [projectId]);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('project_proposals')
        .select(`
          *,
          team:teams!project_proposals_team_id_fkey(
            id, name, emblem_url, rating_avg, avg_level
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProposals((data || []).map(p => ({
        ...p,
        status: p.status as Proposal['status'],
        team: p.team as Proposal['team'],
      })));
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast({
        title: '오류',
        description: '제안서를 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (proposalId: string, teamId: string) => {
    setUpdatingId(proposalId);
    try {
      // Update proposal status to accepted
      const { error: proposalError } = await supabase
        .from('project_proposals')
        .update({ status: 'accepted' })
        .eq('id', proposalId);

      if (proposalError) throw proposalError;

      // Reject all other pending proposals
      await supabase
        .from('project_proposals')
        .update({ status: 'rejected' })
        .eq('project_id', projectId)
        .neq('id', proposalId)
        .eq('status', 'pending');

      // Update project status to matched
      await supabase
        .from('projects')
        .update({ status: 'matched' })
        .eq('id', projectId);

      // Create contract
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        await supabase
          .from('contracts')
          .insert({
            project_id: projectId,
            team_id: teamId,
            total_amount: proposal.proposed_budget,
            status: 'draft',
          });
      }

      toast({
        title: '제안 수락 완료',
        description: '팀과의 계약이 생성되었습니다.',
      });
      
      fetchProposals();
      onProposalAccepted?.();
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast({
        title: '오류',
        description: '제안을 수락할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    setUpdatingId(proposalId);
    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);

      if (error) throw error;

      toast({
        title: '제안 거절 완료',
      });
      
      fetchProposals();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast({
        title: '오류',
        description: '제안을 거절할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>아직 들어온 제안서가 없습니다.</p>
        <p className="text-sm">팀들이 제안을 보내면 여기에 표시됩니다.</p>
      </div>
    );
  }

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const processedProposals = proposals.filter(p => p.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Proposals */}
      {pendingProposals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            검토 대기중 ({pendingProposals.length}건)
          </h3>
          <div className="space-y-3">
            {pendingProposals.map((proposal) => (
              <Card key={proposal.id} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Team Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        {proposal.team?.emblem_url ? (
                          <AvatarImage src={proposal.team.emblem_url} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-xl">
                            {proposal.team?.name?.[0] || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{proposal.team?.name || '알 수 없음'}</h4>
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

                    {/* Proposal Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-success" />
                        <span className="font-medium">
                          {proposal.proposed_budget ? formatBudget(proposal.proposed_budget) : '협의'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{proposal.proposed_timeline_weeks || '?'}주</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedProposal(proposal)}
                      >
                        상세보기
                      </Button>
                      
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
                                수락
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>제안 수락</AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>{proposal.team?.name}</strong> 팀의 제안을 수락하시겠습니까?
                              <br />
                              수락 시 다른 모든 제안은 자동으로 거절되고, 계약이 생성됩니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => proposal.team && handleAccept(proposal.id, proposal.team.id)}
                              className="bg-gradient-primary"
                            >
                              수락하기
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                            disabled={updatingId === proposal.id}
                          >
                            <X className="w-4 h-4" />
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
                              onClick={() => handleReject(proposal.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              거절하기
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                <div className="font-semibold text-success">
                  {selectedProposal?.proposed_budget ? formatBudget(selectedProposal.proposed_budget) : '협의'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">예상 기간</div>
                <div className="font-semibold">
                  {selectedProposal?.proposed_timeline_weeks || '?'}주
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
