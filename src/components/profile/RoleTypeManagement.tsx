import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Briefcase, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ROLE_TYPES, RoleType } from '@/lib/constants';
import { Database } from '@/integrations/supabase/types';

type DbRoleType = Database['public']['Enums']['role_type'];

export function RoleTypeManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMain, setSelectedMain] = useState<RoleType | null>(null);
  const [selectedSubs, setSelectedSubs] = useState<RoleType[]>([]);

  // Fetch current profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('main_role_type, sub_role_types')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Initialize edit state when starting to edit
  const startEditing = () => {
    setSelectedMain(profile?.main_role_type as RoleType || null);
    setSelectedSubs((profile?.sub_role_types as RoleType[]) || []);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSelectedMain(null);
    setSelectedSubs([]);
  };

  // Update mutation
  const updateRolesMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('로그인이 필요합니다');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          main_role_type: selectedMain as DbRoleType,
          sub_role_types: selectedSubs as DbRoleType[],
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-roles'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('직무가 업데이트되었습니다');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('직무 업데이트 실패: ' + error.message);
    },
  });

  const toggleSubRole = (role: RoleType) => {
    if (role === selectedMain) return; // Can't select main as sub
    
    setSelectedSubs(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const selectMainRole = (role: RoleType) => {
    setSelectedMain(role);
    // Remove from subs if it was selected there
    setSelectedSubs(prev => prev.filter(r => r !== role));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const roleTypes = Object.entries(ROLE_TYPES) as [RoleType, typeof ROLE_TYPES[RoleType]][];
  const mainRoleType = profile?.main_role_type as RoleType | null;
  const subRoleTypes = (profile?.sub_role_types as RoleType[]) || [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              직무 설정
            </CardTitle>
            <CardDescription className="mt-1">
              메인 직무 1개와 서브 직무 여러 개를 선택할 수 있습니다
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              수정
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
              >
                <X className="w-4 h-4 mr-1" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={() => updateRolesMutation.mutate()}
                disabled={!selectedMain || updateRolesMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                저장
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing ? (
          <>
            {/* Main Role Selection */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">메인</span>
                메인 직무 선택
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {roleTypes.map(([key, role]) => (
                  <button
                    key={key}
                    onClick={() => selectMainRole(key)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedMain === key
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/30 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{role.icon}</span>
                      <span className="font-medium text-sm">{role.name}</span>
                    </div>
                    {selectedMain === key && (
                      <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub Roles Selection */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded-full">서브</span>
                서브 직무 선택 (여러 개 가능)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {roleTypes.map(([key, role]) => {
                  const isMain = selectedMain === key;
                  const isSub = selectedSubs.includes(key);
                  
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSubRole(key)}
                      disabled={isMain}
                      className={`p-3 rounded-lg border text-left transition-all relative ${
                        isMain
                          ? 'border-muted bg-muted/30 opacity-50 cursor-not-allowed'
                          : isSub
                          ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/20'
                          : 'border-border hover:border-secondary/30 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{role.icon}</span>
                        <span className="font-medium text-sm">{role.name}</span>
                      </div>
                      {isSub && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      {isMain && (
                        <span className="text-xs text-muted-foreground">메인</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                선택된 서브 직무: {selectedSubs.length}개
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Display Mode */}
            {!mainRoleType && subRoleTypes.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">아직 직무가 설정되지 않았습니다</p>
                <Button onClick={startEditing}>
                  <Plus className="w-4 h-4 mr-2" />
                  직무 설정하기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main Role Display */}
                {mainRoleType && ROLE_TYPES[mainRoleType] && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">메인</span>
                      메인 직무
                    </h4>
                    <div className={`p-4 rounded-lg border-2 border-primary/30 bg-gradient-to-r ${ROLE_TYPES[mainRoleType].color} bg-opacity-10`}>
                      <div className="flex items-center gap-3 bg-background/80 rounded-lg p-3">
                        <span className="text-2xl">{ROLE_TYPES[mainRoleType].icon}</span>
                        <div>
                          <p className="font-medium">{ROLE_TYPES[mainRoleType].name}</p>
                          <p className="text-sm text-muted-foreground">{ROLE_TYPES[mainRoleType].description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Roles Display */}
                {subRoleTypes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded-full">서브</span>
                      서브 직무 ({subRoleTypes.length}개)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {subRoleTypes.map((roleKey) => {
                        const role = ROLE_TYPES[roleKey];
                        if (!role) return null;
                        return (
                          <Badge 
                            key={roleKey} 
                            variant="secondary"
                            className="px-3 py-1.5 text-sm"
                          >
                            <span className="mr-1.5">{role.icon}</span>
                            {role.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
