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

// 동물 스킨 (Animal Skins) - 성향/아이덴티티 표현, 추후 추가 가능
export const ANIMAL_SKINS = {
  horse: { 
    name: '말', 
    nameEn: 'Horse',
    icon: '🐴', 
    title: '리드 / 추진',
    description: '팀을 이끌고 목표를 향해 달리는 리더형. 결단력과 추진력이 강점입니다.',
    keywords: ['리더십', '추진력', '결단력'],
    metrics: ['프로젝트 성공률', '팀 완주율'],
    color: 'role-horse',
    gradient: 'from-primary to-accent'
  },
  dog: { 
    name: '개', 
    nameEn: 'Dog',
    icon: '🐕', 
    title: '품질 / 리스크',
    description: '세부사항을 놓치지 않는 신뢰형. 품질 관리와 리스크 예방의 전문가입니다.',
    keywords: ['신뢰', '책임감', '디테일'],
    metrics: ['버그 감소율', '무사고 릴리즈'],
    color: 'role-dog',
    gradient: 'from-success to-emerald-400'
  },
  cat: { 
    name: '고양이', 
    nameEn: 'Cat',
    icon: '🐱', 
    title: '설계 / 창의',
    description: '독창적인 아이디어로 문제를 해결하는 창의형. 설계와 혁신의 핵심입니다.',
    keywords: ['창의성', '직관', '혁신'],
    metrics: ['사용성 점수', '사용자 만족도'],
    color: 'role-cat',
    gradient: 'from-pink-500 to-rose-400'
  },
  rooster: { 
    name: '닭', 
    nameEn: 'Rooster',
    icon: '🐓', 
    title: '실행 / 속도',
    description: '빠른 실행력으로 결과를 만들어내는 실행형. 속도와 효율성의 달인입니다.',
    keywords: ['실행력', '속도', '효율성'],
    metrics: ['UI 완성도', '퍼포먼스 지표'],
    color: 'role-rooster',
    gradient: 'from-secondary to-amber-400'
  },
} as const;

// 기존 ROLES는 ANIMAL_SKINS의 별칭으로 유지 (하위 호환성)
export const ROLES = ANIMAL_SKINS;

// 직무 타입 (Role Types) - 전문 직무, 메인 1개 + 서브 여러 개 선택 가능
export const ROLE_TYPES = {
  backend: { 
    name: '백엔드', 
    nameEn: 'Backend',
    icon: '⚙️', 
    description: 'API, 서버, 데이터베이스 설계 및 개발',
    color: 'from-green-500 to-emerald-400'
  },
  frontend: { 
    name: '프론트엔드', 
    nameEn: 'Frontend',
    icon: '🎨', 
    description: 'UI 개발 및 사용자 인터페이스 구현',
    color: 'from-blue-500 to-cyan-400'
  },
  design: { 
    name: '디자인', 
    nameEn: 'Design',
    icon: '✨', 
    description: 'UI/UX 디자인, 브랜딩, 시각 디자인',
    color: 'from-pink-500 to-rose-400'
  },
  pm: { 
    name: 'PM', 
    nameEn: 'PM',
    icon: '📋', 
    description: '프로젝트 관리 및 일정/리소스 조율',
    color: 'from-purple-500 to-violet-400'
  },
  data: { 
    name: '데이터', 
    nameEn: 'Data',
    icon: '📊', 
    description: '데이터 분석, AI/ML, 데이터 엔지니어링',
    color: 'from-indigo-500 to-blue-400'
  },
  qa: { 
    name: 'QA', 
    nameEn: 'QA',
    icon: '🔍', 
    description: '품질 관리 및 테스트 자동화',
    color: 'from-orange-500 to-amber-400'
  },
  devops: { 
    name: 'DevOps', 
    nameEn: 'DevOps',
    icon: '🔧', 
    description: 'CI/CD, 인프라, 클라우드 관리',
    color: 'from-teal-500 to-cyan-400'
  },
  marketing: { 
    name: '마케팅', 
    nameEn: 'Marketing',
    icon: '📢', 
    description: '그로스 해킹, 콘텐츠 마케팅, 브랜드 전략',
    color: 'from-red-500 to-rose-400'
  },
  mobile: { 
    name: '모바일', 
    nameEn: 'Mobile',
    icon: '📱', 
    description: 'iOS, Android, React Native 앱 개발',
    color: 'from-cyan-500 to-blue-400'
  },
  security: { 
    name: '보안', 
    nameEn: 'Security',
    icon: '🛡️', 
    description: '보안 설계, 취약점 분석, 인증/인가',
    color: 'from-slate-500 to-gray-400'
  },
} as const;

// 기술(Skill) 카테고리 - 전문 분야, 여러 개 등록 가능 (레벨과 함께)
export const SKILL_CATEGORIES = {
  frontend: { name: '프론트엔드', icon: '🎨', color: 'from-blue-500 to-cyan-400' },
  backend: { name: '백엔드', icon: '⚙️', color: 'from-green-500 to-emerald-400' },
  design: { name: '디자인', icon: '✨', color: 'from-pink-500 to-rose-400' },
  devops: { name: 'DevOps', icon: '🔧', color: 'from-orange-500 to-amber-400' },
  qa: { name: 'QA/테스트', icon: '🔍', color: 'from-purple-500 to-violet-400' },
  security: { name: '보안', icon: '🛡️', color: 'from-red-500 to-rose-400' },
  data: { name: '데이터', icon: '📊', color: 'from-indigo-500 to-blue-400' },
  mobile: { name: '모바일', icon: '📱', color: 'from-teal-500 to-cyan-400' },
} as const;

// 직무(Role Type)와 스킬 카테고리 매핑
export const ROLE_TYPE_TO_SKILL_CATEGORIES: Record<RoleType, string[]> = {
  backend: ['backend'],
  frontend: ['frontend'],
  design: ['design'],
  pm: ['frontend', 'backend', 'design', 'data'], // PM은 전반적 이해 필요
  data: ['data', 'backend'],
  qa: ['qa', 'frontend', 'backend'],
  devops: ['devops', 'backend', 'security'],
  marketing: ['design', 'data'],
  mobile: ['mobile', 'frontend'],
  security: ['security', 'backend', 'devops'],
};

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

// Showcase 상태 (경쟁 대신 협업/기록 중심)
export const SHOWCASE_STATUS = {
  draft: { name: '작성중', color: 'muted' },
  published: { name: '공개', color: 'success' },
  archived: { name: '보관됨', color: 'secondary' },
} as const;

// Showcase 가시성
export const SHOWCASE_VISIBILITY = {
  public: { name: '전체공개', color: 'success' },
  team_only: { name: '팀원만', color: 'secondary' },
  private: { name: '나만보기', color: 'muted' },
} as const;

// Track 상태 (성장 경로)
export const TRACK_STATUS = {
  active: { name: '진행중', color: 'success' },
  completed: { name: '완료', color: 'primary' },
  paused: { name: '일시중지', color: 'muted' },
} as const;

// Main navigation - Showcase 중심으로 변경 (랭킹/경쟁 요소 제거)
export const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: 'LayoutDashboard' },
  { href: '/teams', label: '팀', icon: 'Users' },
  { href: '/projects', label: '프로젝트', icon: 'Briefcase' },
  { href: '/showcase', label: 'Showcase', icon: 'Sparkles' },
  { href: '/tracks', label: 'Tracks', icon: 'Route' },
  { href: '/chat', label: '채팅', icon: 'MessageSquare' },
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

// 지원 상태
export const APPLICATION_STATUS = {
  pending: { name: '검토중', color: 'secondary' },
  accepted: { name: '수락됨', color: 'success' },
  rejected: { name: '거절됨', color: 'destructive' },
  withdrawn: { name: '취소됨', color: 'muted' },
} as const;

// Types
export type UserRole = keyof typeof ROLES;
export type AnimalSkin = keyof typeof ANIMAL_SKINS;
export type RoleType = keyof typeof ROLE_TYPES;
export type SkillTier = keyof typeof SKILL_TIERS;
export type SkillCategory = keyof typeof SKILL_CATEGORIES;
