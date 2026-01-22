import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import {
  ArrowLeft,
  Route,
  Edit,
  Trash2,
  Plus,
  Eye,
  GripVertical,
  X,
  Calendar,
  Target,
} from 'lucide-react';
import { ROLE_TYPES, TRACK_STATUS } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function TrackDetail() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddShowcase, setShowAddShowcase] = useState(false);

  // Fetch track with showcases
  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          track_showcases (
            id,
            order_index,
            note,
            showcase:showcases (
              id,
              title,
              description,
              status,
              started_at,
              ended_at,
              cover_image_url
            )
          )
        `)
        .eq('id', trackId)
        .single();
      
      if (error) throw error;
      
      // Sort track_showcases by order_index
      if (data.track_showcases) {
        data.track_showcases.sort((a: { order_index: number | null }, b: { order_index: number | null }) => 
          (a.order_index || 0) - (b.order_index || 0)
        );
      }
      
      return data;
    },
    enabled: !!trackId,
  });

  // Fetch user's showcases that are not in this track
  const { data: availableShowcases } = useQuery({
    queryKey: ['available-showcases', trackId, user?.id],
    queryFn: async () => {
      // Get existing showcase IDs in this track
      const { data: existingLinks } = await supabase
        .from('track_showcases')
        .select('showcase_id')
        .eq('track_id', trackId);
      
      const existingIds = existingLinks?.map(l => l.showcase_id) || [];
      
      // Fetch user's showcases not already linked
      let query = supabase
        .from('showcases')
        .select('id, title, status, started_at')
        .eq('owner_user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (existingIds.length > 0) {
        query = query.not('id', 'in', `(${existingIds.join(',')})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!trackId && !!user && showAddShowcase,
  });

  // Fetch skills for display
  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('*');
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success('Track이 삭제되었습니다');
      navigate('/tracks');
    },
    onError: () => {
      toast.error('삭제에 실패했습니다');
    },
  });

  const addShowcaseMutation = useMutation({
    mutationFn: async (showcaseId: string) => {
      const maxOrderIndex = track?.track_showcases?.length || 0;
      
      const { error } = await supabase
        .from('track_showcases')
        .insert({
          track_id: trackId,
          showcase_id: showcaseId,
          order_index: maxOrderIndex,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      queryClient.invalidateQueries({ queryKey: ['available-showcases'] });
      toast.success('Showcase가 연결되었습니다');
      setShowAddShowcase(false);
    },
    onError: () => {
      toast.error('연결에 실패했습니다');
    },
  });

  const removeShowcaseMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('track_showcases')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      toast.success('연결이 해제되었습니다');
    },
    onError: () => {
      toast.error('연결 해제에 실패했습니다');
    },
  });

  const isOwner = track?.user_id === user?.id;

  const getRoleTypeInfo = (roleType: string) => {
    return ROLE_TYPES[roleType as keyof typeof ROLE_TYPES] || { name: roleType, color: 'bg-muted' };
  };

  const getStatusInfo = (status: string) => {
    return TRACK_STATUS[status as keyof typeof TRACK_STATUS] || { name: status, color: 'bg-muted' };
  };

  const getSkillName = (skillId: string) => {
    return skills?.find(s => s.id === skillId)?.name || skillId;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="text-center py-12">
        <Route className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Track을 찾을 수 없습니다</h2>
        <Link to="/tracks">
          <Button variant="outline">돌아가기</Button>
        </Link>
      </div>
    );
  }

  const roleTypeInfo = track.target_role_type ? getRoleTypeInfo(track.target_role_type) : null;
  const statusInfo = getStatusInfo(track.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/tracks')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-display font-bold">{track.title}</h1>
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.name}
                </Badge>
              </div>
              {roleTypeInfo && (
                <Badge variant="secondary">{roleTypeInfo.name}</Badge>
              )}
            </div>
          </div>
          
          {isOwner && (
            <div className="flex gap-2">
              <Link to={`/tracks/${trackId}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  수정
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Track 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 Track을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Description */}
      {track.description && (
        <ScrollReveal animation="fade-up" delay={100}>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground whitespace-pre-wrap">{track.description}</p>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Target Skills */}
      {track.target_skills && track.target_skills.length > 0 && (
        <ScrollReveal animation="fade-up" delay={150}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                목표 스킬
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {track.target_skills.map((skillId: string) => (
                  <Badge key={skillId} variant="secondary">
                    {getSkillName(skillId)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Connected Showcases */}
      <ScrollReveal animation="fade-up" delay={200}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              연결된 Showcase
              <Badge variant="outline">{track.track_showcases?.length || 0}</Badge>
            </CardTitle>
            {isOwner && (
              <Dialog open={showAddShowcase} onOpenChange={setShowAddShowcase}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Showcase 연결
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Showcase 연결하기</DialogTitle>
                    <DialogDescription>
                      이 Track에 연결할 Showcase를 선택하세요
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableShowcases && availableShowcases.length > 0 ? (
                      availableShowcases.map((showcase) => (
                        <div
                          key={showcase.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{showcase.title}</p>
                            {showcase.started_at && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(showcase.started_at), 'yyyy.MM.dd', { locale: ko })}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addShowcaseMutation.mutate(showcase.id)}
                            disabled={addShowcaseMutation.isPending}
                          >
                            연결
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>연결 가능한 Showcase가 없습니다</p>
                        <Link to="/showcase/create" className="mt-2 inline-block">
                          <Button variant="outline" size="sm">
                            새 Showcase 만들기
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {track.track_showcases && track.track_showcases.length > 0 ? (
              track.track_showcases.map((link: {
                id: string;
                order_index: number | null;
                note: string | null;
                showcase: {
                  id: string;
                  title: string;
                  description: string | null;
                  status: string;
                  started_at: string | null;
                  ended_at: string | null;
                  cover_image_url: string | null;
                } | null;
              }, index: number) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="w-4 h-4 cursor-grab" />
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                  </div>
                  
                  {link.showcase?.cover_image_url && (
                    <img
                      src={link.showcase.cover_image_url}
                      alt=""
                      className="w-16 h-12 rounded object-cover"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/showcase/${link.showcase?.id}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-1"
                    >
                      {link.showcase?.title}
                    </Link>
                    {link.showcase?.started_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(link.showcase.started_at), 'yyyy.MM', { locale: ko })}
                          {link.showcase.ended_at && (
                            <> ~ {format(new Date(link.showcase.ended_at), 'yyyy.MM', { locale: ko })}</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Badge variant="outline" className="text-xs">
                    {link.showcase?.status === 'published' ? '공개' : '비공개'}
                  </Badge>
                  
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeShowcaseMutation.mutate(link.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>연결된 Showcase가 없습니다</p>
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowAddShowcase(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    첫 Showcase 연결하기
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Meta Info */}
      <ScrollReveal animation="fade-up" delay={250}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                생성일: {format(new Date(track.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
              </span>
              <span>
                수정일: {format(new Date(track.updated_at), 'yyyy년 MM월 dd일', { locale: ko })}
              </span>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      <BackToTop />
    </div>
  );
}
