export const METRIC_DESCRIPTIONS: Record<string, { calculation: string; tracking: string }> = {
  '프로젝트 성공률': {
    calculation: '완료된 프로젝트 수 / 전체 참여 프로젝트 수 × 100',
    tracking: '프로젝트 완료 시 자동 업데이트, 클라이언트 승인 기준'
  },
  '팀 완주율': {
    calculation: '끝까지 함께한 팀 수 / 전체 팀 참여 수 × 100',
    tracking: '팀 해산 또는 프로젝트 완료 시 측정'
  },
  '버그 감소율': {
    calculation: '(이전 릴리즈 버그 - 현재 릴리즈 버그) / 이전 릴리즈 버그 × 100',
    tracking: 'QA 리포트 기반, 릴리즈 주기별 집계'
  },
  '무사고 릴리즈': {
    calculation: '크리티컬 이슈 없이 배포 성공한 릴리즈 수',
    tracking: '배포 후 24시간 내 핫픽스 발생 여부로 판단'
  },
  '사용성 점수': {
    calculation: 'SUS(System Usability Scale) 평균 점수',
    tracking: '사용자 테스트 및 설문조사 결과 집계'
  },
  '사용자 만족도': {
    calculation: '리뷰 평점 합계 / 총 리뷰 수',
    tracking: '프로젝트 완료 후 클라이언트 피드백 기반'
  },
  'UI 완성도': {
    calculation: '디자인 시안 대비 구현 일치율',
    tracking: '디자이너 QA 검수 시 피드백 반영률'
  },
  '퍼포먼스 지표': {
    calculation: 'Core Web Vitals (LCP, FID, CLS) 평균 점수',
    tracking: 'Lighthouse 리포트 자동 측정, 배포 시 기록'
  }
};

export const ROLES = {
  horse: { 
    name: '말', 
    nameEn: 'Horse',
    icon: '🐴', 
    title: 'Leader / Backend',
    description: '팀의 방향과 기반을 책임지는 리더',
    responsibilities: [
      '팀 목표 설정 및 일정 관리',
      '시스템 아키텍처 설계',
      '백엔드 개발, API·DB 관리',
      '의사결정 및 최종 책임'
    ],
    keywords: ['리더십', '안정성', '구조 설계'],
    metrics: ['프로젝트 성공률', '팀 완주율'],
    color: 'role-horse',
    gradient: 'from-primary to-accent'
  },
  dog: { 
    name: '개', 
    nameEn: 'Dog',
    icon: '🐕', 
    title: 'QA / Security',
    description: '품질과 신뢰를 지키는 수호자',
    responsibilities: [
      '기능 테스트 및 버그 검증',
      '보안 점검, 취약점 리포트',
      '릴리즈 전 품질 체크',
      '안정성 기준 수립'
    ],
    keywords: ['신뢰', '책임감', '디테일'],
    metrics: ['버그 감소율', '무사고 릴리즈'],
    color: 'role-dog',
    gradient: 'from-success to-emerald-400'
  },
  cat: { 
    name: '고양이', 
    nameEn: 'Cat',
    icon: '🐱', 
    title: 'Design / UX',
    description: '사용자 경험과 감성을 만드는 설계자',
    responsibilities: [
      'UI·UX 디자인',
      '사용자 플로우 설계',
      '브랜드·비주얼 아이덴티티',
      '프로토타입 제작'
    ],
    keywords: ['창의성', '직관', '감성'],
    metrics: ['사용성 점수', '사용자 만족도'],
    color: 'role-cat',
    gradient: 'from-pink-500 to-rose-400'
  },
  rooster: { 
    name: '닭', 
    nameEn: 'Rooster',
    icon: '🐓', 
    title: 'Frontend',
    description: '사용자와 만나는 최전선',
    responsibilities: [
      '프론트엔드 개발',
      '인터랙션·애니메이션 구현',
      '성능 최적화',
      '디자인을 코드로 구현'
    ],
    keywords: ['표현력', '속도', '완성도'],
    metrics: ['UI 완성도', '퍼포먼스 지표'],
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

// PRD: Main navigation with Siege, Ranking, Notifications as core items
export const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: 'LayoutDashboard' },
  { href: '/teams', label: '팀', icon: 'Users' },
  { href: '/projects', label: '프로젝트', icon: 'Briefcase' },
  { href: '/chat', label: '채팅', icon: 'MessageSquare' },
  { href: '/siege', label: 'Siege', icon: 'Swords' },
  { href: '/rankings', label: '랭킹', icon: 'Trophy' },
  { href: '/notifications', label: '알림', icon: 'Bell' },
] as const;

// PRD: Contract status for project management
export const CONTRACT_STATUS = {
  draft: { name: '초안', color: 'muted' },
  active: { name: '진행중', color: 'success' },
  completed: { name: '완료', color: 'primary' },
  disputed: { name: '분쟁중', color: 'destructive' },
  cancelled: { name: '취소됨', color: 'muted' },
} as const;

// PRD: Milestone status for project tracking
export const MILESTONE_STATUS = {
  pending: { name: '대기', color: 'muted' },
  in_progress: { name: '진행중', color: 'secondary' },
  review: { name: '검토중', color: 'primary' },
  approved: { name: '승인', color: 'success' },
  rejected: { name: '거절', color: 'destructive' },
  dispute: { name: '분쟁', color: 'destructive' },
} as const;

// PRD: Escrow status for payment management
export const ESCROW_STATUS = {
  not_funded: { name: '미입금', color: 'muted' },
  funded: { name: '입금완료', color: 'success' },
  on_hold: { name: '보류', color: 'secondary' },
  released: { name: '지급완료', color: 'primary' },
  refunded: { name: '환불', color: 'destructive' },
} as const;

// PRD: Dispute status for conflict resolution
export const DISPUTE_STATUS = {
  open: { name: '접수', color: 'destructive' },
  investigating: { name: '조사중', color: 'secondary' },
  resolved: { name: '해결', color: 'success' },
  closed: { name: '종료', color: 'muted' },
} as const;

export type UserRole = keyof typeof ROLES;
export type SkillTier = keyof typeof SKILL_TIERS;
