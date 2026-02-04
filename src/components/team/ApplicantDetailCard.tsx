import { useState } from 'react';
import { Check, X, Loader2, Calendar, CheckCircle2, XCircle, AlertCircle, FileText, Briefcase, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface RequiredSkillLevel {
  skillName: string;
  minLevel: number;
}

interface RoleSlot {
  id: string;
  role_type: RoleType | null;
  min_level: number;
  required_skill_levels: RequiredSkillLevel[];
}

interface UserSkill {
  skill_name: string;
  level: number;
}

interface SkillExperience {
  id: string;
  skill_name: string;
  title: string;
  description: string | null;
  xp_earned: number;
}

interface FitScore {
  score: number;
  levelMet: boolean;
  skillsMatched: number;
  skillsTotal: number;
  details: { skillName: string; required: number; userLevel: number | null; met: boolean }[];
}

interface Application {
  id: string;
  user_id: string;
  desired_role: string;
  role_type: RoleType | null;
  intro: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  attachments: string[] | null;
  answers_json: Record<string, string> | null;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
    level: number;
    bio: string | null;
  };
  userSkills: UserSkill[];
  skillExperiences: SkillExperience[];
  matchedSlot: RoleSlot | null;
  fitScore: FitScore | null;
}

interface ApplicantDetailCardProps {
  application: Application;
  processingId: string | null;
  onAccept: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  isPending?: boolean;
}

export function ApplicantDetailCard({ 
  application, 
  processingId, 
  onAccept, 
  onReject,
  isPending = true 
}: ApplicantDetailCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Group skill experiences by skill name
  const experiencesBySkill = application.skillExperiences.reduce<Record<string, SkillExperience[]>>((acc, exp) => {
    if (!acc[exp.skill_name]) {
      acc[exp.skill_name] = [];
    }
    acc[exp.skill_name].push(exp);
    return acc;
  }, {});

  const hasExperiences = application.skillExperiences.length > 0;
  const hasAttachments = application.attachments && application.attachments.length > 0;
  const hasAnswers = application.answers_json && Object.keys(application.answers_json).length > 0;

  return (
    <Card className={isPending ? "border-primary/30" : "bg-muted/30"}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Applicant info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg overflow-hidden shrink-0">
              {application.user.avatar_url ? (
                <img 
                  src={application.user.avatar_url} 
                  alt={application.user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                application.user.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{application.user.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                  Lv.{application.user.level}
                </span>
                {/* Fit Score Badge */}
                {application.fitScore && (
                  <Badge 
                    variant="outline"
                    className={`text-xs gap-1 ${
                      application.fitScore.score >= 80 
                        ? "bg-green-500/10 text-green-700 border-green-500/30" 
                        : application.fitScore.score >= 50 
                        ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                        : "bg-red-500/10 text-red-700 border-red-500/30"
                    }`}
                  >
                    {application.fitScore.score >= 80 ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : application.fitScore.score >= 50 ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    적합도 {application.fitScore.score}%
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>
                  {application.role_type 
                    ? `${ROLE_TYPES[application.role_type]?.icon || ''} ${ROLE_TYPES[application.role_type]?.name || application.role_type}`
                    : application.desired_role
                  }
                </span>
                <span>•</span>
                <Calendar className="w-3 h-3" />
                <span>{new Date(application.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </div>

          {/* Actions (only for pending) */}
          {isPending && (
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={processingId === application.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    거절
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>지원 거절</AlertDialogTitle>
                    <AlertDialogDescription>
                      {application.user.name}님의 지원을 거절하시겠습니까?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onReject(application.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      거절하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button 
                size="sm"
                className="bg-gradient-to-r from-success to-emerald-400 text-white"
                onClick={() => onAccept(application.id)}
                disabled={processingId === application.id}
              >
                {processingId === application.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                수락
              </Button>
            </div>
          )}
        </div>

        {/* User Bio */}
        {application.user.bio && (
          <div className="mt-3 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">자기소개:</span> {application.user.bio}
          </div>
        )}

        {/* Intro */}
        {application.intro && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
            <span className="font-medium">지원 동기:</span> {application.intro}
          </div>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="mt-3">
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              첨부파일 ({application.attachments!.length}개)
            </p>
            <div className="flex flex-wrap gap-2">
              {application.attachments!.map((url, idx) => {
                const fileName = url.split('/').pop() || `파일 ${idx + 1}`;
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {fileName.length > 20 ? fileName.slice(0, 20) + '...' : fileName}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Answers */}
        {hasAnswers && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium">추가 응답:</p>
            <div className="space-y-2">
              {Object.entries(application.answers_json!).map(([question, answer], idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/30 text-sm">
                  <p className="font-medium text-muted-foreground">{question}</p>
                  <p className="mt-1">{answer || <span className="text-muted-foreground italic">응답 없음</span>}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applicant's Skills with Experience Details */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen} className="mt-4">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4" />
                <span className="text-sm font-medium">스킬 및 경력 상세</span>
                {application.fitScore && (
                  <>
                    <Progress 
                      value={application.fitScore.score} 
                      className={`w-24 h-2 ${
                        application.fitScore.score >= 80 
                          ? "[&>div]:bg-green-500" 
                          : application.fitScore.score >= 50 
                          ? "[&>div]:bg-yellow-500"
                          : "[&>div]:bg-red-500"
                      }`}
                    />
                    <span className={`text-sm font-bold ${
                      application.fitScore.score >= 80 
                        ? "text-green-600" 
                        : application.fitScore.score >= 50 
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}>
                      {application.fitScore.score}%
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {isDetailsOpen ? '접기' : '펼치기'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-4 rounded-lg border bg-background space-y-4">
              {/* Level Requirement */}
              {application.fitScore && application.matchedSlot && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">최소 레벨</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      요구: Lv.{application.matchedSlot.min_level}
                    </Badge>
                    <span className="text-xs">→</span>
                    <Badge variant="outline" className="text-xs">
                      지원자: Lv.{application.user.level}
                    </Badge>
                    {application.fitScore.levelMet ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              )}

              {/* Skill Requirements with Experience Details */}
              {application.fitScore && application.fitScore.details.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">필요 스킬 및 경력</span>
                    <span className="text-xs text-muted-foreground">
                      {application.fitScore.skillsMatched}/{application.fitScore.skillsTotal} 충족
                    </span>
                  </div>
                  <div className="space-y-3">
                    {application.fitScore.details.map((detail, idx) => {
                      const skillExps = experiencesBySkill[detail.skillName] || [];
                      return (
                        <div key={idx} className="rounded-lg border overflow-hidden">
                          {/* Skill Header */}
                          <div 
                            className={`flex items-center justify-between p-3 text-sm ${
                              detail.met ? "bg-green-500/10" : "bg-red-500/10"
                            }`}
                          >
                            <span className="font-medium">{detail.skillName}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                요구: Lv.{detail.required}
                              </Badge>
                              <span className="text-xs">→</span>
                              <Badge 
                                variant={detail.userLevel !== null ? "outline" : "destructive"} 
                                className="text-xs"
                              >
                                {detail.userLevel !== null ? `Lv.${detail.userLevel}` : "미보유"}
                              </Badge>
                              {detail.met ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </div>
                          {/* Skill Experience Details */}
                          <div className="p-3 bg-background">
                            {skillExps.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">관련 경력:</p>
                                {skillExps.map((exp) => (
                                  <div key={exp.id} className="pl-3 border-l-2 border-primary/30">
                                    <p className="text-sm font-medium">{exp.title}</p>
                                    {exp.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{exp.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                이 스킬에 대한 경력 정보가 없습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  이 포지션은 특별한 스킬 요구사항이 없습니다.
                </p>
              )}

              <Separator />

              {/* All Other Skills & Experiences */}
              <div className="space-y-3">
                <p className="text-sm font-medium">보유 스킬 전체</p>
                {application.userSkills.length > 0 ? (
                  <div className="space-y-3">
                    {application.userSkills.map((skill, idx) => {
                      const skillExps = experiencesBySkill[skill.skill_name] || [];
                      return (
                        <div key={idx} className="rounded-lg border overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-muted/30">
                            <span className="text-sm font-medium">{skill.skill_name}</span>
                            <Badge variant="outline" className="text-xs">Lv.{skill.level}</Badge>
                          </div>
                          <div className="p-3 bg-background">
                            {skillExps.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">관련 경력:</p>
                                {skillExps.map((exp) => (
                                  <div key={exp.id} className="pl-3 border-l-2 border-primary/30">
                                    <p className="text-sm font-medium">{exp.title}</p>
                                    {exp.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{exp.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                이 스킬에 대한 경력 정보가 없습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-2">
                    등록된 스킬이 없습니다.
                  </p>
                )}
              </div>

              {/* Overall Experience Summary (not tied to specific skills) */}
              {!hasExperiences && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm text-yellow-700">
                    ⚠️ 이 지원자는 아직 스킬 경력 정보를 등록하지 않았습니다.
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
