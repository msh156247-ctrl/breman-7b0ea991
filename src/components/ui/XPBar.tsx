import { cn } from '@/lib/utils';

interface XPBarProps {
  current: number;
  max: number;
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function XPBar({ 
  current, 
  max, 
  level, 
  size = 'md',
  showLabel = true,
  className 
}: XPBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-sm">
          <span className="font-medium text-foreground">Lv.{level}</span>
          <span className="text-muted-foreground">
            {current.toLocaleString()} / {max.toLocaleString()} XP
          </span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
