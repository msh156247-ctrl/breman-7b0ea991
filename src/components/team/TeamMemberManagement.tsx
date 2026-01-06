import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserMinus, Crown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { ROLES, type UserRole } from '@/lib/constants';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Member {
  id: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  level: number;
  isLeader: boolean;
}

interface TeamMemberManagementProps {
  teamId: string;
  leaderId: string;
  members: Member[];
  onMemberUpdated: () => void;
}

export function TeamMemberManagement({ 
  teamId, 
  leaderId, 
  members, 
  onMemberUpdated 
}: TeamMemberManagementProps) {
  const { toast } = useToast();
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    setUpdatingMember(memberId);
    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({
        title: '역할 변경 완료',
        description: '멤버의 역할이 변경되었습니다.',
      });
      onMemberUpdated();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: '역할 변경 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setRemovingMember(memberId);
    try {
      const { error } = await supabase
        .from('team_memberships')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({
        title: '멤버 추방 완료',
        description: `${memberName}님이 팀에서 추방되었습니다.`,
      });
      onMemberUpdated();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: '추방 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const handleTransferLeadership = async (memberId: string, memberName: string) => {
    setUpdatingMember(memberId);
    try {
      // Update team leader
      const { error: teamError } = await supabase
        .from('teams')
        .update({ leader_id: memberId })
        .eq('id', teamId);

      if (teamError) throw teamError;

      toast({
        title: '리더 권한 이전 완료',
        description: `${memberName}님에게 팀 리더 권한이 이전되었습니다.`,
      });
      onMemberUpdated();
    } catch (error) {
      console.error('Error transferring leadership:', error);
      toast({
        title: '권한 이전 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingMember(null);
    }
  };

  // Filter out leader from manageable members
  const manageableMembers = members.filter(m => m.id !== leaderId);

  if (manageableMembers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>관리할 팀원이 없습니다.</p>
        <p className="text-sm">새로운 멤버를 초대해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        팀원의 역할을 변경하거나 팀에서 추방할 수 있습니다.
      </p>
      
      <div className="space-y-3">
        {manageableMembers.map((member) => (
          <Card key={member.id} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {member.avatar_url ? (
                    <img 
                      src={member.avatar_url} 
                      alt={member.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">{ROLES[member.role].icon}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{member.name}</h4>
                    <span className="text-xs text-muted-foreground">Lv.{member.level}</span>
                  </div>
                  <RoleBadge role={member.role} size="sm" />
                </div>

                {/* Role Change */}
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value as UserRole)}
                    disabled={updatingMember === member.id}
                  >
                    <SelectTrigger className="w-[130px]">
                      {updatingMember === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLES).map(([key, role]) => (
                        <SelectItem key={key} value={key}>
                          {role.icon} {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Transfer Leadership */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="flex-shrink-0"
                        title="리더 권한 이전"
                      >
                        <Crown className="w-4 h-4 text-secondary" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>리더 권한 이전</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{member.name}</strong>님에게 팀 리더 권한을 이전하시겠습니까?
                          <br />
                          <span className="text-destructive">이 작업은 되돌릴 수 없습니다.</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleTransferLeadership(member.id, member.name)}
                          className="bg-secondary hover:bg-secondary/90"
                        >
                          권한 이전
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Remove Member */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                        disabled={removingMember === member.id}
                      >
                        {removingMember === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>멤버 추방</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{member.name}</strong>님을 팀에서 추방하시겠습니까?
                          <br />
                          이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          추방하기
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
  );
}
