import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ROLES, type UserRole } from '@/lib/constants';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

interface Question {
  id: number;
  question: string;
  options: {
    text: string;
    scores: Record<UserRole, number>;
  }[];
}

const questions: Question[] = [
  {
    id: 1,
    question: '팀 프로젝트에서 가장 먼저 하고 싶은 일은?',
    options: [
      { text: '전체 일정과 구조를 계획한다', scores: { horse: 3, dog: 1, cat: 0, rooster: 1 } },
      { text: '품질 기준과 체크리스트를 만든다', scores: { horse: 1, dog: 3, cat: 0, rooster: 1 } },
      { text: '사용자 경험과 디자인을 구상한다', scores: { horse: 0, dog: 0, cat: 3, rooster: 2 } },
      { text: '빠르게 프로토타입을 만들어본다', scores: { horse: 1, dog: 1, cat: 1, rooster: 3 } },
    ],
  },
  {
    id: 2,
    question: '문제가 발생했을 때 당신의 접근 방식은?',
    options: [
      { text: '근본 원인을 찾아 시스템적으로 해결한다', scores: { horse: 3, dog: 2, cat: 0, rooster: 0 } },
      { text: '꼼꼼히 테스트하며 버그를 하나씩 잡는다', scores: { horse: 1, dog: 3, cat: 0, rooster: 1 } },
      { text: '사용자 관점에서 더 나은 대안을 찾는다', scores: { horse: 0, dog: 1, cat: 3, rooster: 1 } },
      { text: '일단 빠르게 수정하고 결과를 확인한다', scores: { horse: 0, dog: 1, cat: 1, rooster: 3 } },
    ],
  },
  {
    id: 3,
    question: '가장 보람을 느끼는 순간은?',
    options: [
      { text: '팀이 목표를 달성했을 때', scores: { horse: 3, dog: 1, cat: 1, rooster: 1 } },
      { text: '안정적이고 신뢰할 수 있는 결과물을 만들었을 때', scores: { horse: 1, dog: 3, cat: 1, rooster: 1 } },
      { text: '사용자가 만족하며 제품을 사용할 때', scores: { horse: 1, dog: 1, cat: 3, rooster: 1 } },
      { text: '멋진 인터랙션이 화면에 구현되었을 때', scores: { horse: 0, dog: 0, cat: 2, rooster: 3 } },
    ],
  },
  {
    id: 4,
    question: '새로운 기술을 배울 때 중요하게 생각하는 것은?',
    options: [
      { text: '확장성과 아키텍처적 장점', scores: { horse: 3, dog: 1, cat: 0, rooster: 1 } },
      { text: '보안성과 안정성', scores: { horse: 1, dog: 3, cat: 0, rooster: 1 } },
      { text: '사용자 경험 개선 가능성', scores: { horse: 0, dog: 0, cat: 3, rooster: 2 } },
      { text: '성능과 구현 효율성', scores: { horse: 1, dog: 1, cat: 1, rooster: 3 } },
    ],
  },
  {
    id: 5,
    question: '협업에서 당신의 강점은?',
    options: [
      { text: '의사결정과 방향 제시', scores: { horse: 3, dog: 1, cat: 0, rooster: 1 } },
      { text: '꼼꼼한 검토와 피드백', scores: { horse: 1, dog: 3, cat: 1, rooster: 0 } },
      { text: '창의적인 아이디어 제안', scores: { horse: 0, dog: 0, cat: 3, rooster: 2 } },
      { text: '빠른 구현과 시각화', scores: { horse: 1, dog: 0, cat: 2, rooster: 3 } },
    ],
  },
  {
    id: 6,
    question: '업무 스타일을 한 단어로 표현한다면?',
    options: [
      { text: '체계적', scores: { horse: 3, dog: 2, cat: 0, rooster: 0 } },
      { text: '신중함', scores: { horse: 1, dog: 3, cat: 1, rooster: 0 } },
      { text: '감각적', scores: { horse: 0, dog: 0, cat: 3, rooster: 1 } },
      { text: '신속함', scores: { horse: 0, dog: 0, cat: 1, rooster: 3 } },
    ],
  },
  {
    id: 7,
    question: '가장 관심있는 분야는?',
    options: [
      { text: '시스템 설계와 데이터 흐름', scores: { horse: 3, dog: 1, cat: 0, rooster: 1 } },
      { text: '보안과 품질 관리', scores: { horse: 1, dog: 3, cat: 0, rooster: 0 } },
      { text: '디자인과 사용자 심리', scores: { horse: 0, dog: 0, cat: 3, rooster: 1 } },
      { text: '인터랙션과 애니메이션', scores: { horse: 0, dog: 0, cat: 2, rooster: 3 } },
    ],
  },
  {
    id: 8,
    question: '스트레스를 받을 때의 반응은?',
    options: [
      { text: '상황을 정리하고 우선순위를 재설정한다', scores: { horse: 3, dog: 1, cat: 0, rooster: 1 } },
      { text: '하나씩 체크하며 누락된 것이 없는지 확인한다', scores: { horse: 1, dog: 3, cat: 0, rooster: 1 } },
      { text: '한 발 물러서서 전체적인 그림을 다시 본다', scores: { horse: 1, dog: 1, cat: 3, rooster: 0 } },
      { text: '일단 손을 움직여 무언가를 만든다', scores: { horse: 0, dog: 0, cat: 1, rooster: 3 } },
    ],
  },
];

function calculateResult(answers: number[]): UserRole {
  const scores: Record<UserRole, number> = { horse: 0, dog: 0, cat: 0, rooster: 0 };
  
  answers.forEach((answerIndex, questionIndex) => {
    if (answerIndex >= 0) {
      const option = questions[questionIndex].options[answerIndex];
      (Object.keys(option.scores) as UserRole[]).forEach((role) => {
        scores[role] += option.scores[role];
      });
    }
  });
  
  return (Object.entries(scores) as [UserRole, number][]).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0];
}

function getScorePercentages(answers: number[]): Record<UserRole, number> {
  const scores: Record<UserRole, number> = { horse: 0, dog: 0, cat: 0, rooster: 0 };
  
  answers.forEach((answerIndex, questionIndex) => {
    if (answerIndex >= 0) {
      const option = questions[questionIndex].options[answerIndex];
      (Object.keys(option.scores) as UserRole[]).forEach((role) => {
        scores[role] += option.scores[role];
      });
    }
  });
  
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentages: Record<UserRole, number> = { horse: 0, dog: 0, cat: 0, rooster: 0 };
  
  (Object.keys(scores) as UserRole[]).forEach((role) => {
    percentages[role] = total > 0 ? Math.round((scores[role] / total) * 100) : 0;
  });
  
  return percentages;
}

export default function RoleQuiz() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const handleNext = () => {
    if (selectedOption === null) return;
    
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedOption;
    setAnswers(newAnswers);
    setSelectedOption(null);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedOption(answers[currentQuestion - 1]);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers(new Array(questions.length).fill(-1));
    setShowResult(false);
    setSelectedOption(null);
  };

  const resultRole = calculateResult(answers);
  const roleInfo = ROLES[resultRole];
  const percentages = getScorePercentages(answers);

  if (showResult) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-lg">🎵</span>
            </div>
            <span className="font-display font-bold text-lg">브래맨</span>
          </Link>
          <ThemeToggle />
        </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <ScrollReveal animation="fade-up">
            <div className="max-w-2xl mx-auto text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">퀴즈 완료!</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
                당신에게 어울리는 역할은
              </h1>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="scale" delay={200}>
            <Card className="max-w-2xl mx-auto border-2 border-primary/20 overflow-hidden">
              <div className={`bg-gradient-to-br ${roleInfo.gradient} p-8 text-primary-foreground text-center`}>
                <div className="text-7xl mb-4">{roleInfo.icon}</div>
                <h2 className="text-4xl font-display font-bold mb-2">{roleInfo.name}</h2>
                <p className="text-xl opacity-90">{roleInfo.title}</p>
              </div>
              <CardContent className="p-8">
                <p className="text-lg text-center text-muted-foreground mb-8">
                  {roleInfo.description}
                </p>

                <div className="space-y-4 mb-8">
                  <h3 className="font-display font-bold text-lg">핵심 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {roleInfo.keywords.map((keyword) => (
                      <span 
                        key={keyword}
                        className={`px-4 py-2 rounded-full bg-gradient-to-r ${roleInfo.gradient} text-primary-foreground text-sm font-medium`}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="font-display font-bold text-lg">역할 적합도</h3>
                  <div className="space-y-3">
                    {(Object.keys(ROLES) as UserRole[]).map((role) => (
                      <div key={role} className="flex items-center gap-3">
                        <span className="text-2xl w-8">{ROLES[role].icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{ROLES[role].name}</span>
                            <span className="text-muted-foreground">{percentages[role]}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                role === resultRole ? "bg-gradient-to-r from-primary to-accent" : "bg-muted-foreground/30"
                              )}
                              style={{ width: `${percentages[role]}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleRestart}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    다시 테스트하기
                  </Button>
                  <Link to="/roles" className="flex-1">
                    <Button className="w-full bg-gradient-primary">
                      역할 더 알아보기
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </main>
        
        <BackToTop />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-lg">🎵</span>
            </div>
            <span className="font-display font-bold text-lg">브래맨</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/roles">
              <Button variant="ghost" size="sm">
                역할 소개 보기
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <ScrollReveal animation="fade-up">
            <div className="mb-8">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>질문 {currentQuestion + 1} / {questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </ScrollReveal>

          {/* Question */}
          <ScrollReveal animation="fade-up" delay={100}>
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-display font-bold">
                {questions[currentQuestion].question}
              </h1>
            </div>
          </ScrollReveal>

          {/* Options */}
          <div className="space-y-4 mb-8">
            {questions[currentQuestion].options.map((option, index) => (
              <ScrollReveal key={index} animation="fade-up" delay={150 + index * 50}>
                <button
                  onClick={() => handleSelectOption(index)}
                  className={cn(
                    "w-full p-5 rounded-xl border-2 text-left transition-all duration-200",
                    selectedOption === index
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedOption === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}>
                      {selectedOption === index && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <span className="text-lg">{option.text}</span>
                  </div>
                </button>
              </ScrollReveal>
            ))}
          </div>

          {/* Navigation */}
          <ScrollReveal animation="fade-up" delay={400}>
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="flex-1 sm:flex-none"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedOption === null}
                className="flex-1 sm:flex-none bg-gradient-primary"
              >
                {currentQuestion === questions.length - 1 ? '결과 보기' : '다음'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </main>
      
      <BackToTop />
    </div>
  );
}
