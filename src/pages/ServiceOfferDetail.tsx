import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Briefcase, Clock, Wallet, Star, Eye, Users, MessageSquare, Edit, Trash2, Mail } from 'lucide-react';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';
import { RoleTypeBadge } from '@/components/ui/RoleBadge';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ServiceOffer {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  service_category: string;
  budget_min: number | null;
  budget_max: number | null;
  timeline_weeks: number | null;
  offered_skills: string[];
  offered_roles: RoleType[];
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface Team {
  id: string;
  name: string;
  emblem_url: string | null;
  leader_id: string;
  rating_avg: number | null;
  slogan: string | null;
}

interface Inquiry {
  id: string;
  client_id: string;
  message: string;
  budget_proposal: number | null;
  timeline_proposal: number | null;
  status: string;
  created_at: string;
  client: {
    name: string;
    avatar_url: string | null;
  };
}

const SERVICE_CATEGORIES = {
  development: { name: '개발', icon: '💻' },
  design: { name: '디자인', icon: '🎨' },
  marketing: { name: '마케팅', icon: '📢' },
  content: { name: '콘텐츠', icon: '✍️' },
  consulting: { name: '컨설팅', icon: '💡' },
  general: { name: '기타', icon: '📦' },
};

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return '협의';
  if (min && max) {
    return `${(min / 10000).toLocaleString()}만 ~ ${(max / 10000).toLocaleString()}만원`;
  }
  if (min) return `${(min / 10000).toLocaleString()}만원~`;
  if (max) return `~${(max / 10000).toLocaleString()}만원`;
  return '협의';
}

export default function ServiceOfferDetail() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState<ServiceOffer | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    message: '',
    budget_proposal: '',
    timeline_proposal: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isOwner = team?.leader_id === user?.id;

  useEffect(() => {
    if (offerId) {
      fetchOfferData();
    }
  }, [offerId]);

  const fetchOfferData = async () => {
    try {
      // Fetch offer
      const { data: offerData, error: offerError } = await supabase
        .from('team_service_offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (offerError) throw offerError;
      setOffer(offerData as ServiceOffer);

      // Increment view count
      await supabase
        .from('team_service_offers')
        .update({ view_count: (offerData.view_count || 0) + 1 })
        .eq('id', offerId);

      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name, emblem_url, leader_id, rating_avg, slogan')
        .eq('id', offerData.team_id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch inquiries if owner
      if (teamData.leader_id === user?.id) {
        const { data: inquiriesData } = await supabase
          .from('service_inquiries')
          .select(`
            *,
            client:profiles!client_id(name, avatar_url)
          `)
          .eq('offer_id', offerId)
          .order('created_at', { ascending: false });

        setInquiries((inquiriesData || []) as unknown as Inquiry[]);
      }
    } catch (error) {
      console.error('Error fetching offer:', error);
      toast.error('서비스를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleInquirySubmit = async () => {
    if (!inquiryForm.message.trim()) {
      toast.error('문의 내용을 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('service_inquiries')
        .insert({
          offer_id: offerId,
          client_id: user?.id,
          message: inquiryForm.message.trim(),
          budget_proposal: inquiryForm.budget_proposal ? parseInt(inquiryForm.budget_proposal) * 10000 : null,
          timeline_proposal: inquiryForm.timeline_proposal ? parseInt(inquiryForm.timeline_proposal) : null,
        });

      if (error) throw error;

      toast.success('문의가 전송되었습니다');
      setInquiryDialogOpen(false);
      setInquiryForm({ message: '', budget_proposal: '', timeline_proposal: '' });
    } catch (error: any) {
      console.error('Error submitting inquiry:', error);
      toast.error('문의 전송에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const { error } = await supabase
        .from('team_service_offers')
        .update({ status })
        .eq('id', offerId);

      if (error) throw error;

      setOffer(prev => prev ? { ...prev, status } : null);
      toast.success('상태가 변경되었습니다');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('team_service_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast.success('서비스가 삭제되었습니다');
      navigate('/service-offers');
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('삭제에 실패했습니다');
    }
  };

  const handleInquiryResponse = async (inquiryId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('service_inquiries')
        .update({ status })
        .eq('id', inquiryId);

      if (error) throw error;

      setInquiries(prev => 
        prev.map(inq => inq.id === inquiryId ? { ...inq, status } : inq)
      );
      toast.success(status === 'accepted' ? '문의를 수락했습니다' : '문의를 거절했습니다');
    } catch (error) {
      console.error('Error updating inquiry:', error);
      toast.error('처리에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!offer || !team) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-2">서비스를 찾을 수 없습니다</h3>
            <Button onClick={() => navigate('/service-offers')}>목록으로</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const category = SERVICE_CATEGORIES[offer.service_category as keyof typeof SERVICE_CATEGORIES] || SERVICE_CATEGORIES.general;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Badge variant="outline" className="text-base">
          {category.icon} {category.name}
        </Badge>
        {offer.status !== 'active' && (
          <Badge variant="secondary">{offer.status === 'paused' ? '일시중지' : '종료'}</Badge>
        )}
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Offer details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{offer.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {offer.view_count}회 조회
                </span>
                <span>
                  {new Date(offer.created_at).toLocaleDateString('ko-KR')} 등록
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-medium mb-2">서비스 설명</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {offer.description || '설명이 없습니다.'}
                </p>
              </div>

              {/* Offered roles */}
              {offer.offered_roles.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">제공 역할</h3>
                  <div className="flex flex-wrap gap-2">
                    {offer.offered_roles.map((role) => (
                      <RoleTypeBadge key={role} roleType={role} />
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {offer.offered_skills.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">보유 기술</h3>
                  <div className="flex flex-wrap gap-2">
                    {offer.offered_skills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">예상 비용</p>
                    <p className="font-medium">{formatBudget(offer.budget_min, offer.budget_max)}</p>
                  </div>
                </div>
                {offer.timeline_weeks && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">예상 기간</p>
                      <p className="font-medium">{offer.timeline_weeks}주</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inquiries (for owner) */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  문의 ({inquiries.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inquiries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    아직 문의가 없습니다
                  </p>
                ) : (
                  <div className="space-y-4">
                    {inquiries.map((inquiry) => (
                      <div key={inquiry.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={inquiry.client.avatar_url || undefined} />
                              <AvatarFallback>{inquiry.client.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{inquiry.client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </div>
                          <Badge variant={
                            inquiry.status === 'accepted' ? 'default' :
                            inquiry.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {inquiry.status === 'accepted' ? '수락됨' :
                             inquiry.status === 'rejected' ? '거절됨' : '대기중'}
                          </Badge>
                        </div>
                        <p className="text-sm">{inquiry.message}</p>
                        {(inquiry.budget_proposal || inquiry.timeline_proposal) && (
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {inquiry.budget_proposal && (
                              <span>희망 예산: {(inquiry.budget_proposal / 10000).toLocaleString()}만원</span>
                            )}
                            {inquiry.timeline_proposal && (
                              <span>희망 기간: {inquiry.timeline_proposal}주</span>
                            )}
                          </div>
                        )}
                        {inquiry.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleInquiryResponse(inquiry.id, 'accepted')}>
                              수락
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleInquiryResponse(inquiry.id, 'rejected')}>
                              거절
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Team info & actions */}
        <div className="space-y-4">
          {/* Team card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">제공 팀</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={`/teams/${team.id}`} className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={team.emblem_url || undefined} />
                    <AvatarFallback>{team.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    {team.slogan && (
                      <p className="text-sm text-muted-foreground truncate">{team.slogan}</p>
                    )}
                    {team.rating_avg && team.rating_avg > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {team.rating_avg.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Actions */}
          {isOwner ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">관리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/service-offers/${offerId}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    수정
                  </Link>
                </Button>
                {offer.status === 'active' ? (
                  <Button variant="outline" className="w-full" onClick={() => handleStatusChange('paused')}>
                    일시중지
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => handleStatusChange('active')}>
                    다시 활성화
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>서비스 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 서비스 오퍼를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ) : user && (
            <Card>
              <CardContent className="p-4">
                <Dialog open={inquiryDialogOpen} onOpenChange={setInquiryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      문의하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>서비스 문의</DialogTitle>
                      <DialogDescription>
                        이 팀에 서비스 문의를 보내세요
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="message">문의 내용 *</Label>
                        <Textarea
                          id="message"
                          placeholder="프로젝트에 대해 설명해주세요..."
                          value={inquiryForm.message}
                          onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="budget">희망 예산 (만원)</Label>
                          <Input
                            id="budget"
                            type="number"
                            placeholder="예: 500"
                            value={inquiryForm.budget_proposal}
                            onChange={(e) => setInquiryForm(prev => ({ ...prev, budget_proposal: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timeline">희망 기간 (주)</Label>
                          <Input
                            id="timeline"
                            type="number"
                            placeholder="예: 4"
                            value={inquiryForm.timeline_proposal}
                            onChange={(e) => setInquiryForm(prev => ({ ...prev, timeline_proposal: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInquiryDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={handleInquirySubmit} disabled={submitting}>
                        {submitting ? '전송 중...' : '문의 전송'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  팀에 직접 문의하여 상담을 받으세요
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
