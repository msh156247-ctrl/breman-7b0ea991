import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Users, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROLES, type UserRole } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Sample data
const teamsData = [
  {
    id: '1',
    name: '스타트업 드림팀',
    slogan: '혁신으로 세상을 바꾸다',
    emblem: '🚀',
    avgLevel: 4.2,
    rating: 4.8,
    status: 'recruiting',
    roles: [
      { role: 'horse' as UserRole, filled: true },
      { role: 'dog' as UserRole, filled: true },
      { role: 'cat' as UserRole, filled: false },
      { role: 'rooster' as UserRole, filled: true },
    ],
    skills: ['React', 'Node.js', 'AWS'],
    members: 3,
    openPositions: 1,
  },
  {
    id: '2',
    name: '웹개발 마스터즈',
    slogan: '최고의 웹 경험을 만듭니다',
    emblem: '💻',
    avgLevel: 5.1,
    rating: 4.9,
    status: 'active',
    roles: [
      { role: 'horse' as UserRole, filled: true },
      { role: 'dog' as UserRole, filled: true },
      { role: 'cat' as UserRole, filled: true },
      { role: 'rooster' as UserRole, filled: true },
    ],
    skills: ['Vue.js', 'Python', 'PostgreSQL'],
    members: 4,
    openPositions: 0,
  },
  {
    id: '3',
    name: '디자인 팩토리',
    slogan: '아름다움은 기능이다',
    emblem: '🎨',
    avgLevel: 3.8,
    rating: 4.6,
    status: 'recruiting',
    roles: [
      { role: 'horse' as UserRole, filled: true },
      { role: 'cat' as UserRole, filled: true },
      { role: 'rooster' as UserRole, filled: false },
    ],
    skills: ['Figma', 'React', 'Tailwind'],
    members: 2,
    openPositions: 1,
  },
  {
    id: '4',
    name: '시큐어 코드',
    slogan: '안전한 코드가 좋은 코드',
    emblem: '🔒',
    avgLevel: 6.0,
    rating: 4.95,
    status: 'recruiting',
    roles: [
      { role: 'horse' as UserRole, filled: true },
      { role: 'dog' as UserRole, filled: true },
      { role: 'dog' as UserRole, filled: false },
      { role: 'rooster' as UserRole, filled: true },
    ],
    skills: ['Security', 'Penetration Testing', 'Go'],
    members: 3,
    openPositions: 1,
  },
];

export default function Teams() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTeams = teamsData.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || 
      team.roles.some(r => r.role === roleFilter && !r.filled);
    
    const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">팀</h1>
          <p className="text-muted-foreground mt-1">함께할 팀을 찾거나 새로운 팀을 만들어보세요</p>
        </div>
        <Link to="/teams/create">
          <Button className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            팀 만들기
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="팀 이름 또는 기술 스택 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="필요 역할" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 역할</SelectItem>
            {Object.entries(ROLES).map(([key, role]) => (
              <SelectItem key={key} value={key}>
                {role.icon} {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="recruiting">모집중</SelectItem>
            <SelectItem value="active">활동중</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Link key={team.id} to={`/teams/${team.id}`}>
            <Card className="h-full hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl flex-shrink-0">
                    {team.emblem}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold truncate">{team.name}</h3>
                      {team.status === 'recruiting' && (
                        <StatusBadge status="모집중" variant="success" size="sm" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{team.slogan}</p>
                  </div>
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {team.roles.map((r, i) => (
                    <div 
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                        r.filled 
                          ? 'bg-muted' 
                          : 'bg-primary/10 border-2 border-dashed border-primary/30'
                      }`}
                      title={`${ROLES[r.role].name} ${r.filled ? '(충원됨)' : '(모집중)'}`}
                    >
                      {ROLES[r.role].icon}
                    </div>
                  ))}
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {team.skills.slice(0, 3).map((skill) => (
                    <span 
                      key={skill}
                      className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                  {team.skills.length > 3 && (
                    <span className="text-xs px-2 py-1 text-muted-foreground">
                      +{team.skills.length - 3}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{team.members}명</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Star className="w-4 h-4 text-secondary" />
                      <span>{team.rating}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    평균 Lv.{team.avgLevel}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
          <p className="text-muted-foreground mb-4">다른 조건으로 검색해보세요</p>
          <Link to="/teams/create">
            <Button>새 팀 만들기</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
