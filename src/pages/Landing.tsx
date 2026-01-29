import { Link } from "react-router-dom";
import { ArrowRight, Users, Briefcase, Eye, Trophy, Star, Zap, Shield, Info, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { BackToTop } from "@/components/ui/BackToTop";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ANIMAL_SKINS, ROLE_TYPES, SKILL_CATEGORIES, METRIC_DESCRIPTIONS } from "@/lib/constants";
export default function Landing() {
  return <div className="min-h-screen bg-gradient-hero">
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
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              기능
            </a>
            <Link to="/roles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              역할
            </Link>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              요금
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                로그인
              </Button>
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
              <Link to="/role-quiz">
                <Button size="lg" variant="outline">
                  나에게 맞는 역할 찾기
                </Button>
              </Link>
            </div>
          </div>

          {/* Animal Skins - 성향 */}
          <div className="mt-20">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-xl text-center">성향 (브레맨 캐릭터)</h3>
            </div>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              협업 스타일과 성격을 나타내는 브레맨 동물 캐릭터
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {Object.entries(ANIMAL_SKINS).map(([key, skin], index) => <div key={key} className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 animate-fade-up cursor-pointer" style={{
              animationDelay: `${index * 100}ms`
            }}>
                  <div className="text-5xl mb-4 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300 ease-out">
                    {skin.icon}
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {skin.name}
                  </h3>
                  <p className="text-xs text-primary font-medium mb-2">{skin.title}</p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">
                    {skin.description}
                  </p>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${skin.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${skin.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`} />
                </div>)}
            </div>
          </div>

          {/* Role Types - 포지션 & 기술 */}
          <div className="mt-20">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-xl text-center">포지션 & 기술</h3>
            </div>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              전문 직무 영역과 기술 스택을 선택하여 역량을 표현하세요
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(ROLE_TYPES).map(([key, roleType], index) => <div key={key} className="group p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-up text-center" style={{
              animationDelay: `${index * 50}ms`
            }}>
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{roleType.icon}</div>
                  <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                    {roleType.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{roleType.description}</p>
                </div>)}
            </div>

            {/* Skill Categories */}
            
          </div>

          {/* Experience - 경험 */}
          <div className="mt-20">
            <div className="flex items-center justify-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-xl text-center">경험 & 성장</h3>
            </div>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              프로젝트 경험을 기록하고 XP를 쌓아 레벨업하세요
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🥉</span>
                </div>
                <h4 className="font-display font-bold text-lg mb-2">브론즈 ~ 실버</h4>
                <p className="text-sm text-muted-foreground">
                  Lv.1~4 • 기초 스킬 학습 단계
                  <br />
                  프로젝트 참여로 경험 축적
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-card border border-border text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🥇</span>
                </div>
                <h4 className="font-display font-bold text-lg mb-2">골드 ~ 플래티넘</h4>
                <p className="text-sm text-muted-foreground">
                  Lv.5~7 • 숙련된 실무 역량
                  <br />팀 리딩 및 멘토링 가능
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-card border border-border text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💎</span>
                </div>
                <h4 className="font-display font-bold text-lg mb-2">다이아몬드</h4>
                <p className="text-sm text-muted-foreground">
                  Lv.8~10 • 최고 전문가 등급
                  <br />
                  업계 인정받는 전문성
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              왜 <span className="gradient-text">브래맨</span>인가요?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              게이미피케이션 요소와 체계적인 팀 매칭으로 최고의 협업 경험을 제공합니다.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[{
            icon: Users,
            title: "팀 빌딩",
            desc: "역할 기반 자동 매칭으로 완벽한 팀 구성"
          }, {
            icon: Briefcase,
            title: "프로젝트 마켓",
            desc: "검증된 팀과 클라이언트 연결"
          }, {
            icon: Eye,
            title: "쇼케이스",
            desc: "작업물 기록으로 성장 증명"
          }, {
            icon: Trophy,
            title: "성장 시스템",
            desc: "XP와 배지로 성장을 추적"
          }].map((feature, i) => <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
                <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition-all h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </ScrollReveal>)}
          </div>
        </div>
      </section>

      {/* Roles Detail - 성향 상세 */}
      <section id="roles" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              당신의 <span className="gradient-text">성향</span>을 선택하세요
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              브레멘 음악대의 동물들처럼, 협업 스타일로 팀에 기여하세요.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {Object.entries(ANIMAL_SKINS).map(([key, skin], index) => <ScrollReveal key={key} animation={index % 2 === 0 ? "fade-right" : "fade-left"} delay={index * 100}>
                <div className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden h-full">
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${skin.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                  {/* Header */}
                  <div className="relative flex items-start gap-4 mb-5">
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${skin.gradient} flex items-center justify-center text-4xl shadow-md group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg transition-all duration-300`}>
                      {skin.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-xl group-hover:text-primary transition-colors duration-300">
                        {skin.name} <span className="text-muted-foreground font-normal text-base">({skin.nameEn})</span>
                      </h3>
                      <p className="text-sm font-medium text-primary">{skin.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{skin.description}</p>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      키워드
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skin.keywords.map(keyword => <span key={keyword} className={`text-xs px-2.5 py-1 rounded-full bg-gradient-to-r ${skin.gradient} text-primary-foreground font-medium`}>
                          {keyword}
                        </span>)}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      성장 지표
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skin.metrics.map(metric => <Tooltip key={metric}>
                          <TooltipTrigger className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground cursor-help flex items-center gap-1 hover:bg-muted/80 transition-colors">
                            📊 {metric}
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-semibold mb-2">{metric}</p>
                            {METRIC_DESCRIPTIONS[metric] && <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">계산 방식:</span>
                                  <p className="text-foreground">{METRIC_DESCRIPTIONS[metric].calculation}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">추적 방법:</span>
                                  <p className="text-foreground">{METRIC_DESCRIPTIONS[metric].tracking}</p>
                                </div>
                              </div>}
                          </TooltipContent>
                        </Tooltip>)}
                    </div>
                  </div>
                </div>
              </ScrollReveal>)}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[{
            value: "2,500+",
            label: "활성 사용자"
          }, {
            value: "450+",
            label: "등록된 팀"
          }, {
            value: "1,200+",
            label: "완료된 프로젝트"
          }, {
            value: "98%",
            label: "고객 만족도"
          }].map((stat, i) => <ScrollReveal key={i} animation="scale" delay={i * 100}>
                <div className="text-3xl md:text-4xl font-display font-bold mb-2">{stat.value}</div>
                <div className="text-primary-foreground/80">{stat.label}</div>
              </ScrollReveal>)}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              심플한 <span className="gradient-text">요금제</span>
            </h2>
            <p className="text-muted-foreground">프로젝트 수수료 기반으로 합리적인 비용만 지불하세요.</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            <ScrollReveal animation="fade-right" delay={0}>
              <div className="p-8 rounded-2xl bg-card border border-border h-full">
                <h3 className="font-display font-bold text-xl mb-2">개인 / 팀</h3>
                <div className="text-4xl font-bold mb-4">무료</div>
                <ul className="space-y-3 mb-6">
                  {["팀 생성 및 참여", "프로젝트 지원", "Showcase 등록", "성장 시스템"].map((f, i) => <li key={i} className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-success" />
                      {f}
                    </li>)}
                </ul>
                <Link to="/auth?mode=signup">
                  <Button variant="outline" className="w-full">
                    시작하기
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-left" delay={100}>
              <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary h-full">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-display font-bold text-xl">클라이언트</h3>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                    추천
                  </span>
                </div>
                <div className="text-4xl font-bold mb-1">10%</div>
                <p className="text-sm text-muted-foreground mb-4">프로젝트 금액 기준</p>
                <ul className="space-y-3 mb-6">
                  {["프로젝트 등록", "팀 매칭", "에스크로 결제", "분쟁 해결 지원", "전담 매니저"].map((f, i) => <li key={i} className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-primary" />
                      {f}
                    </li>)}
                </ul>
                <Link to="/auth?mode=signup&type=client">
                  <Button className="w-full bg-gradient-primary">의뢰하기</Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl text-center">
          <ScrollReveal animation="scale">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">지금 바로 시작하세요</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              브래맨과 함께 게임처럼 즐기며 성장하는 협업을 경험해보세요.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg shadow-primary/25 px-12">
                무료로 가입하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </ScrollReveal>
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
              <Link to="/terms" className="hover:text-foreground transition-colors">
                이용약관
              </Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                개인정보처리방침
              </Link>
              <a href="mailto:support@breman.io" className="hover:text-foreground transition-colors">
                문의하기
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">© 2024 브래맨. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {/* Back to Top */}
      <BackToTop />
    </div>;
}