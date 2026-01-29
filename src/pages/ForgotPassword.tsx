import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const emailSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = async (data: EmailFormData) => {
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error('비밀번호 재설정 메일 발송에 실패했습니다.');
    } else {
      setSentEmail(data.email);
      setEmailSent(true);
    }
    
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-2">이메일을 확인해주세요</h1>
            <p className="text-muted-foreground mb-6">
              <span className="font-medium text-foreground">{sentEmail}</span>
              <br />
              위 주소로 비밀번호 재설정 링크를 발송했습니다.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground mb-1">링크를 클릭해주세요</p>
                  <p>메일의 링크를 클릭하면 새 비밀번호를 설정할 수 있습니다.</p>
                </div>
              </div>
            </div>

            <Link to="/auth">
              <Button className="w-full bg-gradient-primary">
                로그인 페이지로 이동
              </Button>
            </Link>

            <p className="mt-4 text-xs text-muted-foreground">
              메일이 도착하지 않았나요? 스팸함을 확인해보세요.
            </p>
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
        <Link 
          to="/auth" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          로그인으로 돌아가기
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-xl">🎵</span>
            </div>
            <span className="font-display font-bold text-2xl">브래맨</span>
          </div>

          <h1 className="text-xl font-bold text-center mb-2">비밀번호 찾기</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            가입하신 이메일 주소를 입력하시면<br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              비밀번호 재설정 메일 발송
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
