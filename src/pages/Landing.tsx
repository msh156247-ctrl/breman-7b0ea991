import { Link } from "react-router-dom";
import { ArrowRight, Users, Briefcase, Eye, Trophy, Star, Zap, Shield, Sparkles, Target, TrendingUp, Award, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { BackToTop } from "@/components/ui/BackToTop";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ANIMAL_SKINS, ROLE_TYPES } from "@/lib/constants";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
              <span className="text-lg">🎵</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">브래맨</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: "/teams", label: "팀" },
              { to: "/projects", label: "프로젝트" },
              { to: "/service-offers", label: "서비스" },
              { to: "/roles", label: "역할" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                로그인
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-md shadow-primary/20">
                시작하기
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-24 px-4 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative container mx-auto max-w-5xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
              <Zap className="w-3.5 h-3.5" />
              게이미피케이션 팀 협업 플랫폼
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-[1.1] tracking-tight">
              <span className="gradient-text">브레멘 음악대</span>처럼
              <br />
              함께 성장하는 팀
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              말, 개, 고양이, 닭 — 각자의 역할로 팀을 이루고,
              <br className="hidden md:block" />
              프로젝트를 완수하며 함께 레벨업하세요.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg shadow-primary/25 px-8 h-12 text-base">
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/role-quiz">
                <Button size="lg" variant="outline" className="h-12 text-base border-border/80">
                  나에게 맞는 역할 찾기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Animal Characters Preview */}
          <div className="mt-20 flex justify-center gap-6 md:gap-10">
            {Object.entries(ANIMAL_SKINS).map(([key, skin], index) => (
              <div
                key={key}
                className="group flex flex-col items-center animate-fade-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${skin.gradient} flex items-center justify-center text-3xl md:text-4xl shadow-lg group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300 cursor-pointer`}>
                  {skin.icon}
                </div>
                <span className="mt-2.5 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {skin.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 tracking-tight">
              왜 <span className="gradient-text">브래맨</span>인가요?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              게이미피케이션 요소와 체계적인 팀 매칭으로 최고의 협업 경험을 제공합니다.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Users, title: "팀 빌딩", desc: "역할 기반 자동 매칭으로 완벽한 팀 구성", color: "from-blue-500/20 to-indigo-500/20" },
              { icon: Briefcase, title: "프로젝트 마켓", desc: "검증된 팀과 클라이언트를 연결", color: "from-emerald-500/20 to-teal-500/20" },
              { icon: Eye, title: "쇼케이스", desc: "작업물 기록으로 성장을 증명", color: "from-violet-500/20 to-purple-500/20" },
              { icon: Trophy, title: "성장 시스템", desc: "XP와 배지로 성장을 추적", color: "from-amber-500/20 to-orange-500/20" },
            ].map((feature, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
                <div className="group p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Animal Skins Detail */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3">
              <Sparkles className="w-4 h-4" />
              브레맨 캐릭터
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 tracking-tight">
              당신의 <span className="gradient-text">성향</span>을 선택하세요
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              브레멘 음악대의 동물들처럼, 협업 스타일로 팀에 기여하세요.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(ANIMAL_SKINS).map(([key, skin], index) => (
              <ScrollReveal key={key} animation={index % 2 === 0 ? "fade-right" : "fade-left"} delay={index * 80}>
                <div className="group relative p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-all duration-300 hover:shadow-xl overflow-hidden h-full">
                  <div className={`absolute inset-0 bg-gradient-to-br ${skin.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

                  <div className="relative flex items-start gap-4 mb-5">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${skin.gradient} flex items-center justify-center text-3xl shadow-md group-hover:scale-105 transition-transform duration-300`}>
                      {skin.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors">
                        {skin.name}
                        <span className="text-muted-foreground font-normal text-sm ml-2">({skin.nameEn})</span>
                      </h3>
                      <p className="text-sm font-medium text-primary/80">{skin.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{skin.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {skin.keywords.map(keyword => (
                      <span key={keyword} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Position & Skills */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3">
              <Target className="w-4 h-4" />
              포지션 & 기술
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 tracking-tight">
              전문 영역을 정의하세요
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              직무 영역과 기술 스택을 선택하여 역량을 표현하세요
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(ROLE_TYPES).map(([key, roleType], index) => (
              <ScrollReveal key={key} animation="fade-up" delay={index * 50}>
                <div className="group p-5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all duration-300 hover:shadow-md text-center h-full">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{roleType.icon}</div>
                  <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                    {roleType.name}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{roleType.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Level System */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3">
              <TrendingUp className="w-4 h-4" />
              경험 & 성장
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 tracking-tight">
              객관적 검증 기반 <span className="gradient-text">레벨 시스템</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              프로젝트 경험을 기록하고 객관적 검증을 통해 전문성을 인정받으세요
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "기술 점수 (60%)",
                desc: "등록한 스킬들의 숙련도를 기반으로 산출됩니다.",
                items: ["팀 리더의 객관적 검증을 통해 스킬 레벨 부여", "언어, 프레임워크, 도구 등으로 세분화", "공인 자격증 등록 시 추가 보너스"],
                color: "primary",
              },
              {
                icon: Briefcase,
                title: "경험 점수 (40%)",
                desc: "실제 프로젝트 참여와 협업 경험을 반영합니다.",
                items: ["완료한 프로젝트 수와 기여도", "팀원으로부터 받은 평가 및 피드백", "프로젝트에서 기록된 성과와 회고"],
                color: "success",
              },
              {
                icon: Award,
                title: "보정 점수",
                desc: "추가 활동에 따라 레벨에 보너스가 적용됩니다.",
                items: ["포트폴리오 등록 및 품질", "프로젝트 완료 기록", "팀 평가 및 공인 자격증"],
                color: "accent-foreground",
              },
            ].map((card, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
                <div className="p-6 rounded-2xl bg-card border border-border/60 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl bg-${card.color}/10 flex items-center justify-center`}>
                      <card.icon className={`w-5 h-5 text-${card.color}`} />
                    </div>
                    <h4 className="font-display font-bold text-lg">{card.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{card.desc}</p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    {card.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className={`text-${card.color} mt-1 text-xs`}>●</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "2,500+", label: "활성 사용자" },
              { value: "450+", label: "등록된 팀" },
              { value: "1,200+", label: "완료된 프로젝트" },
              { value: "98%", label: "고객 만족도" },
            ].map((stat, i) => (
              <ScrollReveal key={i} animation="scale" delay={i * 100}>
                <div className="text-3xl md:text-4xl font-display font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-primary-foreground/70">{stat.label}</div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal animation="fade-up" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 tracking-tight">
              심플한 <span className="gradient-text">요금제</span>
            </h2>
            <p className="text-muted-foreground">프로젝트 수수료 기반으로 합리적인 비용만 지불하세요.</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal animation="fade-right">
              <div className="p-8 rounded-2xl bg-card border border-border/60 h-full">
                <h3 className="font-display font-bold text-xl mb-2">개인 / 팀</h3>
                <div className="text-4xl font-bold mb-1">무료</div>
                <p className="text-sm text-muted-foreground mb-6">모든 기본 기능 무료</p>
                <ul className="space-y-3 mb-8">
                  {["팀 생성 및 참여", "프로젝트 지원", "포트폴리오 관리", "성장 시스템"].map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <Star className="w-4 h-4 text-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=signup">
                  <Button variant="outline" className="w-full h-11">시작하기</Button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-left" delay={100}>
              <div className="relative p-8 rounded-2xl bg-card border-2 border-primary/50 h-full overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-bl-xl">
                  추천
                </div>
                <h3 className="font-display font-bold text-xl mb-2">클라이언트</h3>
                <div className="text-4xl font-bold mb-1">10%</div>
                <p className="text-sm text-muted-foreground mb-6">프로젝트 금액 기준</p>
                <ul className="space-y-3 mb-8">
                  {["프로젝트 등록", "팀 매칭", "에스크로 결제", "분쟁 해결 지원", "전담 매니저"].map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=signup&type=client">
                  <Button className="w-full h-11 bg-gradient-primary hover:opacity-90">의뢰하기</Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <ScrollReveal animation="scale">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 tracking-tight">
              지금 바로 시작하세요
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              브래맨과 함께 게임처럼 즐기며 성장하는 협업을 경험해보세요.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg shadow-primary/25 px-12 h-12 text-base">
                무료로 가입하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-lg">🎵</span>
              </div>
              <span className="font-display font-bold text-lg">브래맨</span>
            </div>

            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link>
              <a href="mailto:support@breman.io" className="hover:text-foreground transition-colors">문의하기</a>
            </nav>

            <p className="text-sm text-muted-foreground">© 2025 브래맨. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}
