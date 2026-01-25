import { ROLES, ROLE_TYPES, type UserRole, type RoleType } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: UserRole;
  level?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showName?: boolean;
  className?: string;
}

export function RoleBadge({ 
  role, 
  level, 
  size = 'md', 
  showIcon = true,
  showName = true,
  className 
}: RoleBadgeProps) {
  const roleData = ROLES[role];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'bg-gradient-to-r',
        roleData.gradient,
        'text-primary-foreground shadow-sm',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <span className={iconSizes[size]}>{roleData.icon}</span>}
      {showName && <span>{roleData.name}</span>}
      {level !== undefined && (
        <span className="font-bold">Lv.{level}</span>
      )}
    </span>
  );
}

// RoleType badge (for professional roles like backend, frontend, etc.)
interface RoleTypeBadgeProps {
  roleType: RoleType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showName?: boolean;
  className?: string;
}

export function RoleTypeBadge({ 
  roleType, 
  size = 'md', 
  showIcon = true,
  showName = true,
  className 
}: RoleTypeBadgeProps) {
  const roleTypeData = ROLE_TYPES[roleType];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'border bg-background',
        sizeClasses[size],
        className
      )}
      style={{ borderColor: roleTypeData.color, color: roleTypeData.color }}
    >
      {showIcon && <span className={iconSizes[size]}>{roleTypeData.icon}</span>}
      {showName && <span>{roleTypeData.name}</span>}
    </span>
  );
}
