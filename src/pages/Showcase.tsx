import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Sparkles, 
  Users, 
  User, 
  Calendar,
  Eye,
  Filter,
  Search,
  Folder,
  Target,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SHOWCASE_STATUS, ROLE_TYPES, type RoleType } from '@/lib/constants';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Showcase() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch showcases
  const { data: showcases, isLoading } = useQuery({
    queryKey: ['showcases', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('showcases')
        .select(`
          *,
          owner_user:profiles!showcases_owner_user_id_fkey(id, name, avatar_url),
          owner_team:teams!showcases_owner_team_id_fkey(id, name, emblem_url),
          showcase_contributors(
            id,
            user_id,
            role_type,
            profiles:profiles!showcase_contributors_user_id_fkey(name, avatar_url)
          ),
          showcase_skills(
            skill_id,
            skills:skills!showcase_skills_skill_id_fkey(name, category)
          )
        `)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (activeTab === 'personal') {
        query = query.not('owner_user_id', 'is', null);
      } else if (activeTab === 'team') {
        query = query.not('owner_team_id', 'is', null);
      } else if (activeTab === 'my') {
        query = query.or(`owner_user_id.eq.${user?.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's tracks
  const { data: tracks } = useQuery({
    queryKey: ['tracks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          track_showcases(
            showcase_id,
            showcases(id, title, status)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredShowcases = showcases?.filter(showcase =>
    showcase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    showcase.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleTypeInfo = (roleType: string) => {
    return ROLE_TYPES[roleType as RoleType] || { name: roleType, icon: '👤', color: 'from-gray-500 to-gray-400' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Showcase
            </h1>
            <p className="text-muted-foreground mt-1">
              무엇을 해봤는가를 증명하는 협업 기록 플랫폼
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/showcase/create">
              <Plus className="w-4 h-4" />
              새 Showcase
            </Link>
          </Button>
        </div>
      </ScrollReveal>

      {/* My Tracks Section */}
      {tracks && tracks.length > 0 && (
        <ScrollReveal delay={0.1}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                내 성장 Track
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex-shrink-0 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors min-w-[200px]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm truncate">{track.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {track.track_showcases?.length || 0}개 Showcase
                      </Badge>
                      <Badge variant={track.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {track.status === 'active' ? '진행중' : track.status === 'completed' ? '완료' : '일시중지'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Search and Filter */}
      <ScrollReveal delay={0.2}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Showcase 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="personal">개인</TabsTrigger>
              <TabsTrigger value="team">팀</TabsTrigger>
              {user && <TabsTrigger value="my">내 작업</TabsTrigger>}
            </TabsList>
          </Tabs>
        </div>
      </ScrollReveal>

      {/* Showcase Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-t-lg" />
              <CardContent className="pt-4 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredShowcases && filteredShowcases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShowcases.map((showcase, index) => (
            <ScrollReveal key={showcase.id} delay={index * 0.05}>
              <Link to={`/showcase/${showcase.id}`}>
                <Card interactive className="h-full overflow-hidden group">
                  {/* Cover Image */}
                  {showcase.cover_image_url ? (
                    <div className="h-40 overflow-hidden">
                      <img 
                        src={showcase.cover_image_url} 
                        alt={showcase.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-primary/30" />
                    </div>
                  )}

                  <CardContent className="pt-4 space-y-3">
                    {/* Owner Info */}
                    <div className="flex items-center gap-2">
                      {showcase.owner_team ? (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={showcase.owner_team.emblem_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {showcase.owner_team.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {showcase.owner_team.name}
                          </span>
                        </>
                      ) : showcase.owner_user ? (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={showcase.owner_user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {showcase.owner_user.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {showcase.owner_user.name}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {showcase.title}
                    </h3>

                    {/* Description */}
                    {showcase.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {showcase.description}
                      </p>
                    )}

                    {/* Skills */}
                    {showcase.showcase_skills && showcase.showcase_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {showcase.showcase_skills.slice(0, 3).map((ss: any) => (
                          <Badge key={ss.skill_id} variant="secondary" className="text-xs">
                            {ss.skills?.name}
                          </Badge>
                        ))}
                        {showcase.showcase_skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{showcase.showcase_skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Contributors Preview */}
                    {showcase.showcase_contributors && showcase.showcase_contributors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {showcase.showcase_contributors.slice(0, 4).map((contributor: any) => (
                            <Avatar key={contributor.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={contributor.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {contributor.profiles?.name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {showcase.showcase_contributors.length}명 참여
                        </span>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {showcase.ended_at 
                          ? format(new Date(showcase.ended_at), 'yyyy.MM', { locale: ko })
                          : format(new Date(showcase.created_at), 'yyyy.MM', { locale: ko })
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {showcase.view_count || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <ScrollReveal delay={0.2}>
          <Card className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">아직 등록된 Showcase가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 Showcase를 등록하고 경험을 증명해보세요!
            </p>
            <Button asChild>
              <Link to="/showcase/create">
                <Plus className="w-4 h-4 mr-2" />
                새 Showcase 등록
              </Link>
            </Button>
          </Card>
        </ScrollReveal>
      )}

      <BackToTop />
    </div>
  );
}
