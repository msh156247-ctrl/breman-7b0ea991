
# 성향, 기술능력, 경험 분리 및 통합 적용 계획

## 현재 상태 분석

현재 시스템에서 혼재된 세 가지 개념:

| 개념 | 현재 상태 | 설명 |
|------|----------|------|
| **성향 (Animal Skin)** | `profiles.animal_skin` | 브레맨 캐릭터 (말, 개, 고양이, 닭) - 협업 스타일 |
| **직무 (Role Type)** | `profiles.main_role_type`, `sub_role_types` | 전문 직무 (백엔드, 프론트엔드, 디자인 등) |
| **기술 능력 (Skills)** | `user_skills` 테이블 | 개별 기술 스킬 (React, Python 등) + XP 레벨 |
| **경험 (Experience)** | `skill_experiences` 테이블 | 스킬별 경험 기록 (XP 획득 이력) |

### 문제점

1. **온보딩에서 성향과 직무가 분리되지 않음** - 현재 온보딩은 "역할"만 선택 (ROLES = ANIMAL_SKINS)
2. **팀 모집에서 성향 기반 슬롯 정의 필요** - 현재는 `role` (animal) + `role_type` (직무)이 혼재
3. **프로젝트에서 성향/직무/기술 요구사항 명확화 필요**
4. **프로필 페이지에서 세 요소의 명확한 분리 표시 필요**

---

## 구현 계획

### 1단계: 프로필 페이지 UI 개선

**파일**: `src/pages/Profile.tsx`

변경 내용:
- 프로필 헤더에 성향(Animal Skin) 아이콘 + 직무(Role Type) 뱃지 명확히 분리 표시
- 탭 순서 재정렬: `성향` | `직무` | `스킬` | `경험` | ...

```text
프로필 헤더:
┌─────────────────────────────────────────────┐
│ [아바타]                                     │
│ 홍길동                                       │
│ 🐴 말 (리드/추진) ← 성향                    │
│ ⚙️ 백엔드 (메인) 🎨 프론트 (서브) ← 직무   │
│ React Lv.7 | Python Lv.5 ← 대표 기술       │
└─────────────────────────────────────────────┘
```

---

### 2단계: 온보딩 페이지 개선

**파일**: `src/pages/Onboarding.tsx`

현재 단계: `role → skills → experience → summary`

변경 단계: `personality → roleType → skills → experience → summary`

```text
새로운 온보딩 흐름:
1. 성향 선택 (animal_skin): 말/개/고양이/닭
2. 직무 선택 (main_role_type + sub_role_types): 메인 1개 + 서브 다수
3. 기술 스택 입력 (skills)
4. 경험 입력 (experience)
5. AI 요약 생성
```

---

### 3단계: 팀 모집 슬롯 에디터 개선

**파일**: `src/components/team/TeamPositionSlotEditor.tsx`

변경 내용:
- 각 슬롯에 **성향 선택** 옵션 추가 (선택사항)
- 기존 직무 + 최소 레벨 + 필요 기술 유지

```text
포지션 슬롯:
┌────────────────────────────────────────┐
│ 선호 성향: [말 🐴] (선택사항)           │
│ 직무: [백엔드 ⚙️]                      │
│ 최소 레벨: Lv.3                        │
│ 모집 인원: 2명                         │
│ 필요 기술: React Lv.5+, Node.js Lv.3+ │
└────────────────────────────────────────┘
```

**DB 변경**: `team_role_slots` 테이블에 `preferred_animal_skin` 컬럼 추가

---

### 4단계: 팀 목록/상세 페이지 개선

**파일들**: `src/pages/Teams.tsx`, `src/pages/TeamJoin.tsx`, `src/pages/TeamDetail.tsx`

변경 내용:
- 팀 카드에 성향 필터 추가
- 슬롯 표시 시 성향 + 직무 함께 표시
- 매칭 점수 계산에 성향 일치 가중치 추가

---

### 5단계: 프로젝트 생성/상세 페이지 개선

**파일들**: `src/pages/ProjectCreate.tsx`, `src/pages/Projects.tsx`, `src/pages/ProjectDetail.tsx`

**DB 변경**: `projects` 테이블에 `preferred_animal_skins` 컬럼 추가

변경 내용:
- 프로젝트 생성 시 선호 성향 선택 가능
- 프로젝트 카드에 성향 + 직무 + 기술 요구사항 표시

---

### 6단계: 성향 관리 컴포넌트 신규 생성

**새 파일**: `src/components/profile/AnimalSkinManagement.tsx`

내용:
- 현재 성향 표시 (아이콘, 이름, 설명, 키워드)
- 성향 변경 기능
- 성향별 특성 및 추천 역할 안내

---

## DB 마이그레이션

```sql
-- 1. team_role_slots에 선호 성향 컬럼 추가
ALTER TABLE public.team_role_slots 
ADD COLUMN preferred_animal_skin public.animal_skin DEFAULT NULL;

-- 2. projects에 선호 성향 배열 컬럼 추가
ALTER TABLE public.projects 
ADD COLUMN preferred_animal_skins public.animal_skin[] DEFAULT '{}';
```

---

## 파일 변경 목록

### 신규 생성
| 파일 | 설명 |
|------|------|
| `src/components/profile/AnimalSkinManagement.tsx` | 성향 관리 컴포넌트 |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Onboarding.tsx` | 성향/직무 분리 단계 추가 |
| `src/pages/Profile.tsx` | 성향 탭 추가, UI 개선 |
| `src/components/team/TeamPositionSlotEditor.tsx` | 선호 성향 옵션 추가 |
| `src/pages/TeamJoin.tsx` | 성향 매칭 점수 반영 |
| `src/pages/Teams.tsx` | 성향 필터 추가 |
| `src/pages/TeamDetail.tsx` | 슬롯에 성향 표시 |
| `src/pages/ProjectCreate.tsx` | 선호 성향 선택 추가 |
| `src/pages/Projects.tsx` | 성향 필터/표시 추가 |

---

## 일관된 UI 규칙

모든 페이지에서 동일한 표시 순서 적용:

```text
1. 성향 (Animal Skin): 아이콘 + 이름 + 키워드
2. 직무 (Role Type): 메인/서브 구분, 아이콘 + 이름
3. 기술 (Skills): 스킬명 + 레벨 + 티어 배지
4. 경험 (Experience): XP 기반 경험 기록
```

---

## 기술 세부사항

### 성향 매칭 점수 계산 (TeamJoin)

```typescript
function calculateFitScore(slot, userProfile, userSkills) {
  let score = 0;
  
  // 성향 일치: 20점 (선호 성향 설정 시)
  if (slot.preferred_animal_skin) {
    if (slot.preferred_animal_skin === userProfile.animal_skin) {
      score += 20;
    }
  } else {
    score += 20; // 성향 미지정 시 기본 점수
  }
  
  // 레벨 충족: 20점
  if (userProfile.level >= slot.min_level) {
    score += 20;
  }
  
  // 기술 스킬 매칭: 60점
  // (기존 로직 유지)
  
  return score;
}
```

### 프로필 헤더 레이아웃

```typescript
// 성향 표시
<div className="flex items-center gap-2">
  <span className="text-3xl">{ANIMAL_SKINS[profile.animal_skin].icon}</span>
  <div>
    <span className="font-bold">{ANIMAL_SKINS[profile.animal_skin].name}</span>
    <span className="text-sm text-muted-foreground">
      {ANIMAL_SKINS[profile.animal_skin].title}
    </span>
  </div>
</div>

// 직무 표시 (별도 섹션)
<div className="flex gap-2">
  <Badge variant="default">{ROLE_TYPES[profile.main_role_type].icon} 메인: {name}</Badge>
  {subRoles.map(sub => <Badge variant="secondary">{...}</Badge>)}
</div>

// 대표 기술 표시
<div className="flex gap-1">
  {topSkills.map(skill => <SkillBadge key={skill.id} {...skill} />)}
</div>
```

---

## 구현 순서

1. **DB 마이그레이션** - 새 컬럼 추가
2. **AnimalSkinManagement 컴포넌트** - 성향 관리 UI
3. **Profile 페이지** - 성향 탭 추가 및 헤더 개선
4. **Onboarding 페이지** - 성향/직무 분리 단계
5. **TeamPositionSlotEditor** - 선호 성향 옵션
6. **TeamJoin/Teams/TeamDetail** - 성향 필터 및 표시
7. **ProjectCreate/Projects** - 성향 선택 및 표시
