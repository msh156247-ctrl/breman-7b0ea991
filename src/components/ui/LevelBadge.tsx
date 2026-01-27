import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getLevelInfo } from '@/hooks/useCalculatedLevel';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

const levelColors = {
  1: 'bg-slate-500/10 text-slate-600 border-slate-300',
  2: 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
  3: 'bg-blue-500/10 text-blue-600 border-blue-300',
  4: 'bg-purple-500/10 text-purple-600 border-purple-300',
  5: 'bg-amber-500/10 text-amber-600 border-amber-300',
};

export function LevelBadge({ 
  level, 
  score, 
  showScore = false, 
  size = 'md',
  className 
}: LevelBadgeProps) {
  const levelInfo = getLevelInfo(level);
  const colorClass = levelColors[level as keyof typeof levelColors] || levelColors[1];

  const badgeContent = (
    <Badge 
      variant="outline" 
      className={cn(
        'font-semibold border',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      Lv.{level} {levelInfo.name}
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-70">({score.toFixed(0)}점)</span>
      )}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{levelInfo.name}</p>
          <p className="text-xs text-muted-foreground">{levelInfo.description}</p>
          {score !== undefined && (
            <p className="text-xs mt-1">
              점수: {score.toFixed(1)} / 100
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
