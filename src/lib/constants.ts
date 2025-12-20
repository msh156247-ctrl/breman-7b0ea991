export const ROLES = {
  horse: { 
    name: '말', 
    nameEn: 'Horse',
    icon: '🐴', 
    description: '리더 / 백엔드',
    color: 'role-horse',
    gradient: 'from-primary to-accent'
  },
  dog: { 
    name: '개', 
    nameEn: 'Dog',
    icon: '🐕', 
    description: 'QA / 보안',
    color: 'role-dog',
    gradient: 'from-success to-emerald-400'
  },
  cat: { 
    name: '고양이', 
    nameEn: 'Cat',
    icon: '🐱', 
    description: '디자인',
    color: 'role-cat',
    gradient: 'from-pink-500 to-rose-400'
  },
  rooster: { 
    name: '닭', 
    nameEn: 'Rooster',
    icon: '🐓', 
    description: '프론트엔드',
    color: 'role-rooster',
    gradient: 'from-secondary to-amber-400'
  },
} as const;

export const SKILL_TIERS = {
  bronze: { name: '브론즈', color: 'tier-bronze', icon: '🥉' },
  silver: { name: '실버', color: 'tier-silver', icon: '🥈' },
  gold: { name: '골드', color: 'tier-gold', icon: '🥇' },
  platinum: { name: '플래티넘', color: 'tier-platinum', icon: '💎' },
  diamond: { name: '다이아몬드', color: 'tier-diamond', icon: '💠' },
} as const;

export const PROJECT_STATUS = {
  open: { name: '모집중', color: 'success' },
  matched: { name: '매칭완료', color: 'primary' },
  in_progress: { name: '진행중', color: 'secondary' },
  completed: { name: '완료', color: 'muted' },
  cancelled: { name: '취소됨', color: 'destructive' },
} as const;

export const SIEGE_STATUS = {
  registering: { name: '등록중', color: 'success' },
  ongoing: { name: '진행중', color: 'secondary' },
  ended: { name: '종료', color: 'muted' },
  results: { name: '결과발표', color: 'primary' },
} as const;

export const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: 'LayoutDashboard' },
  { href: '/teams', label: '팀', icon: 'Users' },
  { href: '/projects', label: '프로젝트', icon: 'Briefcase' },
  { href: '/siege', label: 'Siege', icon: 'Swords' },
  { href: '/rankings', label: '랭킹', icon: 'Trophy' },
] as const;

export type UserRole = keyof typeof ROLES;
export type SkillTier = keyof typeof SKILL_TIERS;
