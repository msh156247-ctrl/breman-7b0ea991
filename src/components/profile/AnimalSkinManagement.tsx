import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Info } from 'lucide-react';
import { ANIMAL_SKINS, type AnimalSkin } from '@/lib/constants';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AnimalSkinManagementProps {
  onSkinChange?: (skin: AnimalSkin) => void;
  showHeader?: boolean;
}

export function AnimalSkinManagement({ onSkinChange, showHeader = true }: AnimalSkinManagementProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [selectedSkin, setSelectedSkin] = useState<AnimalSkin | null>(
    (profile?.animal_skin as AnimalSkin) || null
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = async (skin: AnimalSkin) => {
    if (!user) return;
    
    setSelectedSkin(skin);
    
    if (onSkinChange) {
      onSkinChange(skin);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ animal_skin: skin, primary_role: skin })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('성향이 변경되었습니다!');
    } catch (error) {
      console.error('Error updating animal skin:', error);
      toast.error('성향 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            성향 (브레맨 캐릭터)
          </CardTitle>
          <CardDescription>
            협업 스타일과 성격을 나타내는 브레맨 캐릭터를 선택하세요. 팀 모집 및 매칭에 활용됩니다.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={showHeader ? '' : 'pt-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(ANIMAL_SKINS) as [AnimalSkin, typeof ANIMAL_SKINS[AnimalSkin]][]).map(([key, skin]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={isSaving}
              className={`p-5 rounded-xl border-2 transition-all text-left relative ${
                selectedSkin === key
                  ? 'border-primary bg-primary/5 shadow-glow'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              {/* Selection indicator */}
              {selectedSkin === key && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${skin.gradient} flex items-center justify-center text-3xl flex-shrink-0`}>
                  {skin.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg">{skin.name}</div>
                  <div className="text-xs text-primary font-medium">{skin.title}</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-3">{skin.description}</p>

              {/* Keywords */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {skin.keywords.map((keyword) => (
                  <span 
                    key={keyword}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedSkin === key 
                        ? `bg-gradient-to-r ${skin.gradient} text-primary-foreground`
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                      <Info className="w-3 h-3" />
                      주요 지표: {skin.metrics.join(', ')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">이 성향의 핵심 평가 지표입니다</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
