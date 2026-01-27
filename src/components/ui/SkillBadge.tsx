import { SKILL_TIERS, type SkillTier } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock } from 'lucide-react';

interface SkillBadgeProps {
  name: string;
  tier?: SkillTier;
  level?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isVerified?: boolean;
  yearsOfExperience?: number;
  skillType?: 'language' | 'framework' | 'tool' | 'library' | 'methodology';
}

export function SkillBadge({ 
  name, 
  tier = 'bronze', 
  level,
  size = 'md',
  className,
  isVerified,
  yearsOfExperience,
  skillType,
}: SkillBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const tierBgClasses = {
    bronze: 'bg-tier-bronze/10 text-tier-bronze border-tier-bronze/30',
    silver: 'bg-tier-silver/10 text-tier-silver border-tier-silver/30',
    gold: 'bg-tier-gold/10 text-tier-gold border-tier-gold/30',
    platinum: 'bg-tier-platinum/10 text-tier-platinum border-tier-platinum/30',
    diamond: 'bg-tier-diamond/10 text-tier-diamond border-tier-diamond/30',
  };

  const skillTypeIcons = {
    language: '📝',
    framework: '🏗️',
    tool: '🔧',
    library: '📚',
    methodology: '📋',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        sizeClasses[size],
        isVerified ? tierBgClasses[tier] : 'bg-muted/50 text-muted-foreground border-muted',
        className
      )}
    >
      {skillType && <span className="text-xs">{skillTypeIcons[skillType]}</span>}
      <span>{name}</span>
      {level !== undefined && level > 0 && (
        <span className="opacity-70">Lv.{level}</span>
      )}
      {yearsOfExperience !== undefined && yearsOfExperience > 0 && (
        <span className="opacity-60 text-[0.7em]">{yearsOfExperience}년</span>
      )}
      {isVerified !== undefined && (
        isVerified ? (
          <CheckCircle2 className="w-3 h-3 text-success" />
        ) : (
          <Clock className="w-3 h-3 text-muted-foreground" />
        )
      )}
    </span>
  );
}
