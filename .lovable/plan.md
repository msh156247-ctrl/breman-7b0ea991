
# 채팅 기능 개선 계획

## 개요
채팅 시스템에 3가지 핵심 기능을 추가합니다:
1. **메시지 검색** - 대화 내 키워드 검색
2. **친구 기능** - 친구 추가/목록 관리 및 빠른 채팅 시작
3. **타이핑 표시** - 상대방 입력 중 실시간 표시

---

## 1. 메시지 검색 기능

### UI 변경
- ChatRoom 헤더에 검색 버튼 추가
- 검색 모드 활성화 시 검색 입력창 표시
- 검색 결과 하이라이트 및 해당 메시지로 스크롤

### 구현 내용
- `ChatRoom.tsx`에 검색 상태 및 로직 추가
- 검색어와 일치하는 메시지 필터링
- 검색 결과 간 이동 (이전/다음) 기능

---

## 2. 친구 기능

### 데이터베이스 변경
새 테이블 `friendships` 생성:

```text
friendships
├── id (uuid, PK)
├── user_id (uuid, FK → profiles.id) - 친구 요청 보낸 사람
├── friend_id (uuid, FK → profiles.id) - 친구 요청 받은 사람
├── status (text) - 'pending' | 'accepted' | 'rejected'
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

RLS 정책:
- 자신이 관련된 친구 관계만 조회 가능
- 자신의 요청만 생성/수정 가능

### UI 구현

#### 2-1. 친구 관리 탭 (NewChatDialog 개선)
- 기존 "새 채팅" 다이얼로그에 탭 추가: `전체` | `친구`
- 친구 탭에서 수락된 친구 목록만 표시
- 친구 목록에서 바로 채팅 시작

#### 2-2. 친구 추가 기능
- 사용자 검색 시 "친구 추가" 버튼 표시
- 친구 요청 보내기/수락/거절 기능
- 이미 친구인 경우 표시

#### 2-3. 친구 요청 알림
- 알림 시스템과 연동하여 친구 요청 알림

---

## 3. 타이핑 표시

### 구현 방식
Supabase Realtime Presence 활용:
- 사용자가 입력 중일 때 presence 채널에 상태 전송
- 상대방의 입력 상태를 실시간 수신하여 UI에 표시

### UI 변경
- ChatRoom 입력창 위에 "○○님이 입력 중..." 메시지 표시
- 3초간 입력 없으면 자동 해제

### 구현 흐름
```text
1. 메시지 입력 시작 → track({ typing: true })
2. 디바운스 3초 후 입력 없음 → track({ typing: false })
3. presence 이벤트 수신 → 타이핑 사용자 목록 업데이트
4. UI에 타이핑 중인 사용자 표시
```

---

## 파일 변경 목록

### 새로 생성
| 파일 | 설명 |
|------|------|
| `supabase/migrations/xxx_friendships.sql` | 친구 테이블 및 RLS |
| `src/components/chat/ChatSearch.tsx` | 메시지 검색 컴포넌트 |
| `src/components/chat/TypingIndicator.tsx` | 타이핑 표시 컴포넌트 |
| `src/hooks/useTypingIndicator.ts` | 타이핑 상태 관리 훅 |
| `src/hooks/useFriends.ts` | 친구 관련 데이터 훅 |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/pages/ChatRoom.tsx` | 검색, 타이핑 표시 통합 |
| `src/components/chat/ChatInputArea.tsx` | 타이핑 상태 전송 로직 |
| `src/components/chat/NewChatDialog.tsx` | 친구 탭 및 친구 추가 기능 |

---

## 기술 세부사항

### 타이핑 Presence 채널 구조
```typescript
const typingChannel = supabase.channel(`typing-${conversationId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = typingChannel.presenceState();
    // 타이핑 중인 사용자 추출
  })
  .subscribe();

// 입력 시작
typingChannel.track({ 
  user_id: user.id, 
  user_name: profile.name,
  typing: true 
});
```

### 메시지 검색 로직
- 클라이언트 사이드 필터링 (이미 로드된 메시지 대상)
- 검색어 대소문자 구분 없이 매칭
- 검색 결과 개수 및 현재 위치 표시

---

## 구현 순서

1. **DB 마이그레이션** - friendships 테이블 생성
2. **타이핑 표시** - Presence 기반 실시간 기능
3. **메시지 검색** - ChatRoom 내 검색 UI
4. **친구 기능** - 친구 추가/목록/채팅 연동
