import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Award, Plus, CheckCircle, Clock, Trash2, Upload, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Certification {
  id: string;
  name: string;
  issuing_organization: string;
  category: string;
  score_bonus: number;
}

interface UserCertification {
  id: string;
  certification_id: string;
  acquired_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  certificate_file_url: string | null;
  is_verified: boolean;
  created_at: string;
  certification: Certification;
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: '기술',
  language: '언어',
  management: '관리/PM',
  design: '디자인',
  security: '보안',
};

const CATEGORY_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  language: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  management: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  design: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  security: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function CertificationManagement() {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [userCertifications, setUserCertifications] = useState<UserCertification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState<string>('');
  const [acquiredDate, setAcquiredDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [certificateNumber, setCertificateNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch all available certifications
      const { data: allCerts, error: certsError } = await supabase
        .from('certifications')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (certsError) throw certsError;
      setCertifications(allCerts || []);

      // Fetch user's certifications
      const { data: userCerts, error: userCertsError } = await supabase
        .from('user_certifications')
        .select(`
          *,
          certification:certifications(*)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (userCertsError) throw userCertsError;
      setUserCertifications(userCerts as UserCertification[] || []);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      toast.error('자격증 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCertification = async () => {
    if (!selectedCertId || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user.id,
          certification_id: selectedCertId,
          acquired_date: acquiredDate || null,
          expiry_date: expiryDate || null,
          certificate_number: certificateNumber || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('이미 등록된 자격증입니다.');
        } else {
          throw error;
        }
        return;
      }

      toast.success('자격증이 등록되었습니다. 관리자 검증 후 점수에 반영됩니다.');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding certification:', error);
      toast.error('자격증 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    if (!confirm('이 자격증을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('user_certifications')
        .delete()
        .eq('id', certId);

      if (error) throw error;

      toast.success('자격증이 삭제되었습니다.');
      fetchData();
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast.error('자격증 삭제에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setSelectedCertId('');
    setAcquiredDate('');
    setExpiryDate('');
    setCertificateNumber('');
  };

  // Filter out already registered certifications
  const availableCertifications = certifications.filter(
    cert => !userCertifications.some(uc => uc.certification_id === cert.id)
  );

  // Group available certifications by category
  const groupedCertifications = availableCertifications.reduce((acc, cert) => {
    const category = cert.category || 'technical';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cert);
    return acc;
  }, {} as Record<string, Certification[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            자격증
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              자격증
            </CardTitle>
            <CardDescription>
              공인 자격증을 등록하면 검증 후 레벨 점수에 반영됩니다
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>자격증 등록</DialogTitle>
                <DialogDescription>
                  보유한 자격증을 선택하고 정보를 입력해주세요
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>자격증 선택</Label>
                  <Select value={selectedCertId} onValueChange={setSelectedCertId}>
                    <SelectTrigger>
                      <SelectValue placeholder="자격증을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(groupedCertifications).map(([category, certs]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {CATEGORY_LABELS[category] || category}
                          </div>
                          {certs.map(cert => (
                            <SelectItem key={cert.id} value={cert.id}>
                              <div className="flex items-center gap-2">
                                <span>{cert.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  (+{cert.score_bonus}점)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>취득일</Label>
                  <Input
                    type="date"
                    value={acquiredDate}
                    onChange={(e) => setAcquiredDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>만료일 (해당시)</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>자격증 번호</Label>
                  <Input
                    placeholder="자격증 번호를 입력하세요"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button 
                  onClick={handleAddCertification} 
                  disabled={!selectedCertId || isSubmitting}
                >
                  {isSubmitting ? '등록 중...' : '등록하기'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {userCertifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>등록된 자격증이 없습니다</p>
            <p className="text-sm">자격증을 등록하면 레벨 점수가 올라갑니다!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userCertifications.map((uc) => (
              <div
                key={uc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{uc.certification.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={CATEGORY_COLORS[uc.certification.category] || ''}
                    >
                      {CATEGORY_LABELS[uc.certification.category] || uc.certification.category}
                    </Badge>
                    {uc.is_verified ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        검증완료
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        검증대기
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3">
                    <span>{uc.certification.issuing_organization}</span>
                    {uc.acquired_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(uc.acquired_date), 'yyyy.MM.dd', { locale: ko })}
                      </span>
                    )}
                    {uc.is_verified && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        +{uc.certification.score_bonus}점
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteCertification(uc.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
