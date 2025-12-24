import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Theme toggle in top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="text-center max-w-md">
        <ScrollReveal>
          {/* 404 Number */}
          <div className="relative mb-8">
            <span className="text-[150px] md:text-[200px] font-bold text-primary/10 leading-none select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="w-16 h-16 md:w-24 md:h-24 text-primary animate-pulse" />
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            페이지를 찾을 수 없습니다
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-lg text-muted-foreground mb-8">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
            <br />
            <span className="text-sm text-muted-foreground/70">
              경로: {location.pathname}
            </span>
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="w-4 h-4" />
                홈으로 이동
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
                대시보드로 이동
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <p className="mt-8 text-sm text-muted-foreground">
            문제가 지속되면{" "}
            <Link to="/" className="text-primary hover:underline">
              관리자에게 문의
            </Link>
            해주세요.
          </p>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default NotFound;
