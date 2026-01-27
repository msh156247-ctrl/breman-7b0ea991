import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Zap, Briefcase, Image, FolderKanban, Star, Award } from 'lucide-react';
import { LevelBreakdown, getLevelInfo, LEVEL_THRESHOLDS } from '@/hooks/useCalculatedLevel';
import { cn } from '@/lib/utils';

interface LevelBreakdownCardProps {
  breakdown: LevelBreakdown;
  showDetails?: boolean;
  className?: string;
}

export function LevelBreakdownCard({ breakdown, showDetails = true, className }: LevelBreakdownCardProps) {
  const levelInfo = getLevelInfo(breakdown.level);
  const nextLevel = LEVEL_THRESHOLDS.find(t => t.level === breakdown.level + 1);
  
  const progressToNextLevel = nextLevel
    ? ((breakdown.calculatedLevelScore - levelInfo.minScore) / (nextLevel.minScore - levelInfo.minScore)) * 100
    : 100;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            직무 레벨
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  기술 숙련도(60%)와 경험(40%)을 기반으로 자동 계산됩니다.
                  포트폴리오, 프로젝트 기록, 팀 평가, 자격증이 보정 점수로 반영됩니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Level Display */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <span className="text-2xl font-bold">Lv.{breakdown.level}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-lg">{levelInfo.name}</span>
              <Badge variant="secondary" className="text-xs">
                {breakdown.calculatedLevelScore.toFixed(1)}점
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{levelInfo.description}</p>
            {nextLevel && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>다음 레벨까지</span>
                  <span>{(nextLevel.minScore - breakdown.calculatedLevelScore).toFixed(0)}점 필요</span>
                </div>
                <Progress value={progressToNextLevel} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* Score Breakdown */}
        {showDetails && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">점수 구성</h4>
            
            {/* Base Scores */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreItem
                icon={<Zap className="h-4 w-4" />}
                label="기술 점수"
                value={breakdown.skillScore}
                weight="60%"
                color="text-blue-500"
              />
              <ScoreItem
                icon={<Briefcase className="h-4 w-4" />}
                label="경험 점수"
                value={breakdown.experienceScore}
                weight="40%"
                color="text-green-500"
              />
            </div>

            {/* Bonus Scores */}
            <div className="pt-2">
              <h5 className="text-xs font-medium text-muted-foreground mb-2">보정 점수</h5>
              <div className="grid grid-cols-4 gap-2">
                <BonusItem
                  icon={<Image className="h-3 w-3" />}
                  label="포트폴리오"
                  value={breakdown.portfolioBonus}
                />
                <BonusItem
                  icon={<FolderKanban className="h-3 w-3" />}
                  label="프로젝트"
                  value={breakdown.projectBonus}
                />
                <BonusItem
                  icon={<Star className="h-3 w-3" />}
                  label="팀 평가"
                  value={breakdown.teamRatingBonus}
                />
                <BonusItem
                  icon={<Award className="h-3 w-3" />}
                  label="자격증"
                  value={breakdown.certificationBonus}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreItem({ 
  icon, 
  label, 
  value, 
  weight, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  weight: string; 
  color: string; 
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <div className={cn('', color)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Badge variant="outline" className="text-[10px] px-1">
            {weight}
          </Badge>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-semibold">{value.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
    </div>
  );
}

function BonusItem({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
}) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30 text-center">
      <div className="text-muted-foreground mb-1">{icon}</div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">+{value.toFixed(1)}</span>
    </div>
  );
}
