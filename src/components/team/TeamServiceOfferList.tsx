import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Wallet, Eye, Plus, Briefcase } from 'lucide-react';
import { RoleTypeBadge } from '@/components/ui/RoleBadge';
import { type RoleType } from '@/lib/constants';

interface ServiceOffer {
  id: string;
  title: string;
  description: string | null;
  service_category: string;
  budget_min: number | null;
  budget_max: number | null;
  timeline_weeks: number | null;
  offered_roles: RoleType[];
  status: string;
  view_count: number;
  created_at: string;
}

const SERVICE_CATEGORIES: Record<string, { name: string; icon: string }> = {
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

interface TeamServiceOfferListProps {
  teamId: string;
  isLeader: boolean;
}

export function TeamServiceOfferList({ teamId, isLeader }: TeamServiceOfferListProps) {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, [teamId]);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_service_offers')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers((data || []) as unknown as ServiceOffer[]);
    } catch (error) {
      console.error('Error fetching service offers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-8 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">등록된 서비스 오퍼가 없습니다</p>
          {isLeader && (
            <Button asChild>
              <Link to="/service-offers/create">
                <Plus className="h-4 w-4 mr-2" />
                서비스 등록하기
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isLeader && (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link to="/service-offers/create">
              <Plus className="h-4 w-4 mr-2" />
              서비스 등록
            </Link>
          </Button>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {offers.map((offer) => {
          const category = SERVICE_CATEGORIES[offer.service_category] || SERVICE_CATEGORIES.general;
          
          return (
            <Link key={offer.id} to={`/service-offers/${offer.id}`}>
              <Card interactive glow className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {category.icon} {category.name}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {offer.status !== 'active' && (
                        <Badge variant="secondary" className="text-xs">
                          비활성
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {offer.view_count}
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-lg line-clamp-2 mt-2">
                    {offer.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {offer.description || '설명 없음'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Offered roles */}
                  {offer.offered_roles && offer.offered_roles.length > 0 && (
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
    </div>
  );
}
