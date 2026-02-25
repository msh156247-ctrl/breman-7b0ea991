import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Info, Zap, Briefcase, Image, FolderKanban, Star, Award, 
  ChevronDown, ChevronUp, GraduationCap, Shield, Code2, 
  Users, ClipboardCheck, Clock, Trophy
} from 'lucide-react';
import { LevelBreakdown, getLevelInfo, LEVEL_THRESHOLDS } from '@/hooks/useCalculatedLevel';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface LevelBreakdownCardProps {
  breakdown: LevelBreakdown;
  showDetails?: boolean;
  className?: string;
}

export function LevelBreakdownCard({ breakdown, showDetails = true, className }: LevelBreakdownCardProps) {
  const levelInfo = getLevelInfo(breakdown.level);
  const nextLevel = LEVEL_THRESHOLDS.find(t => t.level === breakdown.level + 1);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  
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

            {/* Evaluation Criteria Collapsible */}
            <Collapsible open={criteriaOpen} onOpenChange={setCriteriaOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full pt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                {criteriaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                평가 기준 상세 보기
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-4">
                <EvaluationCriteriaSection />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EvaluationCriteriaSection() {
  return (
    <div className="space-y-4">
      {/* Individual XP */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <h5 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          개인 경험치 평가 기준
        </h5>
        <p className="text-xs text-muted-foreground">
          본인이 직접 입력하고, 팀 리더의 검증을 거쳐 반영됩니다.
        </p>
        <div className="grid gap-2">
          <CriteriaItem
            icon={<Code2 className="h-3.5 w-3.5" />}
            title="기술 숙련도"
            description="등록된 스킬의 검증된 레벨 평균 (팀 리더 검증)"
            weight="60%"
            impact="high"
          />
          <CriteriaItem
            icon={<FolderKanban className="h-3.5 w-3.5" />}
            title="프로젝트 경험"
            description="완료한 프로젝트 수 (멤버/리더 모두 포함)"
            weight="40%"
            impact="high"
          />
          <CriteriaItem
            icon={<Award className="h-3.5 w-3.5" />}
            title="자격증"
            description="공인 자격증 등록 및 인증 (최대 +15점)"
            weight="보너스"
            impact="medium"
          />
          <CriteriaItem
            icon={<Image className="h-3.5 w-3.5" />}
            title="포트폴리오"
            description="공개된 쇼케이스의 조회수 기반 평가"
            weight="보너스"
            impact="low"
          />
          <CriteriaItem
            icon={<Star className="h-3.5 w-3.5" />}
            title="팀 평가"
            description="프로젝트 완료 후 받은 리뷰 평점 평균"
            weight="보너스"
            impact="medium"
          />
        </div>
      </div>

      {/* Team XP */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <h5 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent-foreground" />
          팀 평가 기준 (리더 평가)
        </h5>
        <p className="text-xs text-muted-foreground">
          프로젝트 마일스톤 달성 및 최종 완료 시 팀 리더가 평가합니다.
        </p>
        <div className="grid gap-2">
          <CriteriaItem
            icon={<Trophy className="h-3.5 w-3.5" />}
            title="기여도"
            description="팀 내에서의 역할 수행 및 기여 정도"
            weight="핵심"
            impact="high"
          />
          <CriteriaItem
            icon={<ClipboardCheck className="h-3.5 w-3.5" />}
            title="산출물 퀄리티"
            description="담당 업무의 결과물 완성도와 품질"
            weight="핵심"
            impact="high"
          />
          <CriteriaItem
            icon={<Clock className="h-3.5 w-3.5" />}
            title="일정 준수"
            description="마일스톤 및 최종 기한 준수 여부"
            weight="핵심"
            impact="high"
          />
        </div>
      </div>

      {/* Level Thresholds */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <h5 className="text-sm font-semibold flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-secondary-foreground" />
          레벨 등급표
        </h5>
        <div className="grid gap-1.5">
          {LEVEL_THRESHOLDS.map((threshold) => (
            <div
              key={threshold.level}
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-background/50"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                  Lv.{threshold.level}
                </Badge>
                <span className="font-medium">{threshold.name}</span>
              </div>
              <span className="text-muted-foreground">
                {threshold.minScore}–{threshold.maxScore}점
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CriteriaItem({
  icon,
  title,
  description,
  weight,
  impact,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  weight: string;
  impact: 'high' | 'medium' | 'low';
}) {
  const impactColors = {
    high: 'bg-primary/10 text-primary border-primary/20',
    medium: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
    low: 'bg-muted/50 text-muted-foreground border-muted',
  };

  return (
    <div className="flex items-start gap-2.5 p-2 rounded-md bg-background/50">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{title}</span>
          <Badge variant="outline" className={cn('text-[9px] px-1 py-0', impactColors[impact])}>
            {weight}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
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
