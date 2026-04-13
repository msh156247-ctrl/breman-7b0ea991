import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Menu,
  Shield,
  X,
  LogOut,
  User,
  ChevronDown,
  MessageSquare,
  Bell,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { GlobalSearch } from '@/components/search/GlobalSearch';

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/teams', label: '팀', icon: Users },
  { href: '/client', label: '의뢰관리', icon: Briefcase },
];

const SIDEBAR_COLLAPSED_WIDTH = 'w-16';
const SIDEBAR_EXPANDED_WIDTH = 'w-64';

export function AppShell() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // desktop: collapsed by default
  const { user, profile, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // 페이지 이동시 모바일 사이드바 닫기
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ESC 키로 사이드바 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .rpc('is_admin', { _user_id: user.id });
        
        if (!error && data === true) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  // 모바일: slide in/out, 데스크톱: always visible
  const sidebarTransform = isMobile 
    ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)')
    : 'translateX(0)';

  const sidebarWidth = isMobile ? 'w-64' : (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH);
  const mainPadding = isMobile ? '' : (collapsed ? 'pl-16' : 'pl-64');

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            onClick={handleCloseSidebar}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleCloseSidebar();
            }}
            aria-label="사이드바 닫기"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
            sidebarWidth
          )}
          style={{ transform: sidebarTransform }}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-3 border-b border-sidebar-border">
              <Link to="/dashboard" className="flex items-center gap-2 min-w-0" onClick={handleCloseSidebar}>
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                  <span className="text-lg">🎵</span>
                </div>
                {(!collapsed || isMobile) && (
                  <span className="font-display font-bold text-xl text-sidebar-foreground truncate">브래맨</span>
                )}
              </Link>
              {isMobile && (
                <button 
                  className="p-2 rounded-lg hover:bg-sidebar-accent active:bg-sidebar-accent/80 touch-manipulation"
                  onClick={handleCloseSidebar}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCloseSidebar();
                  }}
                  type="button"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.href);
                const linkContent = (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={handleCloseSidebar}
                    className={cn(
                      'flex items-center gap-3 rounded-lg text-sm font-medium transition-all',
                      collapsed && !isMobile ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {(!collapsed || isMobile) && item.label}
                  </Link>
                );

                if (collapsed && !isMobile) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </nav>

            {/* Collapse toggle (desktop only) */}
            {!isMobile && (
              <div className="px-2 py-2 border-t border-sidebar-border">
                <button
                  onClick={toggleCollapsed}
                  className="flex items-center justify-center w-full p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  aria-label={collapsed ? '사이드바 열기' : '사이드바 닫기'}
                >
                  {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* User section */}
            <div className="p-2 border-t border-sidebar-border">
              {user ? (
                collapsed && !isMobile ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link 
                        to="/profile"
                        onClick={handleCloseSidebar}
                        className="flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {profile?.name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {profile?.name || '프로필'}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link 
                    to="/profile"
                    onClick={handleCloseSidebar}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {profile?.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">
                        {profile?.name || '사용자'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Lv.{profile?.level || 1}
                      </p>
                    </div>
                  </Link>
                )
              ) : (
                <Link 
                  to="/auth"
                  onClick={handleCloseSidebar}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium",
                    collapsed && !isMobile ? 'p-2' : 'p-3'
                  )}
                >
                  {collapsed && !isMobile ? <User className="w-5 h-5" /> : '로그인 / 회원가입'}
                </Link>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className={cn("transition-all duration-300", mainPadding)}>
          {/* Top bar */}
          <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="flex items-center justify-between h-full px-4 lg:px-6">
              <div className="flex items-center gap-4">
                {isMobile && (
                  <button
                    className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 touch-manipulation"
                    onClick={handleOpenSidebar}
                    type="button"
                    aria-label="메뉴 열기"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                
                {/* Global Search */}
                <div className="hidden sm:flex items-center">
                  <GlobalSearch />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <ThemeToggle />

                {user ? (
                  <>
                    {/* Notifications */}
                    <NotificationsDropdown />

                    {/* User menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2 px-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {profile?.name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link to="/profile" className="cursor-pointer">
                            <User className="w-4 h-4 mr-2" />
                            프로필
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/chat" className="cursor-pointer">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            채팅
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/chat?tab=messages" className="cursor-pointer">
                            <Mail className="w-4 h-4 mr-2" />
                            쪽지
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/notifications" className="cursor-pointer">
                            <Bell className="w-4 h-4 mr-2" />
                            알림
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer">
                              <Shield className="w-4 h-4 mr-2" />
                              관리자 설정
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={signOut}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          로그아웃
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button size="sm">로그인</Button>
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
