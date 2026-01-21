import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Sparkles, 
  Users, 
  User, 
  Calendar,
  Eye,
  Target,
  Lightbulb,
  Cog,
  CheckCircle2,
  MessageSquare,
  Edit,
  Trash2,
  Share2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
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
} from "@/components/ui/alert-dialog";

export default function ShowcaseDetail() {
  const { showcaseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch showcase detail
  const { data: showcase, isLoading } = useQuery({
    queryKey: ['showcase', showcaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('showcases')
        .select(`
          *,
          owner_user:profiles!showcases_owner_user_id_fkey(id, name, avatar_url, bio, main_role_type),
          owner_team:teams!showcases_owner_team_id_fkey(id, name, emblem_url, description),
          showcase_contributors(
            id,
            user_id,
            role_type,
            role_description,
            contribution_summary,
            xp_earned,
            is_verified,
            profiles:profiles!showcase_contributors_user_id_fkey(id, name, avatar_url, main_role_type)
          ),
          showcase_skills(
            id,
            skill_id,
            proficiency_level,
            skills:skills!showcase_skills_skill_id_fkey(name, category)
          )
        `)
        .eq('id', showcaseId)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase
        .from('showcases')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', showcaseId);

      return data;
    },
    enabled: !!showcaseId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('showcases')
        .delete()
        .eq('id', showcaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Showcase가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['showcases'] });
      navigate('/showcase');
    },
    onError: () => {
      toast.error('삭제 중 오류가 발생했습니다');
    },
  });

  const isOwner = user && (
    showcase?.owner_user_id === user.id ||
    (showcase?.owner_team && showcase.owner_team.id) // TODO: Check team leader
  );

  const getRoleTypeInfo = (roleType: string) => {
    return ROLE_TYPES[roleType as RoleType] || { name: roleType, icon: '👤', color: 'from-gray-500 to-gray-400' };
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-lg" />
        <div className="h-40 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!showcase) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Showcase를 찾을 수 없습니다</h3>
        <Button asChild variant="outline">
          <Link to="/showcase">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <ScrollReveal>
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link to="/showcase">
            <ArrowLeft className="w-4 h-4" />
            Showcase 목록
          </Link>
        </Button>
      </ScrollReveal>

      {/* Header */}
      <ScrollReveal delay={0.1}>
        <div className="space-y-4">
          {/* Cover Image */}
          {showcase.cover_image_url && (
            <div className="rounded-xl overflow-hidden h-64 md:h-80">
              <img 
                src={showcase.cover_image_url} 
                alt={showcase.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & Meta */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">{showcase.title}</h1>
              
              {/* Owner Info */}
              <div className="flex items-center gap-3">
                {showcase.owner_team ? (
                  <Link to={`/teams/${showcase.owner_team.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={showcase.owner_team.emblem_url || undefined} />
                      <AvatarFallback>{showcase.owner_team.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {showcase.owner_team.name}
                    </span>
                  </Link>
                ) : showcase.owner_user ? (
                  <Link to={`/profile/${showcase.owner_user.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={showcase.owner_user.avatar_url || undefined} />
                      <AvatarFallback>{showcase.owner_user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {showcase.owner_user.name}
                    </span>
                  </Link>
                ) : null}

                <Separator orientation="vertical" className="h-4" />

                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {showcase.started_at && showcase.ended_at ? (
                    <>
                      {format(new Date(showcase.started_at), 'yyyy.MM', { locale: ko })} - {format(new Date(showcase.ended_at), 'yyyy.MM', { locale: ko })}
                    </>
                  ) : (
                    format(new Date(showcase.created_at), 'yyyy.MM.dd', { locale: ko })
                  )}
                </span>

                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {showcase.view_count || 0}
                </span>
              </div>
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/showcase/${showcaseId}/edit`}>
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Showcase 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 이 Showcase를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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

          {/* Description */}
          {showcase.description && (
            <p className="text-muted-foreground">{showcase.description}</p>
          )}

          {/* Skills */}
          {showcase.showcase_skills && showcase.showcase_skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {showcase.showcase_skills.map((ss: any) => (
                <Badge key={ss.id} variant="secondary" className="gap-1">
                  {ss.skills?.name}
                  <span className="text-xs text-muted-foreground">Lv.{ss.proficiency_level}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Content Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Goal */}
          {showcase.goal && (
            <ScrollReveal delay={0.2}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    목표
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{showcase.goal}</p>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {/* Process */}
          {showcase.process && (
            <ScrollReveal delay={0.25}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cog className="w-5 h-5 text-secondary" />
                    과정
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{showcase.process}</p>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {/* Result */}
          {showcase.result && (
            <ScrollReveal delay={0.3}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    결과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{showcase.result}</p>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {/* Retrospective */}
          {showcase.retrospective && (
            <ScrollReveal delay={0.35}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-warning" />
                    회고
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{showcase.retrospective}</p>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
        </div>

        {/* Sidebar - Contributors */}
        <div className="space-y-6">
          {showcase.showcase_contributors && showcase.showcase_contributors.length > 0 && (
            <ScrollReveal delay={0.2}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    참여자 ({showcase.showcase_contributors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showcase.showcase_contributors.map((contributor: any) => {
                    const roleInfo = getRoleTypeInfo(contributor.role_type);
                    return (
                      <div key={contributor.id} className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contributor.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{contributor.profiles?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {contributor.profiles?.name}
                            </span>
                            {contributor.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            <span className="mr-1">{roleInfo.icon}</span>
                            {roleInfo.name}
                          </Badge>
                          {contributor.role_description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {contributor.role_description}
                            </p>
                          )}
                          {contributor.xp_earned > 0 && (
                            <p className="text-xs text-primary mt-1">
                              +{contributor.xp_earned} XP
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {/* Attachments */}
          {showcase.attachments && showcase.attachments.length > 0 && (
            <ScrollReveal delay={0.3}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    첨부 링크
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {showcase.attachments.map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-primary hover:underline truncate"
                    >
                      {url}
                    </a>
                  ))}
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
        </div>
      </div>

      <BackToTop />
    </div>
  );
}
