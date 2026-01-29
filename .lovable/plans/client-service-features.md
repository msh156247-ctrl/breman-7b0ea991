# 클라이언트 서비스 기능 구현 계획

## 개요

클라이언트(의뢰자)를 위한 핵심 서비스 기능 구현 로드맵

| 기능 | 현재 상태 | 우선순위 |
|------|----------|---------|
| 추천 시스템 | 🟡 기본 구현 | P1 |
| 10% 수수료 | 🟡 DB 설정 완료 | P2 |
| 프로젝트 등록 | ✅ 구현 완료 | - |
| 팀 매칭 | 🟡 기본 구현 | P1 |
| 에스크로 결제 | 🔴 미구현 | P2 |
| 분쟁 해결 지원 | 🟡 기본 구현 | P3 |
| 전담 매니저 | 🔴 미구현 | P4 |
| 의뢰하기 | ✅ 구현 완료 | - |

---

## 1. 추천 시스템 (Team Recommendation)

### 현재 상태
- 기본적인 팀 리스트 표시
- 정렬 옵션 (활동순, 평점순)

### 구현 계획

#### 1.1 스마트 추천 알고리즘
```
추천 점수 = (스킬 매칭 40%) + (평점 25%) + (완료율 20%) + (응답속도 15%)
```

**DB 변경 필요:**
```sql
-- teams 테이블에 추천 지표 컬럼 추가
ALTER TABLE public.teams ADD COLUMN response_rate numeric DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN avg_response_hours integer DEFAULT 24;
ALTER TABLE public.teams ADD COLUMN completion_rate numeric DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN total_contracts integer DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN completed_contracts integer DEFAULT 0;
```

**Edge Function 필요:**
- `calculate-team-recommendation`: 프로젝트 요구사항 기반 팀 추천 점수 계산
- 매일 팀 통계 업데이트 (completion_rate, response_rate)

#### 1.2 UI 개선
- 추천 점수 표시 배지
- "이 프로젝트에 적합" 라벨
- 스킬 매칭률 시각화

---

## 2. 10% 수수료 시스템

### 현재 상태
- `contracts.fee_rate` 컬럼 존재 (기본값 10)
- UI에 표시만 됨, 실제 계산 로직 없음

### 구현 계획

#### 2.1 수수료 계산 로직
```typescript
interface FeeCalculation {
  projectAmount: number;      // 프로젝트 총액
  platformFee: number;        // 플랫폼 수수료 (10%)
  teamPayout: number;         // 팀 정산액 (90%)
  escrowAmount: number;       // 에스크로 보관액
}
```

#### 2.2 수수료 표시 UI
- 프로젝트 생성 시 예상 수수료 안내
- 계약서에 수수료 명시
- 마일스톤별 수수료 분배 표시

**필요 컴포넌트:**
- `FeeBreakdownCard`: 수수료 상세 내역 표시
- 계약 페이지에 수수료 정보 섹션 추가

---

## 3. 프로젝트 등록 ✅

### 현재 상태: 구현 완료
- 4단계 대화형 등록 플로우
- 필요 직무/기술 선택
- 예산/기간 설정
- 팀 직접 제안 기능

### 개선 사항
- [ ] 임시저장 기능
- [ ] 프로젝트 템플릿

---

## 4. 팀 매칭

### 현재 상태
- 팀 목록 조회
- 기본 필터링 (직무, 상태)
- 제안서 수신/관리

### 구현 계획

#### 4.1 자동 매칭 시스템
```
매칭 알고리즘:
1. 프로젝트 요구 스킬 분석
2. 팀별 스킬 매칭률 계산
3. 예산 범위 필터링
4. 가용성 확인
5. 추천 점수 산출
```

**Edge Function:**
- `auto-match-teams`: 프로젝트 등록 시 자동 팀 추천
- 매칭된 팀에 자동 알림 발송

#### 4.2 매칭 대시보드
**새 컴포넌트:**
- `MatchingDashboard`: 클라이언트용 매칭 현황
- `TeamComparisonView`: 팀 비교 뷰
- `MatchScoreCard`: 매칭 점수 상세

#### 4.3 매칭 흐름
```
프로젝트 등록 → 자동 매칭 → 추천 팀 알림 → 
제안서 수신 → 비교/선택 → 협상 채팅 → 계약
```

---

## 5. 에스크로 결제 🔴

### 현재 상태
- `contracts.escrow_status` enum 존재
- 실제 결제 연동 없음

### 구현 계획

#### 5.1 결제 흐름 설계
```
결제 흐름:
1. 계약 확정 → 클라이언트 결제
2. 결제 완료 → 에스크로 보관 (escrow_status: 'funded')
3. 마일스톤 완료 → 팀 승인 요청
4. 클라이언트 승인 → 부분 정산
5. 프로젝트 완료 → 최종 정산
```

#### 5.2 DB 변경
```sql
-- 결제 기록 테이블
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  milestone_id UUID REFERENCES milestones(id),
  amount INTEGER NOT NULL,
  fee_amount INTEGER NOT NULL,
  net_amount INTEGER NOT NULL,
  payment_type TEXT NOT NULL, -- 'escrow_deposit', 'milestone_release', 'refund'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_method TEXT, -- 'card', 'bank_transfer', 'virtual_account'
  payment_key TEXT, -- 외부 결제 서비스 키
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
```

#### 5.3 결제 서비스 연동
**옵션:**
1. **Stripe** - 글로벌 지원, 마켓플레이스 기능
2. **토스페이먼츠** - 국내 특화, 가상계좌/카드
3. **포트원(아임포트)** - 다중 PG 연동

**추천: 토스페이먼츠 + Stripe 병행**

#### 5.4 필요 Edge Functions
- `create-payment-intent`: 결제 의도 생성
- `process-escrow-deposit`: 에스크로 입금 처리
- `release-milestone-payment`: 마일스톤 정산
- `process-refund`: 환불 처리
- `payment-webhook`: 결제 상태 업데이트

#### 5.5 UI 컴포넌트
- `PaymentCheckout`: 결제 진행 페이지
- `EscrowStatusCard`: 에스크로 현황 카드
- `PaymentHistory`: 결제/정산 내역
- `MilestonePaymentFlow`: 마일스톤별 정산 UI

---

## 6. 분쟁 해결 지원

### 현재 상태
- `disputes` 테이블 존재
- 기본 분쟁 등록 기능
- 관리자 노트 기능

### 구현 계획

#### 6.1 분쟁 흐름 개선
```
분쟁 흐름:
1. 분쟁 제기 (사유, 증거 첨부)
2. 상대방 답변 요청 (7일 기한)
3. 중재자 배정
4. 조정 제안
5. 합의 또는 강제 결정
6. 에스크로 처리 (환불/정산/분할)
```

#### 6.2 DB 변경
```sql
-- 분쟁 답변 테이블
CREATE TABLE public.dispute_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id),
  responder_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  evidence_files TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 분쟁 타임라인
CREATE TABLE public.dispute_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id),
  event_type TEXT NOT NULL, -- 'opened', 'response', 'mediation', 'resolved'
  description TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6.3 UI 컴포넌트
- `DisputeTimeline`: 분쟁 진행 타임라인
- `EvidenceUploader`: 증거 자료 업로드
- `MediationPanel`: 중재 패널 (관리자용)
- `ResolutionOptions`: 해결 옵션 선택

---

## 7. 전담 매니저 🔴

### 구현 계획

#### 7.1 매니저 시스템 설계
```
매니저 역할:
- 프로젝트 상담 및 요구사항 정리
- 팀 매칭 지원
- 진행 상황 모니터링
- 분쟁 중재
- 정산 지원
```

#### 7.2 DB 변경
```sql
-- 매니저 배정 테이블
CREATE TABLE public.project_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  manager_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' -- 'active', 'transferred', 'completed'
);

-- 매니저 프로필 확장
ALTER TABLE public.profiles ADD COLUMN is_manager BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN manager_capacity INTEGER DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN current_projects INTEGER DEFAULT 0;
```

#### 7.3 기능 구현
**Phase 1: 수동 배정**
- 관리자가 프로젝트에 매니저 배정
- 매니저 전용 대시보드

**Phase 2: 자동 배정**
- 프로젝트 규모별 자동 매니저 배정
- 매니저 업무량 기반 분배

**Phase 3: 프리미엄 서비스**
- 전담 매니저 유료 옵션
- VIP 클라이언트 전용

#### 7.4 UI 컴포넌트
- `ManagerDashboard`: 매니저 전용 대시보드
- `ManagerAssignment`: 매니저 배정 관리
- `ManagerChat`: 매니저-클라이언트 전용 채팅
- `ProjectOverview`: 담당 프로젝트 현황

---

## 8. 의뢰하기 ✅

### 현재 상태: 구현 완료
- 프로젝트 생성 플로우
- 팀 직접 제안
- 제안서 관리

---

## 구현 우선순위 로드맵

### Phase 1 (2-3주)
1. ✅ 추천 알고리즘 고도화
2. ✅ 팀 매칭 자동화
3. 수수료 계산/표시 UI

### Phase 2 (4-6주)
4. 에스크로 결제 시스템 구축
5. 토스페이먼츠/Stripe 연동
6. 결제/정산 대시보드

### Phase 3 (2-3주)
7. 분쟁 해결 프로세스 개선
8. 증거 관리 시스템
9. 중재 워크플로우

### Phase 4 (3-4주)
10. 전담 매니저 시스템
11. 매니저 대시보드
12. 프리미엄 서비스 옵션

---

## 기술 스택 요약

| 기능 | Frontend | Backend | 외부 서비스 |
|------|----------|---------|------------|
| 추천 | React Query | Edge Function | - |
| 수수료 | 컴포넌트 | DB 함수 | - |
| 매칭 | 대시보드 | Edge Function | - |
| 결제 | Checkout UI | Edge Function | 토스페이먼츠 |
| 분쟁 | 타임라인 UI | DB + Trigger | - |
| 매니저 | 대시보드 | RLS + 함수 | - |
