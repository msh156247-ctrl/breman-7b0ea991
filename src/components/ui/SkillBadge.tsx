import { SKILL_TIERS, type SkillTier } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SkillBadgeProps {
  name: string;
  tier?: SkillTier;
  level?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkillBadge({ 
  name, 
  tier = 'bronze', 
  level,
  size = 'md',
  className 
}: SkillBadgeProps) {
  const tierData = SKILL_TIERS[tier];
  
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

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        sizeClasses[size],
        tierBgClasses[tier],
        className
      )}
    >
      <span>{name}</span>
      {level !== undefined && <span className="opacity-70">Lv.{level}</span>}
    </span>
  );
}
