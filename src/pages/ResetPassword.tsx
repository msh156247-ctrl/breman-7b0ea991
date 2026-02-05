import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const passwordSchema = z.object({
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  useEffect(() => {
    // URL 해시에서 recovery 토큰 확인
    const checkSession = async () => {
      // URL 해시 파라미터 확인 (Supabase recovery 링크 형식)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // recovery 타입인 경우에만 유효한 비밀번호 재설정 플로우
      if (type === 'recovery' && accessToken) {
        setIsRecoveryFlow(true);
        
        // 토큰으로 세션 설정 (이 시점에서 자동 로그인됨)
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || ''
        });
        
        if (!error) {
          setIsValidSession(true);
        }
      } else {
        // URL에 recovery 토큰이 없으면 기존 세션 확인
        const { data: { session } } = await supabase.auth.getSession();
        
        // 일반 세션으로 접근한 경우 (비밀번호 재설정이 아님)
        if (session && !isRecoveryFlow) {
          // 이미 로그인된 상태에서 접근 - 유효하지 않은 접근
          setIsValidSession(false);
        }
      }
      
      setChecking(false);
    };

    // onAuthStateChange로 recovery 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
        setIsValidSession(true);
        setChecking(false);
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSubmit = async (data: PasswordFormData) => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      if (error.message.includes('same password') || error.message.includes('different from the old')) {
        toast.error('새 비밀번호는 기존 비밀번호와 달라야 합니다.');
      } else {
        toast.error('비밀번호 변경에 실패했습니다: ' + error.message);
      }
    } else {
      // 비밀번호 변경 성공 후 로그아웃
      await supabase.auth.signOut();
      setSuccess(true);
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
            <h1 className="text-xl font-bold mb-4">유효하지 않은 링크입니다</h1>
            <p className="text-muted-foreground mb-6">
              비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full bg-gradient-primary">
                비밀번호 찾기 다시 요청
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-2">비밀번호 변경 완료</h1>
            <p className="text-muted-foreground mb-6">
              새로운 비밀번호로 로그인하실 수 있습니다.
            </p>

            <Button 
              onClick={() => navigate('/auth')}
              className="w-full bg-gradient-primary"
            >
              로그인 페이지로 이동
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-xl">🎵</span>
            </div>
            <span className="font-display font-bold text-2xl">브래맨</span>
          </div>

          <h1 className="text-xl font-bold text-center mb-2">새 비밀번호 설정</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            새로운 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              비밀번호 변경
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
