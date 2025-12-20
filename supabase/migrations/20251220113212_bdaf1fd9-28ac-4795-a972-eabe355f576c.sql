
-- Enums
CREATE TYPE public.user_role AS ENUM ('horse', 'dog', 'cat', 'rooster');
CREATE TYPE public.user_type AS ENUM ('individual', 'team_leader', 'client', 'admin');
CREATE TYPE public.team_status AS ENUM ('active', 'inactive', 'recruiting');
CREATE TYPE public.recruitment_method AS ENUM ('public', 'invite', 'auto');
CREATE TYPE public.project_status AS ENUM ('open', 'matched', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE public.contract_status AS ENUM ('draft', 'active', 'completed', 'disputed', 'cancelled');
CREATE TYPE public.escrow_status AS ENUM ('not_funded', 'funded', 'on_hold', 'released', 'refunded');
CREATE TYPE public.milestone_status AS ENUM ('pending', 'in_progress', 'review', 'approved', 'rejected', 'dispute');
CREATE TYPE public.siege_status AS ENUM ('registering', 'ongoing', 'ended', 'results');
CREATE TYPE public.submission_kind AS ENUM ('test', 'final');
CREATE TYPE public.dispute_status AS ENUM ('open', 'investigating', 'resolved', 'closed');
CREATE TYPE public.application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE public.skill_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
CREATE TYPE public.notification_type AS ENUM ('team_invite', 'application', 'project_match', 'milestone', 'siege', 'system');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    primary_role user_role DEFAULT 'horse',
    user_type user_type DEFAULT 'individual',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    bio TEXT,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills master table
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User skills junction
CREATE TABLE public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    tier skill_tier DEFAULT 'bronze',
    UNIQUE(user_id, skill_id)
);

-- Teams
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slogan TEXT,
    emblem_url TEXT,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status team_status DEFAULT 'recruiting',
    recruitment_method recruitment_method DEFAULT 'public',
    avg_level DECIMAL(3,1) DEFAULT 1,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team role slots
CREATE TABLE public.team_role_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    min_level INTEGER DEFAULT 1,
    required_skills TEXT[],
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team memberships
CREATE TABLE public.team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Team applications
CREATE TABLE public.team_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    desired_role user_role NOT NULL,
    intro TEXT,
    answers_json JSONB,
    attachments TEXT[],
    status application_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[],
    required_roles user_role[],
    budget_min INTEGER,
    budget_max INTEGER,
    timeline_weeks INTEGER,
    status project_status DEFAULT 'open',
    visibility TEXT DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project proposals
CREATE TABLE public.project_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    proposal_text TEXT,
    attachments TEXT[],
    proposed_budget INTEGER,
    proposed_timeline_weeks INTEGER,
    status proposal_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    status contract_status DEFAULT 'draft',
    escrow_status escrow_status DEFAULT 'not_funded',
    total_amount INTEGER,
    fee_rate DECIMAL(4,2) DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones
CREATE TABLE public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    amount INTEGER,
    status milestone_status DEFAULT 'pending',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone submissions
CREATE TABLE public.milestone_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    files TEXT[],
    note TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type notification_type DEFAULT 'system',
    title TEXT NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Siege (competitions)
CREATE TABLE public.sieges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status siege_status DEFAULT 'registering',
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    sponsors TEXT[],
    prizes_json JSONB,
    rules TEXT,
    max_teams INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Siege registrations
CREATE TABLE public.siege_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siege_id UUID REFERENCES public.sieges(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    alias TEXT,
    status TEXT DEFAULT 'registered',
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(siege_id, team_id)
);

-- Siege submissions
CREATE TABLE public.siege_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siege_id UUID REFERENCES public.sieges(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    kind submission_kind DEFAULT 'test',
    score DECIMAL(10,2),
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
    opened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    evidence_files TEXT[],
    status dispute_status DEFAULT 'open',
    resolution TEXT,
    admin_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges/Achievements
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    xp_reward INTEGER DEFAULT 0
);

CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Announcements
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    priority INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_role_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siege_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siege_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: public read, self write
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Skills: public read
CREATE POLICY "Skills are viewable by everyone" ON public.skills FOR SELECT USING (true);

-- User skills: public read, self write
CREATE POLICY "User skills are viewable by everyone" ON public.user_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage own skills" ON public.user_skills FOR ALL USING (auth.uid() = user_id);

-- Teams: public read, leader manage
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Leaders can update own team" ON public.teams FOR UPDATE USING (auth.uid() = leader_id);

-- Team role slots: public read, leader manage
CREATE POLICY "Team slots are viewable by everyone" ON public.team_role_slots FOR SELECT USING (true);
CREATE POLICY "Leaders can manage team slots" ON public.team_role_slots FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Team memberships: public read
CREATE POLICY "Memberships are viewable by everyone" ON public.team_memberships FOR SELECT USING (true);
CREATE POLICY "Leaders can manage memberships" ON public.team_memberships FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Team applications: applicant and leader can see
CREATE POLICY "Users can view own applications" ON public.team_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Leaders can view team applications" ON public.team_applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);
CREATE POLICY "Users can create applications" ON public.team_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leaders can update applications" ON public.team_applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Projects: public read for open, client manage
CREATE POLICY "Open projects are viewable by everyone" ON public.projects FOR SELECT USING (visibility = 'public' OR client_id = auth.uid());
CREATE POLICY "Clients can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = client_id);

-- Project proposals
CREATE POLICY "Proposals viewable by client and team" ON public.project_proposals FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND client_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);
CREATE POLICY "Team leaders can create proposals" ON public.project_proposals FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Contracts
CREATE POLICY "Contract parties can view" ON public.contracts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND client_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Milestones
CREATE POLICY "Milestone parties can view" ON public.milestones FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        JOIN public.projects p ON c.project_id = p.id
        WHERE c.id = contract_id AND (p.client_id = auth.uid() OR c.team_id IN (
            SELECT id FROM public.teams WHERE leader_id = auth.uid()
        ))
    )
);

-- Milestone submissions
CREATE POLICY "Submissions viewable by parties" ON public.milestone_submissions FOR SELECT USING (true);
CREATE POLICY "Team members can submit" ON public.milestone_submissions FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Reviews: public read
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Notifications: user only
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Sieges: public read
CREATE POLICY "Sieges are viewable by everyone" ON public.sieges FOR SELECT USING (true);

-- Siege registrations
CREATE POLICY "Registrations are viewable by everyone" ON public.siege_registrations FOR SELECT USING (true);
CREATE POLICY "Team leaders can register" ON public.siege_registrations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Siege submissions
CREATE POLICY "Team submissions viewable during results" ON public.siege_submissions FOR SELECT USING (true);
CREATE POLICY "Team leaders can submit" ON public.siege_submissions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Disputes
CREATE POLICY "Dispute parties can view" ON public.disputes FOR SELECT USING (
    opened_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.contracts c JOIN public.projects p ON c.project_id = p.id WHERE c.id = contract_id AND p.client_id = auth.uid())
);
CREATE POLICY "Users can create disputes" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = opened_by);

-- Badges: public read
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "User badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);

-- Announcements: public read
CREATE POLICY "Announcements are viewable by everyone" ON public.announcements FOR SELECT USING (active = true);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
    RETURN new;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
