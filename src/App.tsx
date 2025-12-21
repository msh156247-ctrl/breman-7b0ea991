import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Projects from "./pages/Projects";
import Siege from "./pages/Siege";
import Rankings from "./pages/Rankings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
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
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected routes with AppShell */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:teamId" element={<TeamDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="siege" element={<Siege />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
