import { Link } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, Swords, Trophy, Star, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLES } from '@/lib/constants';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-lg">🎵</span>
            </div>
            <span className="font-display font-bold text-xl">브래맨</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">기능</a>
            <a href="#roles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">역할</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">요금</a>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">로그인</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                시작하기
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              게이미피케이션 팀 협업 플랫폼
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              <span className="gradient-text">브레멘 음악대</span>처럼
              <br />
              함께 성장하는 팀
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              말, 개, 고양이, 닭 - 각자의 역할로 팀을 이루고,
              <br className="hidden md:block" />
              프로젝트를 완수하며 함께 레벨업하세요.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg shadow-primary/25 px-8">
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  더 알아보기
                </Button>
              </a>
            </div>
          </div>

          {/* Animal roles showcase */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Object.entries(ROLES).map(([key, role], index) => (
              <div 
                key={key}
                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                  {role.icon}
                </div>
                <h3 className="font-display font-bold text-lg mb-1">{role.name}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              왜 <span className="gradient-text">브래맨</span>인가요?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              게이미피케이션 요소와 체계적인 팀 매칭으로 최고의 협업 경험을 제공합니다.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: '팀 빌딩', desc: '역할 기반 자동 매칭으로 완벽한 팀 구성' },
              { icon: Briefcase, title: '프로젝트 마켓', desc: '검증된 팀과 클라이언트 연결' },
              { icon: Swords, title: 'Siege 대회', desc: '알고리즘 경쟁으로 실력 검증' },
              { icon: Trophy, title: '랭킹 시스템', desc: 'XP와 배지로 성장을 추적' },
            ].map((feature, i) => (
              <div 
                key={i}
                className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Detail */}
      <section id="roles" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              당신의 <span className="gradient-text">역할</span>을 선택하세요
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              브레멘 음악대의 동물들처럼, 각자의 특기를 살려 팀에 기여하세요.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {Object.entries(ROLES).map(([key, role]) => (
              <div 
                key={key}
                className="flex gap-6 p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-background flex items-center justify-center text-5xl">
                  {role.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl mb-2">
                    {role.name} <span className="text-muted-foreground font-normal">({role.nameEn})</span>
                  </h3>
                  <p className="text-muted-foreground mb-3">{role.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {key === 'horse' && ['리더십', '백엔드', 'DB설계', 'API'].map(s => (
                      <span key={s} className="text-xs px-2 py-1 rounded-full bg-muted">{s}</span>
                    ))}
                    {key === 'dog' && ['QA', '보안', '테스트', '코드리뷰'].map(s => (
                      <span key={s} className="text-xs px-2 py-1 rounded-full bg-muted">{s}</span>
                    ))}
                    {key === 'cat' && ['UI/UX', '그래픽', '프로토타입', '브랜딩'].map(s => (
                      <span key={s} className="text-xs px-2 py-1 rounded-full bg-muted">{s}</span>
                    ))}
                    {key === 'rooster' && ['프론트엔드', 'React', 'CSS', '반응형'].map(s => (
                      <span key={s} className="text-xs px-2 py-1 rounded-full bg-muted">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '2,500+', label: '활성 사용자' },
              { value: '450+', label: '등록된 팀' },
              { value: '1,200+', label: '완료된 프로젝트' },
              { value: '98%', label: '고객 만족도' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-display font-bold mb-2">{stat.value}</div>
                <div className="text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              심플한 <span className="gradient-text">요금제</span>
            </h2>
            <p className="text-muted-foreground">
              프로젝트 수수료 기반으로 합리적인 비용만 지불하세요.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <h3 className="font-display font-bold text-xl mb-2">개인 / 팀</h3>
              <div className="text-4xl font-bold mb-4">무료</div>
              <ul className="space-y-3 mb-6">
                {['팀 생성 및 참여', '프로젝트 지원', 'Siege 참가', '랭킹 시스템'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup">
                <Button variant="outline" className="w-full">시작하기</Button>
              </Link>
            </div>
            
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-display font-bold text-xl">클라이언트</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">추천</span>
              </div>
              <div className="text-4xl font-bold mb-1">10%</div>
              <p className="text-sm text-muted-foreground mb-4">프로젝트 금액 기준</p>
              <ul className="space-y-3 mb-6">
                {['프로젝트 등록', '팀 매칭', '에스크로 결제', '분쟁 해결 지원', '전담 매니저'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup&type=client">
                <Button className="w-full bg-gradient-primary">의뢰하기</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            브래맨과 함께 게임처럼 즐기며 성장하는 협업을 경험해보세요.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg shadow-primary/25 px-12">
              무료로 가입하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-lg">🎵</span>
              </div>
              <span className="font-display font-bold text-xl">브래맨</span>
            </div>
            
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link>
              <a href="mailto:support@breman.io" className="hover:text-foreground transition-colors">문의하기</a>
            </nav>
            
            <p className="text-sm text-muted-foreground">
              © 2024 브래맨. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
