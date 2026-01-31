import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";

import Landing from "./pages/Landing";
import Roles from "./pages/Roles";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import ChatRoom from "./pages/ChatRoom";
import Teams from "./pages/Teams";
import TeamCreate from "./pages/TeamCreate";
import TeamEdit from "./pages/TeamEdit";
import TeamJoin from "./pages/TeamJoin";
import TeamDetail from "./pages/TeamDetail";
import Projects from "./pages/Projects";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectEdit from "./pages/ProjectEdit";
import ProjectDetail from "./pages/ProjectDetail";
import ContractManagement from "./pages/ContractManagement";
import Showcase from "./pages/Showcase";
import ShowcaseDetail from "./pages/ShowcaseDetail";
import ShowcaseCreate from "./pages/ShowcaseCreate";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
import RoleQuiz from "./pages/RoleQuiz";
import ServiceOffers from "./pages/ServiceOffers";
import ServiceOfferCreate from "./pages/ServiceOfferCreate";
import ServiceOfferDetail from "./pages/ServiceOfferDetail";
import ServiceOfferEdit from "./pages/ServiceOfferEdit";
import ClientDashboard from "./pages/ClientDashboard";
import { AppShell } from "./components/layout/AppShell";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎵</span>
          </div>
          <p className="text-muted-foreground">로딩중...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/roles" element={<Roles />} />
      <Route path="/role-quiz" element={<RoleQuiz />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />
      
      {/* ChatRoom - standalone without AppShell header */}
      <Route path="/chat/:conversationId" element={
        <ProtectedRoute>
          <ChatRoom />
        </ProtectedRoute>
      } />
      
      {/* Public routes with AppShell (viewable without login) */}
      <Route path="/" element={<AppShell />}>
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:teamId" element={<TeamDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<ProjectDetail />} />
      </Route>
      
      {/* Protected routes with AppShell */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="teams/create" element={<TeamCreate />} />
        <Route path="teams/join/:teamId" element={<TeamJoin />} />
        <Route path="teams/:teamId/edit" element={<TeamEdit />} />
        <Route path="projects/create" element={<ProjectCreate />} />
        <Route path="projects/:projectId/edit" element={<ProjectEdit />} />
        <Route path="contracts/:contractId" element={<ContractManagement />} />
        <Route path="showcase" element={<Showcase />} />
        <Route path="showcase/create" element={<ShowcaseCreate />} />
        <Route path="showcase/:showcaseId" element={<ShowcaseDetail />} />
        <Route path="service-offers" element={<ServiceOffers />} />
        <Route path="service-offers/create" element={<ServiceOfferCreate />} />
        <Route path="service-offers/:offerId" element={<ServiceOfferDetail />} />
        <Route path="service-offers/:offerId/edit" element={<ServiceOfferEdit />} />
        <Route path="client" element={<ClientDashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="admin" element={<AdminSettings />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
