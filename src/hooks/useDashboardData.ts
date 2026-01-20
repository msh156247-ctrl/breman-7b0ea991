import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/constants';

export interface MyTeam {
  id: string;
  name: string;
  emblem_url: string | null;
  role: UserRole;
  memberCount: number;
  status: string;
}

export interface ActiveProject {
  id: string;
  title: string;
  clientName: string;
  status: string;
  progress: number;
  totalMilestones: number;
  completedMilestones: number;
}

export interface UpcomingSiege {
  id: string;
  title: string;
  startsIn: string;
  prize: string;
  participants: number;
  status: string;
}

export interface DashboardStats {
  teamCount: number;
  badgeCount: number;
  projectCount: number;
  completedProjectCount: number;
}

export function useDashboardData() {
  const { user, profile } = useAuth();
  const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [upcomingSiege, setUpcomingSiege] = useState<UpcomingSiege | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    teamCount: 0,
    badgeCount: 0,
    projectCount: 0,
    completedProjectCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchMyTeams = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get teams where user is leader
      const { data: leaderTeams, error: leaderError } = await supabase
        .from('teams')
        .select(`
          id, name, emblem_url, status,
          team_memberships(count)
        `)
        .eq('leader_id', user.id);

      if (leaderError) throw leaderError;

      // Get teams where user is member
      const { data: memberTeams, error: memberError } = await supabase
        .from('team_memberships')
        .select(`
          role,
          teams:team_id(
            id, name, emblem_url, status,
            team_memberships(count)
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const teamsMap = new Map<string, MyTeam>();

      // Add leader teams
      leaderTeams?.forEach(team => {
        if (team.id) {
          teamsMap.set(team.id, {
            id: team.id,
            name: team.name,
            emblem_url: team.emblem_url,
            role: profile?.primary_role || 'horse',
            memberCount: (team.team_memberships as any)?.[0]?.count || 1,
            status: team.status || 'active',
          });
        }
      });

      // Add member teams
      memberTeams?.forEach(membership => {
        const team = membership.teams as any;
        if (team && !teamsMap.has(team.id)) {
          teamsMap.set(team.id, {
            id: team.id,
            name: team.name,
            emblem_url: team.emblem_url,
            role: membership.role as UserRole,
            memberCount: team.team_memberships?.[0]?.count || 1,
            status: team.status || 'active',
          });
        }
      });

      setMyTeams(Array.from(teamsMap.values()));
      setStats(prev => ({ ...prev, teamCount: teamsMap.size }));
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, [user?.id, profile?.primary_role]);

  const fetchActiveProjects = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get projects where user is client
      const { data: clientProjects, error: clientError } = await supabase
        .from('projects')
        .select('id, title, status')
        .eq('client_id', user.id)
        .in('status', ['open', 'matched', 'in_progress']);

      if (clientError) throw clientError;

      // Get projects through team contracts
      const { data: teamProjects, error: teamError } = await supabase
        .from('contracts')
        .select(`
          project:project_id(id, title, status),
          team:team_id(leader_id),
          milestones(status)
        `)
        .in('status', ['active', 'draft']);

      if (teamError) throw teamError;

      const projectsMap = new Map<string, ActiveProject>();

      // Add client projects
      clientProjects?.forEach(project => {
        projectsMap.set(project.id, {
          id: project.id,
          title: project.title,
          clientName: '내 프로젝트',
          status: project.status || 'open',
          progress: 0,
          totalMilestones: 0,
          completedMilestones: 0,
        });
      });

      // Add team projects where user is leader or member
      teamProjects?.forEach(contract => {
        const project = contract.project as any;
        const team = contract.team as any;
        const milestones = contract.milestones as any[] || [];
        
        if (project && team?.leader_id === user.id && !projectsMap.has(project.id)) {
          const completed = milestones.filter(m => m.status === 'approved').length;
          const total = milestones.length;
          
          projectsMap.set(project.id, {
            id: project.id,
            title: project.title,
            clientName: '팀 프로젝트',
            status: project.status || 'in_progress',
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            totalMilestones: total,
            completedMilestones: completed,
          });
        }
      });

      const projectsList = Array.from(projectsMap.values());
      setActiveProjects(projectsList.slice(0, 5));
      setStats(prev => ({ 
        ...prev, 
        projectCount: projectsList.length,
        completedProjectCount: projectsList.filter(p => p.status === 'completed').length,
      }));
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [user?.id]);

  const fetchUpcomingSiege = useCallback(async () => {
    try {
      const { data: siege, error } = await supabase
        .from('sieges')
        .select(`
          id, title, start_at, prizes_json, status,
          siege_registrations(count)
        `)
        .in('status', ['registering', 'ongoing'])
        .order('start_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (siege) {
        const startDate = new Date(siege.start_at || '');
        const now = new Date();
        const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let startsIn = '';
        if (siege.status === 'ongoing') {
          startsIn = '진행중';
        } else if (diffDays <= 0) {
          startsIn = '곧 시작';
        } else if (diffDays === 1) {
          startsIn = '1일';
        } else {
          startsIn = `${diffDays}일`;
        }

        // Parse prize from JSON
        let prize = '미정';
        if (siege.prizes_json) {
          const prizes = siege.prizes_json as any;
          if (prizes.first) {
            prize = `₩${(prizes.first / 10000).toLocaleString()}만`;
          } else if (Array.isArray(prizes) && prizes[0]) {
            prize = `₩${(prizes[0] / 10000).toLocaleString()}만`;
          }
        }

        setUpcomingSiege({
          id: siege.id,
          title: siege.title,
          startsIn,
          prize,
          participants: (siege.siege_registrations as any)?.[0]?.count || 0,
          status: siege.status || 'registering',
        });
      }
    } catch (error) {
      console.error('Error fetching siege:', error);
    }
  }, []);

  const fetchBadgeCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;

      setStats(prev => ({ ...prev, badgeCount: count || 0 }));
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyTeams(),
        fetchActiveProjects(),
        fetchUpcomingSiege(),
        fetchBadgeCount(),
      ]);
      setLoading(false);
    };

    if (user?.id) {
      fetchAll();
    }
  }, [user?.id, fetchMyTeams, fetchActiveProjects, fetchUpcomingSiege, fetchBadgeCount]);

  return {
    myTeams,
    activeProjects,
    upcomingSiege,
    stats,
    loading,
    refetch: () => {
      fetchMyTeams();
      fetchActiveProjects();
      fetchUpcomingSiege();
      fetchBadgeCount();
    },
  };
}
