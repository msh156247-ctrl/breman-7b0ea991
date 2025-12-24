import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, TrendingUp, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLES, type UserRole } from '@/lib/constants';

const ROLE_SKILLS: Record<UserRole, { required: string[]; optional: string[] }> = {
  horse: {
    required: ['시스템 설계', 'API 개발', '데이터베이스', '팀 관리'],
    optional: ['DevOps', '클라우드', '마이크로서비스', '보안 아키텍처']
  },
  dog: {
    required: ['테스트 자동화', 'QA 프로세스', '보안 점검', '버그 트래킹'],
    optional: ['침투 테스트', 'CI/CD', '성능 테스트', '접근성 검수']
  },
  cat: {
    required: ['UI 디자인', 'UX 리서치', '프로토타이핑', '디자인 시스템'],
    optional: ['모션 디자인', '브랜딩', '일러스트', '3D 디자인']
  },
  rooster: {
    required: ['React/Vue', 'CSS/Tailwind', '반응형 디자인', '상태 관리'],
    optional: ['애니메이션', '웹 성능 최적화', 'TypeScript', 'Next.js']
  }
};

const CAREER_PATHS: Record<UserRole, { level: string; title: string; description: string }[]> = {
  horse: [
    { level: '1-5', title: '주니어 백엔드', description: 'API 개발과 DB 설계 기초' },
    { level: '6-15', title: '시니어 백엔드', description: '시스템 아키텍처 설계 주도' },
    { level: '16-30', title: '테크 리드', description: '팀 기술 방향 결정' },
    { level: '31+', title: 'CTO급', description: '조직 전체 기술 전략 수립' }
  ],
  dog: [
    { level: '1-5', title: '주니어 QA', description: '테스트 케이스 작성 및 수행' },
    { level: '6-15', title: '시니어 QA', description: '테스트 자동화 및 보안 점검' },
    { level: '16-30', title: 'QA 리드', description: '품질 프로세스 수립' },
    { level: '31+', title: 'CISO급', description: '보안 전략 및 컴플라이언스' }
  ],
  cat: [
    { level: '1-5', title: '주니어 디자이너', description: 'UI 컴포넌트 디자인' },
    { level: '6-15', title: '시니어 디자이너', description: 'UX 리서치 및 프로토타입' },
    { level: '16-30', title: '디자인 리드', description: '디자인 시스템 구축' },
    { level: '31+', title: 'CDO급', description: '브랜드 및 제품 비전 수립' }
  ],
  rooster: [
    { level: '1-5', title: '주니어 프론트엔드', description: '컴포넌트 개발 및 스타일링' },
    { level: '6-15', title: '시니어 프론트엔드', description: '복잡한 UI 및 성능 최적화' },
    { level: '16-30', title: '프론트엔드 리드', description: '아키텍처 및 기술 선정' },
    { level: '31+', title: '프린시펄급', description: '대규모 프론트엔드 전략' }
  ]
};

export default function Roles() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">홈으로</span>
          </Link>
          
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-lg">🎵</span>
            </div>
            <span className="font-display font-bold text-xl">브래맨</span>
          </Link>
          
          <Link to="/auth?mode=signup">
            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
              시작하기
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-hero">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            브래맨 <span className="gradient-text">역할 체계</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            브레멘 음악대의 동물들처럼, 각자의 특기를 살려 팀에 기여하세요.
            <br />
            역할별 스킬 요구사항과 커리어 패스를 확인해보세요.
          </p>
        </div>
      </section>

      {/* Role Cards */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl space-y-16">
          {(Object.entries(ROLES) as [UserRole, typeof ROLES[UserRole]][]).map(([key, role], index) => (
            <div 
              key={key}
              className={`grid lg:grid-cols-2 gap-8 items-start ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
            >
              {/* Role Overview */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="p-8 rounded-3xl bg-card border border-border">
                  {/* Header */}
                  <div className="flex items-start gap-5 mb-6">
                    <div className={`flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center text-5xl shadow-lg`}>
                      {role.icon}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-2xl mb-1">
                        {role.name}
                        <span className="text-muted-foreground font-normal text-lg ml-2">
                          {role.nameEn}
                        </span>
                      </h2>
                      <p className="text-primary font-semibold">{role.title}</p>
                      <p className="text-muted-foreground mt-1">{role.description}</p>
                    </div>
                  </div>

                  {/* Responsibilities */}
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <Target className="w-4 h-4 text-primary" />
                      담당 업무
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {role.responsibilities.map((resp, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Keywords */}
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      핵심 키워드
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {role.keywords.map((keyword) => (
                        <span 
                          key={keyword} 
                          className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${role.gradient} text-primary-foreground text-sm font-medium`}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      성장 지표
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {role.metrics.map((metric) => (
                        <span 
                          key={metric} 
                          className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm"
                        >
                          📊 {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills & Career Path */}
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                {/* Required Skills */}
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h3 className="font-display font-semibold text-lg mb-4">필수 스킬</h3>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_SKILLS[key].required.map((skill) => (
                      <span 
                        key={skill}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Optional Skills */}
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h3 className="font-display font-semibold text-lg mb-4">권장 스킬</h3>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_SKILLS[key].optional.map((skill) => (
                      <span 
                        key={skill}
                        className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Career Path */}
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h3 className="font-display font-semibold text-lg mb-4">커리어 패스</h3>
                  <div className="space-y-4">
                    {CAREER_PATHS[key].map((stage, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${role.gradient} flex items-center justify-center text-primary-foreground text-xs font-bold`}>
                            Lv.{stage.level.split('-')[0]}
                          </div>
                          {i < CAREER_PATHS[key].length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>
                        <div className="pb-4">
                          <h4 className="font-semibold text-foreground">{stage.title}</h4>
                          <p className="text-sm text-muted-foreground">Lv. {stage.level}</p>
                          <p className="text-sm text-foreground/80 mt-1">{stage.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-display font-bold mb-4">
            나에게 맞는 역할을 찾으셨나요?
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            지금 바로 가입하고 온보딩 과정에서 역할을 선택하세요.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" variant="secondary" className="px-8">
              무료로 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>© 2024 브래맨. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}