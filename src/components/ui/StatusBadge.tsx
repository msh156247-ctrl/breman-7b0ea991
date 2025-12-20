import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'primary' | 'secondary' | 'muted' | 'destructive' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ 
  status, 
  variant = 'primary',
  size = 'md',
  className 
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  const variantClasses = {
    success: 'bg-success/10 text-success border-success/30',
    primary: 'bg-primary/10 text-primary border-primary/30',
    secondary: 'bg-secondary/10 text-secondary border-secondary/30',
    muted: 'bg-muted text-muted-foreground border-border',
    destructive: 'bg-destructive/10 text-destructive border-destructive/30',
    warning: 'bg-secondary/10 text-secondary border-secondary/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
