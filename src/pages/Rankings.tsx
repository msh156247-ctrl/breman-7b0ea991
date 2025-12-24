import { useState } from 'react';
import { Trophy, Medal, Search, TrendingUp, Users, Code, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROLES, SKILL_TIERS, type UserRole, type SkillTier } from '@/lib/constants';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// Sample data
const userRankings = [
  { rank: 1, id: '1', name: '김개발', avatar: null, role: 'horse' as UserRole, level: 12, xp: 45200, tier: 'diamond' as SkillTier },
  { rank: 2, id: '2', name: '이프론트', avatar: null, role: 'rooster' as UserRole, level: 11, xp: 42100, tier: 'diamond' as SkillTier },
  { rank: 3, id: '3', name: '박디자인', avatar: null, role: 'cat' as UserRole, level: 10, xp: 38500, tier: 'platinum' as SkillTier },
  { rank: 4, id: '4', name: '최보안', avatar: null, role: 'dog' as UserRole, level: 10, xp: 37800, tier: 'platinum' as SkillTier },
  { rank: 5, id: '5', name: '정백엔드', avatar: null, role: 'horse' as UserRole, level: 9, xp: 35200, tier: 'platinum' as SkillTier },
  { rank: 6, id: '6', name: '강리액트', avatar: null, role: 'rooster' as UserRole, level: 9, xp: 34100, tier: 'gold' as SkillTier },
  { rank: 7, id: '7', name: '윤UI', avatar: null, role: 'cat' as UserRole, level: 8, xp: 31500, tier: 'gold' as SkillTier },
  { rank: 8, id: '8', name: '임테스터', avatar: null, role: 'dog' as UserRole, level: 8, xp: 30200, tier: 'gold' as SkillTier },
];

const teamRankings = [
  { rank: 1, id: '1', name: '스타트업 드림팀', emblem: '🚀', avgLevel: 10.5, rating: 4.95, projects: 15 },
  { rank: 2, id: '2', name: '웹개발 마스터즈', emblem: '💻', avgLevel: 9.8, rating: 4.9, projects: 12 },
  { rank: 3, id: '3', name: '시큐어 코드', emblem: '🔒', avgLevel: 9.2, rating: 4.85, projects: 10 },
  { rank: 4, id: '4', name: '디자인 팩토리', emblem: '🎨', avgLevel: 8.5, rating: 4.8, projects: 8 },
  { rank: 5, id: '5', name: '풀스택 워리어즈', emblem: '⚔️', avgLevel: 8.2, rating: 4.75, projects: 9 },
];

const roleRankings = {
  horse: userRankings.filter(u => u.role === 'horse'),
  dog: userRankings.filter(u => u.role === 'dog'),
  cat: userRankings.filter(u => u.role === 'cat'),
  rooster: userRankings.filter(u => u.role === 'rooster'),
};

const skillRankings = [
  { skill: 'React', tier: 'gold' as SkillTier, users: 245, topUser: '이프론트' },
  { skill: 'TypeScript', tier: 'gold' as SkillTier, users: 198, topUser: '김개발' },
  { skill: 'Node.js', tier: 'silver' as SkillTier, users: 176, topUser: '정백엔드' },
  { skill: 'Python', tier: 'silver' as SkillTier, users: 165, topUser: '김개발' },
  { skill: 'Figma', tier: 'gold' as SkillTier, users: 134, topUser: '박디자인' },
  { skill: 'AWS', tier: 'silver' as SkillTier, users: 112, topUser: '정백엔드' },
  { skill: 'Security', tier: 'platinum' as SkillTier, users: 89, topUser: '최보안' },
  { skill: 'Docker', tier: 'bronze' as SkillTier, users: 156, topUser: '김개발' },
];

function getTierColor(tier: SkillTier): string {
  const colors = {
    bronze: 'text-tier-bronze',
    silver: 'text-tier-silver',
    gold: 'text-tier-gold',
    platinum: 'text-tier-platinum',
    diamond: 'text-tier-diamond',
  };
  return colors[tier];
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Medal className="w-5 h-5 text-tier-gold" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-tier-silver" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-tier-bronze" />;
  return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
}

export default function Rankings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('horse');

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-secondary" />
            랭킹
          </h1>
          <p className="text-muted-foreground mt-1">브래맨 커뮤니티의 최고 실력자들을 확인하세요</p>
        </div>
      </ScrollReveal>

      {/* Search */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="사용자 또는 팀 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </ScrollReveal>

      {/* Tabs */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="users" className="flex-1 md:flex-none">
              <TrendingUp className="w-4 h-4 mr-2" />
              개인
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex-1 md:flex-none">
              <Users className="w-4 h-4 mr-2" />
              팀
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex-1 md:flex-none">
              🐴
              역할별
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex-1 md:flex-none">
              <Code className="w-4 h-4 mr-2" />
              스킬
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <ScrollReveal animation="fade-up" delay={200}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">전체 랭킹</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userRankings.map((user) => (
                      <div 
                        key={user.id}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                          user.rank <= 3 ? 'bg-muted/30' : ''
                        }`}
                      >
                        <div className="w-8 flex justify-center">
                          {getRankIcon(user.rank)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${ROLES[user.role].gradient} text-primary-foreground`}>
                            {user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{user.name}</span>
                            <RoleBadge role={user.role} size="sm" showName={false} />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Lv.{user.level}</span>
                            <span>•</span>
                            <span className={getTierColor(user.tier)}>{SKILL_TIERS[user.tier].name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{user.xp.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">XP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-6">
            <ScrollReveal animation="fade-up" delay={200}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">팀 랭킹</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teamRankings.map((team) => (
                      <div 
                        key={team.id}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                          team.rank <= 3 ? 'bg-muted/30' : ''
                        }`}
                      >
                        <div className="w-8 flex justify-center">
                          {getRankIcon(team.rank)}
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                          {team.emblem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{team.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>평균 Lv.{team.avgLevel}</span>
                            <span>•</span>
                            <span>⭐ {team.rating}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{team.projects}</p>
                          <p className="text-xs text-muted-foreground">프로젝트</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="mt-6">
            <ScrollReveal animation="fade-up" delay={200}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {(Object.keys(ROLES) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedRole === role 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="text-3xl mb-2">{ROLES[role].icon}</div>
                    <p className="font-medium">{ROLES[role].name}</p>
                    <p className="text-xs text-muted-foreground">{ROLES[role].description}</p>
                  </button>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={250}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <span className="text-2xl">{ROLES[selectedRole].icon}</span>
                    {ROLES[selectedRole].name} 랭킹
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userRankings.filter(u => u.role === selectedRole).map((user, i) => (
                      <div 
                        key={user.id}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                          i < 3 ? 'bg-muted/30' : ''
                        }`}
                      >
                        <div className="w-8 flex justify-center">
                          {getRankIcon(i + 1)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${ROLES[user.role].gradient} text-primary-foreground`}>
                            {user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-sm text-muted-foreground">Lv.{user.level}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{user.xp.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">XP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skillRankings.map((skill, index) => (
                <ScrollReveal key={skill.skill} animation="fade-up" delay={200 + index * 50}>
                  <Card className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <SkillBadge name={skill.skill} tier={skill.tier} size="lg" />
                        <span className="text-sm text-muted-foreground">{skill.users}명</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="w-4 h-4 text-tier-gold" />
                        <span className="text-muted-foreground">1위:</span>
                        <span className="font-medium">{skill.topUser}</span>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </ScrollReveal>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
