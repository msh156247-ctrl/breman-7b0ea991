import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Search, Route, Eye, Trash2, Edit, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { ROLE_TYPES, TRACK_STATUS } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Tracks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tracks, isLoading } = useQuery({
    queryKey: ['tracks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          track_showcases (
            id,
            showcase:showcases (
              id,
              title,
              status
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success('Track이 삭제되었습니다');
    },
    onError: () => {
      toast.error('삭제에 실패했습니다');
    },
  });

  const filteredTracks = tracks?.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleTypeInfo = (roleType: string) => {
    return ROLE_TYPES[roleType as keyof typeof ROLE_TYPES] || { name: roleType, color: 'bg-muted' };
  };

  const getStatusInfo = (status: string) => {
    return TRACK_STATUS[status as keyof typeof TRACK_STATUS] || { name: status, color: 'bg-muted' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              나의 성장 경로
            </h1>
            <p className="text-muted-foreground mt-1">
              Showcase를 연결하여 성장 여정을 기록하세요
            </p>
          </div>
          <Link to="/tracks/create">
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              새 Track 만들기
            </Button>
          </Link>
        </div>
      </ScrollReveal>

      {/* Search */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Track 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </ScrollReveal>

      {/* Tracks Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTracks && filteredTracks.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTracks.map((track, index) => {
            const roleTypeInfo = track.target_role_type ? getRoleTypeInfo(track.target_role_type) : null;
            const statusInfo = getStatusInfo(track.status);
            const showcaseCount = track.track_showcases?.length || 0;

            return (
              <ScrollReveal key={track.id} animation="fade-up" delay={index * 50}>
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Route className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg line-clamp-1">{track.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={statusInfo.color}>
                              {statusInfo.name}
                            </Badge>
                            {roleTypeInfo && (
                              <Badge variant="secondary" className="text-xs">
                                {roleTypeInfo.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/tracks/${track.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              보기
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/tracks/${track.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              수정
                            </Link>
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Track 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  이 Track을 삭제하시겠습니까? 연결된 Showcase 정보도 함께 삭제됩니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(track.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {track.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {track.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>Showcase {showcaseCount}개</span>
                      </div>
                      <span>
                        {format(new Date(track.created_at), 'yyyy.MM.dd', { locale: ko })}
                      </span>
                    </div>

                    <Link to={`/tracks/${track.id}`} className="mt-4 block">
                      <Button variant="outline" className="w-full">
                        자세히 보기
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </ScrollReveal>
            );
          })}
        </div>
      ) : (
        <ScrollReveal animation="fade-up" delay={100}>
          <Card className="py-12">
            <CardContent className="text-center">
              <Route className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">아직 Track이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                성장 경로를 만들고 Showcase를 연결해보세요
              </p>
              <Link to="/tracks/create">
                <Button className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  첫 Track 만들기
                </Button>
              </Link>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      <BackToTop />
    </div>
  );
}
