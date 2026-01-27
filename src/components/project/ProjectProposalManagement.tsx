import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProposalAuctionList } from './ProposalAuctionList';

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
  projectBudgetMin?: number | null;
  projectBudgetMax?: number | null;
  onProposalAccepted?: () => void;
}

export function ProjectProposalManagement({ 
  projectId,
  projectBudgetMin,
  projectBudgetMax,
  onProposalAccepted 
}: ProjectProposalManagementProps) {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

      // Reject all other pending proposals (triggers will send notifications)
      await supabase
        .from('project_proposals')
        .update({ status: 'rejected' })
        .eq('project_id', projectId)
        .neq('id', proposalId)
        .eq('status', 'pending');

      // Update project status to negotiating
      await supabase
        .from('projects')
        .update({ status: 'negotiating' })
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
        title: '🎉 팀 선택 완료!',
        description: '협상 채팅방이 생성되었습니다. 채팅에서 세부 사항을 조율하세요.',
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

  return (
    <ProposalAuctionList
      proposals={proposals}
      projectBudgetMin={projectBudgetMin}
      projectBudgetMax={projectBudgetMax}
      onAccept={handleAccept}
      onReject={handleReject}
      updatingId={updatingId}
    />
  );
}
