import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Clock, Wallet, Users, Eye, Briefcase, Star } from 'lucide-react';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';
import { RoleTypeBadge } from '@/components/ui/RoleBadge';
import { toast } from 'sonner';

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
  team: {
    id: string;
    name: string;
    emblem_url: string | null;
    leader_id: string;
    rating_avg: number | null;
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

export default function ServiceOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [myTeams, setMyTeams] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchOffers();
    if (user?.id) {
      fetchMyTeams();
    }
  }, [user?.id]);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_service_offers')
        .select(`
          *,
          team:teams!team_id(id, name, emblem_url, leader_id, rating_avg)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers((data || []) as unknown as ServiceOffer[]);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('서비스 오퍼를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeams = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('leader_id', user.id);

      if (error) throw error;
      setMyTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const filteredOffers = offers
    .filter(offer => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !offer.title.toLowerCase().includes(query) &&
          !offer.description?.toLowerCase().includes(query) &&
          !offer.team.name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (categoryFilter !== 'all' && offer.service_category !== categoryFilter) {
        return false;
      }
      if (roleFilter !== 'all' && !offer.offered_roles.includes(roleFilter as RoleType)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'budget':
          return (b.budget_max || 0) - (a.budget_max || 0);
        case 'views':
          return (b.view_count || 0) - (a.view_count || 0);
        case 'rating':
          return (b.team.rating_avg || 0) - (a.team.rating_avg || 0);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const isTeamLeader = myTeams.length > 0;

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            서비스 오퍼
          </h1>
          <p className="text-muted-foreground mt-1">
            팀들이 제공하는 서비스를 둘러보고 문의하세요
          </p>
        </div>
        {isTeamLeader && (
          <Button asChild>
            <Link to="/service-offers/create">
              <Plus className="h-4 w-4 mr-2" />
              서비스 등록
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="서비스, 팀명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {Object.entries(SERVICE_CATEGORIES).map(([key, { name, icon }]) => (
                  <SelectItem key={key} value={key}>
                    {icon} {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="역할" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 역할</SelectItem>
                {Object.entries(ROLE_TYPES).map(([key, { name, icon }]) => (
                  <SelectItem key={key} value={key}>
                    {icon} {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">최신순</SelectItem>
                <SelectItem value="budget">예산순</SelectItem>
                <SelectItem value="views">조회순</SelectItem>
                <SelectItem value="rating">평점순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredOffers.length}개의 서비스 오퍼
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-2">서비스 오퍼가 없습니다</h3>
            <p className="text-muted-foreground">
              {isTeamLeader 
                ? '첫 번째 서비스를 등록해보세요!' 
                : '아직 등록된 서비스가 없습니다.'}
            </p>
            {isTeamLeader && (
              <Button asChild className="mt-4">
                <Link to="/service-offers/create">
                  <Plus className="h-4 w-4 mr-2" />
                  서비스 등록
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => {
            const category = SERVICE_CATEGORIES[offer.service_category as keyof typeof SERVICE_CATEGORIES] || SERVICE_CATEGORIES.general;
            
            return (
              <Link key={offer.id} to={`/service-offers/${offer.id}`}>
                <Card interactive glow className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {category.icon} {category.name}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {offer.view_count}
                      </div>
                    </div>
                    <CardTitle className="text-lg line-clamp-2 mt-2">
                      {offer.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {offer.description || '설명 없음'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Team info */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={offer.team.emblem_url || undefined} />
                        <AvatarFallback>{offer.team.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{offer.team.name}</p>
                        {offer.team.rating_avg && offer.team.rating_avg > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {offer.team.rating_avg.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Offered roles */}
                    {offer.offered_roles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {offer.offered_roles.slice(0, 3).map((role) => (
                          <RoleTypeBadge key={role} roleType={role} size="sm" />
                        ))}
                        {offer.offered_roles.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{offer.offered_roles.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                      <div className="flex items-center gap-1">
                        <Wallet className="h-4 w-4" />
                        <span>{formatBudget(offer.budget_min, offer.budget_max)}</span>
                      </div>
                      {offer.timeline_weeks && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{offer.timeline_weeks}주</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
