import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Plus, CheckCircle, Clock, XCircle, FileText, User, Briefcase, GraduationCap, Users, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: string;
  status: string;
  description: string | null;
  admin_note: string | null;
  submitted_documents: string[];
  created_at: string;
  reviewed_at: string | null;
}

const VERIFICATION_TYPES = {
  identity: { 
    label: '본인 인증', 
    icon: User, 
    description: '신분증, 재직증명서 등을 통한 본인 확인',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  career: { 
    label: '경력 인증', 
    icon: Briefcase, 
    description: '이전 직장 경력 및 근무 이력 확인',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  education: { 
    label: '학력 인증', 
    icon: GraduationCap, 
    description: '졸업증명서, 성적증명서 등을 통한 학력 확인',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  },
  team_leader: { 
    label: '팀 리더 인증', 
    icon: Users, 
    description: '팀 리더로서의 역할 및 권한 검증',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  },
  project_creator: { 
    label: '프로젝트 의뢰자 인증', 
    icon: FolderKanban, 
    description: '프로젝트 의뢰 권한 및 결제 능력 확인',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
  },
};

const STATUS_BADGES = {
  pending: { label: '검토중', variant: 'outline' as const, icon: Clock },
  approved: { label: '승인됨', variant: 'default' as const, icon: CheckCircle },
  rejected: { label: '거절됨', variant: 'destructive' as const, icon: XCircle },
};

export function VerificationRequestManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast.error('인증 요청 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedType || !user) return;

    // Check if there's already a pending request of this type
    const existingPending = requests.find(
      r => r.verification_type === selectedType && r.status === 'pending'
    );
    if (existingPending) {
      toast.error('이미 검토 중인 동일한 유형의 요청이 있습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          verification_type: selectedType,
          description: description || null,
        });

      if (error) throw error;

      toast.success('인증 요청이 제출되었습니다. 검토 후 결과를 알려드립니다.');
      setIsDialogOpen(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      console.error('Error submitting verification request:', error);
      toast.error('인증 요청 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedType('');
    setDescription('');
  };

  // Get types that already have approved status
  const approvedTypes = requests
    .filter(r => r.status === 'approved')
    .map(r => r.verification_type);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            인증 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              인증 현황
            </CardTitle>
            <CardDescription>
              본인, 경력, 학력 등의 인증을 통해 신뢰도를 높이세요
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                인증 요청
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>인증 요청</DialogTitle>
                <DialogDescription>
                  인증 유형을 선택하고 필요한 정보를 제출해주세요
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>인증 유형</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="인증 유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VERIFICATION_TYPES).map(([key, type]) => {
                        const isApproved = approvedTypes.includes(key);
                        return (
                          <SelectItem 
                            key={key} 
                            value={key}
                            disabled={isApproved}
                          >
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              <span>{type.label}</span>
                              {isApproved && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  인증완료
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedType && (
                    <p className="text-sm text-muted-foreground">
                      {VERIFICATION_TYPES[selectedType as keyof typeof VERIFICATION_TYPES]?.description}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>추가 설명 (선택사항)</Label>
                  <Textarea
                    placeholder="인증에 도움이 될 추가 정보를 입력해주세요"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <FileText className="w-4 h-4 inline mr-2" />
                  인증에 필요한 서류는 채팅이나 이메일로 별도 제출해주세요
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button 
                  onClick={handleSubmitRequest} 
                  disabled={!selectedType || isSubmitting}
                >
                  {isSubmitting ? '제출 중...' : '요청하기'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Verification Summary */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(VERIFICATION_TYPES).map(([key, type]) => {
            const isApproved = approvedTypes.includes(key);
            return (
              <Badge
                key={key}
                variant={isApproved ? 'default' : 'outline'}
                className={`gap-1 ${isApproved ? type.color : 'opacity-50'}`}
              >
                {isApproved ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <type.icon className="w-3 h-3" />
                )}
                {type.label}
              </Badge>
            );
          })}
        </div>

        {/* Request History */}
        {requests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">아직 인증 요청 이력이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">요청 이력</h4>
            {requests.map((request) => {
              const typeInfo = VERIFICATION_TYPES[request.verification_type as keyof typeof VERIFICATION_TYPES];
              const statusInfo = STATUS_BADGES[request.status as keyof typeof STATUS_BADGES];
              const StatusIcon = statusInfo?.icon || Clock;

              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {typeInfo && <typeInfo.icon className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <span className="font-medium text-sm">
                        {typeInfo?.label || request.verification_type}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo?.variant || 'outline'} className="gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo?.label || request.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
