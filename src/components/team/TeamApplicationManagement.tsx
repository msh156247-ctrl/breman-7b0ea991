import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROLE_TYPES, APPLICATION_STATUS, type RoleType } from '@/lib/constants';
import { toast } from 'sonner';
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

interface Application {
  id: string;
  user_id: string;
  desired_role: string;
  role_type: RoleType | null;
  intro: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
    level: number;
  };
}

interface TeamApplicationManagementProps {
  teamId: string;
  onApplicationHandled?: () => void;
}

export function TeamApplicationManagement({ teamId, onApplicationHandled }: TeamApplicationManagementProps) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['team-applications', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_applications')
        .select(`
          id,
          user_id,
          desired_role,
          role_type,
          intro,
          status,
          created_at,
          user:profiles!team_applications_user_id_fkey(id, name, avatar_url, level)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Application[];
    },
  });

  const handleApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, action }: { applicationId: string; action: 'accept' | 'reject' }) => {
      setProcessingId(applicationId);
      
      const application = applications.find(a => a.id === applicationId);
      if (!application) throw new Error('지원서를 찾을 수 없습니다');

      // Update application status
      const { error: updateError } = await supabase
        .from('team_applications')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'rejected' 
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // If accepted, add as team member
      if (action === 'accept') {
        const { error: memberError } = await supabase
          .from('team_memberships')
          .insert({
            team_id: teamId,
            user_id: application.user_id,
            role: application.desired_role as 'horse' | 'dog' | 'cat' | 'rooster',
          });

        if (memberError) throw memberError;

        // Close the role slot if it exists
        if (application.role_type) {
          await supabase
            .from('team_role_slots')
            .update({ is_open: false })
            .eq('team_id', teamId)
            .eq('role_type', application.role_type)
            .eq('is_open', true)
            .limit(1);
        }
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['team-applications', teamId] });
      toast.success(action === 'accept' ? '지원을 수락했습니다' : '지원을 거절했습니다');
      onApplicationHandled?.();
      setProcessingId(null);
    },
    onError: (error) => {
      toast.error('처리 실패: ' + error.message);
      setProcessingId(null);
    },
  });

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const handledApplications = applications.filter(a => a.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-8 text-center">
          <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">아직 지원자가 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            대기중인 지원 ({pendingApplications.length}건)
          </h3>
          <div className="grid gap-4">
            {pendingApplications.map((application) => (
              <Card key={application.id} className="border-primary/30">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Applicant info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg overflow-hidden">
                        {application.user.avatar_url ? (
                          <img 
                            src={application.user.avatar_url} 
                            alt={application.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          application.user.name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{application.user.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            Lv.{application.user.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>
                            {application.role_type 
                              ? `${ROLE_TYPES[application.role_type]?.icon || ''} ${ROLE_TYPES[application.role_type]?.name || application.role_type}`
                              : application.desired_role
                            }
                          </span>
                          <span>•</span>
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(application.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={processingId === application.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            거절
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>지원 거절</AlertDialogTitle>
                            <AlertDialogDescription>
                              {application.user.name}님의 지원을 거절하시겠습니까?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleApplicationMutation.mutate({ 
                                applicationId: application.id, 
                                action: 'reject' 
                              })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              거절하기
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button 
                        size="sm"
                        className="bg-gradient-to-r from-success to-emerald-400 text-white"
                        onClick={() => handleApplicationMutation.mutate({ 
                          applicationId: application.id, 
                          action: 'accept' 
                        })}
                        disabled={processingId === application.id}
                      >
                        {processingId === application.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        수락
                      </Button>
                    </div>
                  </div>

                  {/* Intro */}
                  {application.intro && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                      {application.intro}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Handled Applications */}
      {handledApplications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            처리된 지원 ({handledApplications.length}건)
          </h3>
          <div className="grid gap-3">
            {handledApplications.slice(0, 5).map((application) => (
              <Card key={application.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm overflow-hidden">
                        {application.user.avatar_url ? (
                          <img 
                            src={application.user.avatar_url} 
                            alt={application.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          application.user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{application.user.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {application.role_type 
                            ? ROLE_TYPES[application.role_type]?.name 
                            : application.desired_role
                          }
                        </div>
                      </div>
                    </div>
                    <StatusBadge 
                      status={APPLICATION_STATUS[application.status]?.name || application.status}
                      variant={APPLICATION_STATUS[application.status]?.color as any || 'muted'}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
