import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Search, Shield, ShieldCheck, ShieldX, Loader2, UserCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  level: number;
  user_type: string | null;
  verified: boolean;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchUserRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('사용자 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error) throw error;

      const rolesMap: Record<string, string[]> = {};
      (data || []).forEach((ur: UserRole) => {
        if (!rolesMap[ur.user_id]) {
          rolesMap[ur.user_id] = [];
        }
        rolesMap[ur.user_id].push(ur.role);
      });
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role if not 'user' (user is default, no entry needed)
      if (newRole !== 'user') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as 'admin' | 'moderator' });

        if (error) throw error;
      }

      // Update local state
      if (newRole === 'user') {
        const newRoles = { ...userRoles };
        delete newRoles[userId];
        setUserRoles(newRoles);
      } else {
        setUserRoles({ ...userRoles, [userId]: [newRole] });
      }

      toast.success('사용자 역할이 변경되었습니다');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('역할 변경에 실패했습니다');
    } finally {
      setUpdating(null);
    }
  };

  const handleVerifyUser = async (userId: string, verified: boolean) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verified })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, verified } : u));
      toast.success(verified ? '사용자가 인증되었습니다' : '사용자 인증이 해제되었습니다');
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('인증 상태 변경에 실패했습니다');
    } finally {
      setUpdating(null);
    }
  };

  const getUserRole = (userId: string): string => {
    const roles = userRoles[userId];
    if (roles?.includes('admin')) return 'admin';
    if (roles?.includes('moderator')) return 'moderator';
    return 'user';
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-500 border-red-500/20',
    moderator: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    user: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  const roleLabels: Record<string, string> = {
    admin: '관리자',
    moderator: '모더레이터',
    user: '일반 사용자',
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            사용자 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          사용자 관리
        </CardTitle>
        <CardDescription>
          총 {users.length}명의 사용자가 등록되어 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사용자</TableHead>
                <TableHead>레벨</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>인증</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const role = getUserRole(user.id);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Lv.{user.level}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[role]}>
                        {role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {roleLabels[role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.verified ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <UserCheck className="w-3 h-3 mr-1" />
                          인증됨
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
                          미인증
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updating === user.id}
                        >
                          <SelectTrigger className="w-32">
                            {updating === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">일반 사용자</SelectItem>
                            <SelectItem value="moderator">모더레이터</SelectItem>
                            <SelectItem value="admin">관리자</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerifyUser(user.id, !user.verified)}
                          disabled={updating === user.id}
                        >
                          {user.verified ? (
                            <ShieldX className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            검색 결과가 없습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}
