# 브래맨 추천 시스템 스펙

> 브래맨 추천 시스템은 프로필/팀/프로젝트 세팅 값을 기반으로 모든 추천 점수를 **단일 로직**으로 계산한다.

---

## 1. 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **단일 로직** | 모든 추천은 동일한 점수 계산 함수 사용 |
| **투명성** | 사용자에게 매칭 점수와 근거 표시 |
| **전문성 우선** | 기술 > 경험 > 성향 순 가중치 |

---

## 2. 추천 노출 지점 (3곳만)

| 화면 | 경로 | 추천 대상 | 용도 |
|------|------|----------|------|
| **대시보드** | `/dashboard` | 팀 → 사용자 | "나에게 맞는 팀" 위젯 |
| **팀 지원** | `/teams/join/:teamId` | 슬롯 → 사용자 | 슬롯별 적합도 점수 |
| **프로젝트 제안** | `/projects/:projectId` | 팀 → 프로젝트 | 클라이언트에게 팀 추천 |

> ⚠️ 위 3곳 외에는 **검색 + 정렬**로 처리 (추천 아님)

---

## 3. 점수 계산 공식

### 3.1 기본 가중치

```
총점 = 기술 매칭(60%) + 레벨 충족(20%) + 성향 궁합(20%)
```

| 요소 | 비중 | 설명 |
|------|------|------|
| **기술 매칭** | 60% | 요구 스킬 보유 여부 + 레벨 충족도 |
| **레벨 충족** | 20% | 최소 레벨 요구사항 충족 여부 |
| **성향 궁합** | 20% | Animal Skin 일치 (선호 성향 설정 시) |

### 3.2 기술 매칭 상세 (60점 만점)

```typescript
function calculateSkillScore(
  requiredSkills: RequiredSkill[], 
  userSkills: UserSkill[]
): number {
  if (requiredSkills.length === 0) return 60; // 요구 없으면 만점
  
  let totalScore = 0;
  const perSkillMax = 60 / requiredSkills.length;
  
  for (const required of requiredSkills) {
    const userSkill = userSkills.find(s => s.name === required.name);
    
    if (!userSkill) {
      totalScore += 0; // 미보유
    } else if (userSkill.level >= required.minLevel) {
      totalScore += perSkillMax; // 충족
    } else {
      // 부분 충족: 보유 레벨 / 요구 레벨 비율
      totalScore += perSkillMax * (userSkill.level / required.minLevel);
    }
  }
  
  return Math.round(totalScore);
}
```

### 3.3 레벨 충족 상세 (20점 만점)

```typescript
function calculateLevelScore(
  minLevel: number, 
  userLevel: number
): number {
  if (userLevel >= minLevel) return 20;
  if (userLevel >= minLevel - 1) return 10; // 1레벨 차이
  return 0;
}
```

### 3.4 성향 궁합 상세 (20점 만점)

```typescript
function calculatePersonalityScore(
  preferredSkin: AnimalSkin | null, 
  userSkin: AnimalSkin
): number {
  if (!preferredSkin) return 20; // 선호 미지정 = 만점
  if (preferredSkin === userSkin) return 20; // 일치
  return 10; // 불일치 (감점하되 0점 아님)
}
```

### 3.5 통합 계산 함수

```typescript
interface FitScoreResult {
  total: number;        // 0-100
  breakdown: {
    skill: number;      // 0-60
    level: number;      // 0-20
    personality: number; // 0-20
  };
  matchedSkills: string[];
  missingSkills: string[];
}

function calculateFitScore(
  slot: TeamRoleSlot,
  userProfile: Profile,
  userSkills: UserSkill[]
): FitScoreResult {
  const skillScore = calculateSkillScore(
    slot.required_skill_levels, 
    userSkills
  );
  
  const levelScore = calculateLevelScore(
    slot.min_level, 
    userProfile.level
  );
  
  const personalityScore = calculatePersonalityScore(
    slot.preferred_animal_skin, 
    userProfile.animal_skin
  );
  
  return {
    total: skillScore + levelScore + personalityScore,
    breakdown: {
      skill: skillScore,
      level: levelScore,
      personality: personalityScore
    },
    matchedSkills: /* 매칭된 스킬 목록 */,
    missingSkills: /* 미보유 스킬 목록 */
  };
}
```

---

## 4. 화면별 적용

### 4.1 대시보드 - "나에게 맞는 팀"

**입력**
- 사용자: `main_role_type`, `sub_role_types`, `animal_skin`, `level`, `user_skills`
- 팀: 모집 중인 `team_role_slots`

**로직**
1. 모집 중인 모든 팀의 열린 슬롯 조회
2. 사용자 프로필로 각 슬롯별 `calculateFitScore` 실행
3. 팀당 최고 점수 슬롯 기준 정렬
4. 상위 5개 팀 노출

**UI 표현**
```
[팀 카드]
├── 팀명, 엠블럼
├── 적합도 85점 ⭐
├── 매칭 포지션: 백엔드 개발
└── "React, Node.js 보유" 
```

### 4.2 팀 지원 - 슬롯별 적합도

**입력**
- 사용자 프로필 + 스킬
- 해당 팀의 모든 열린 슬롯

**로직**
1. 각 슬롯에 대해 `calculateFitScore` 실행
2. 점수 높은 순 정렬
3. 최고 점수 슬롯 자동 선택 (pre-select)

**UI 표현**
```
[슬롯 선택]
○ 백엔드 개발 (92점) ← 추천
  ├── 기술 56/60 | 레벨 20/20 | 성향 16/20
  └── ✅ React, Node.js | ❌ Docker
  
○ 프론트엔드 (78점)
  └── ...
```

### 4.3 프로젝트 제안 - 팀 추천

**입력**
- 프로젝트: `required_skills`, `required_roles`, `budget_range`
- 팀: `avg_level`, `rating_avg`, 멤버들의 스킬 통합

**로직**
1. 모집 완료된 활성 팀 조회
2. 팀 멤버 스킬 통합 → 프로젝트 요구사항 매칭
3. 추가 가중치: 평점(+10), 완료 프로젝트 수(+5/건)
4. 상위 팀 목록 제공

**UI 표현**
```
[추천 팀]
├── 1위: 팀A (95점) ⭐ Best Match
│   └── 평점 4.8 | 완료 12건 | 평균 Lv.4
├── 2위: 팀B (87점)
└── 3위: 팀C (82점)
```

---

## 5. 점수 등급 표시

| 점수 | 등급 | 색상 | 설명 |
|------|------|------|------|
| 90-100 | ⭐ Best | `text-yellow-500` | 최적 매칭 |
| 70-89 | 👍 Good | `text-green-500` | 좋은 매칭 |
| 50-69 | 🔵 Fair | `text-blue-500` | 보통 |
| 0-49 | ⚪ Low | `text-muted-foreground` | 부적합 |

---

## 6. 성향(Animal Skin) 사용 규칙

> **브레맨 성향은 협업 궁합 판단에만 사용되며, 업무 요구사항에는 포함되지 않는다.**

### 6.1 노출 위치

| 위치 | 노출 | 용도 |
|------|------|------|
| 프로필 헤더 | ✅ | 본인 성향 표시/수정 |
| 팀 모집 슬롯 | ✅ | "선호 성향" (선택사항) |
| 팀 상세 멤버 | ✅ | 멤버 성향 표시 |
| 추천 점수 | ✅ | 성향 궁합 20% 반영 |
| 프로젝트 생성 | ❌ | 제외 |
| 프로젝트 상세 | ❌ | 제외 |

### 6.2 성향 정의

| 성향 | 아이콘 | 키워드 | 협업 스타일 |
|------|--------|--------|------------|
| 말 (Horse) | 🐴 | 리더십, 추진력 | 프로젝트 주도, 의사결정 |
| 개 (Dog) | 🐕 | 충성, 협력 | 팀 서포트, 조율 |
| 고양이 (Cat) | 🐱 | 독립, 전문성 | 개인 작업, 깊은 집중 |
| 닭 (Rooster) | 🐓 | 소통, 활기 | 분위기 메이킹, 피드백 |

---

## 7. 레벨 계산 공식

> **직무 레벨은 기술 숙련도(60%)와 실제 프로젝트 경험(40%)을 기준으로 계산되며, 자격증·포트폴리오·팀 평가를 통해 보정된다.**

```typescript
function calculateUserLevel(profile: Profile): number {
  const baseScore = 
    (profile.skill_score * 0.6) +      // 기술 숙련도
    (profile.experience_score * 0.4);   // 프로젝트 경험
  
  const bonusScore = 
    (profile.certification_bonus || 0) + // 자격증
    (profile.portfolio_bonus || 0) +     // 포트폴리오
    (profile.team_rating_bonus || 0);    // 팀 평가
  
  const totalScore = baseScore + bonusScore;
  
  // 점수 → 레벨 매핑
  if (totalScore >= 80) return 5;
  if (totalScore >= 60) return 4;
  if (totalScore >= 40) return 3;
  if (totalScore >= 20) return 2;
  return 1;
}
```

---

## 8. 구현 파일 위치

| 파일 | 역할 |
|------|------|
| `src/lib/recommendationEngine.ts` | 점수 계산 함수 (새로 생성) |
| `src/hooks/useRecommendation.ts` | React Query 훅 (새로 생성) |
| `src/components/recommendation/FitScoreBadge.tsx` | 점수 표시 UI |
| `src/components/recommendation/RecommendedTeams.tsx` | 대시보드 위젯 |

---

## 9. 향후 확장

| 기능 | 우선순위 | 설명 |
|------|----------|------|
| 협업 이력 반영 | 낮음 | 과거 함께 일한 팀원과의 매칭 가중치 |
| 응답률 반영 | 중간 | 팀의 지원자 응답률 표시 |
| ML 기반 추천 | 낮음 | 성공 프로젝트 패턴 학습 |

---

*최종 수정: 2026-01-30*
