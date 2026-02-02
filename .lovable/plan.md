
# 채팅 실시간 동기화 개선 계획

## 현재 상태 분석

### 발견된 문제점

1. **Broadcast 설정 문제**
   - 현재 `self: false` 설정으로 인해 같은 사용자가 여러 창에서 테스트할 때 자신의 메시지가 다른 창에서 실시간으로 보이지 않음
   - 이는 의도된 동작(중복 방지)이지만, 같은 계정으로 테스트 시 문제로 보임

2. **팀 채팅 참여자 처리**
   - 팀 채팅의 경우 `conversation_participants` 테이블에 레코드가 없음
   - 대신 `team_memberships` + `teams.leader_id`를 통해 접근 권한 검증
   - Realtime postgres_changes가 이 복잡한 접근 경로를 제대로 처리하지 못할 수 있음

3. **테스트 환경 한계**
   - 현재 "좋다" 팀에는 리더(명성현) 한 명만 있고 멤버가 없음
   - 실제 다중 사용자 실시간 테스트가 불가능한 상태

---

## 개선 방안

### 1단계: 팀 채팅 참여자 자동 등록 (핵심)

팀 채팅 생성 시 팀 리더와 멤버들을 `conversation_participants`에 자동 등록하는 트리거 추가:

```sql
-- 팀 채팅 생성 시 리더를 참여자로 등록
CREATE OR REPLACE FUNCTION public.add_team_leader_to_conversation()
RETURNS trigger AS $$
DECLARE
  leader_id UUID;
BEGIN
  IF NEW.type = 'team' AND NEW.team_id IS NOT NULL THEN
    SELECT t.leader_id INTO leader_id
    FROM teams t WHERE t.id = NEW.team_id;
    
    IF leader_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (NEW.id, leader_id)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- 팀 멤버들도 등록
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT NEW.id, tm.user_id
    FROM team_memberships tm
    WHERE tm.team_id = NEW.team_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2단계: 메시지 읽음 상태 관리 개선

팀 채팅에서 `markAsRead()` 함수가 참여자 레코드가 없어서 실패하는 문제 해결:

```typescript
// ChatRoom.tsx 수정
const markAsRead = async () => {
  if (!conversationId || !user) return;

  // Upsert를 사용하여 참여자 레코드가 없으면 생성
  const { error } = await supabase
    .from('conversation_participants')
    .upsert({
      conversation_id: conversationId,
      user_id: user.id,
      last_read_at: new Date().toISOString()
    }, {
      onConflict: 'conversation_id,user_id'
    });
    
  if (error) console.error('Mark as read error:', error);
};
```

### 3단계: Realtime 구독 개선

postgres_changes 대신 Broadcast에 더 의존하도록 변경:

```typescript
// 메시지 전송 시 broadcast 전송 보장
const handleSendMessage = async (attachmentUrls: string[] = []) => {
  // ... 기존 코드 ...
  
  if (data) {
    // Broadcast를 await로 전송하고 성공 확인
    const status = await channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { ...data, sender: { ... } }
    });
    
    if (status !== 'ok') {
      console.warn('Broadcast failed, relying on postgres_changes');
    }
  }
};
```

### 4단계: 타이핑 인디케이터 연동 확인

현재 `useTypingIndicator` 훅이 입력 시 호출되는지 확인:

```typescript
// ChatInputArea.tsx에서 onInputChange 연결 확인
<ChatInputArea
  onInputChange={handleInputChange} // useTypingIndicator에서 제공
  // ...
/>
```

---

## 기술적 세부사항

### 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/pages/ChatRoom.tsx` | markAsRead upsert 처리, Realtime 구독 안정화 |
| `supabase/migrations/` | 팀 채팅 참여자 자동 등록 트리거 |
| (선택) `src/hooks/useTypingIndicator.ts` | 안정성 개선 |

### 데이터베이스 변경사항

1. **새 트리거**: `add_team_leader_to_conversation` - 팀 채팅 생성 시 참여자 자동 등록
2. **기존 데이터 수정**: 기존 팀 채팅에 대해 리더/멤버를 `conversation_participants`에 일괄 등록

### 기존 팀 채팅 데이터 마이그레이션

```sql
-- 기존 팀 채팅에 리더 추가
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, t.leader_id
FROM conversations c
JOIN teams t ON c.team_id = t.id
WHERE c.type = 'team' AND t.leader_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 기존 팀 채팅에 멤버 추가
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, tm.user_id
FROM conversations c
JOIN team_memberships tm ON c.team_id = tm.team_id
WHERE c.type = 'team'
ON CONFLICT DO NOTHING;
```

---

## 예상 결과

1. **실시간 동기화 정상화** - 팀 채팅에서도 다른 사용자의 메시지가 즉시 표시
2. **읽음 상태 추적 가능** - 팀 채팅에서도 읽음 확인 기능 작동
3. **일관된 참여자 관리** - 모든 채팅 유형에서 동일한 `conversation_participants` 기반 접근

---

## 테스트 시나리오

1. 서로 다른 계정 2개로 동일 팀 채팅방 접속
2. 한 쪽에서 메시지 전송
3. 다른 쪽에서 새로고침 없이 메시지 수신 확인
4. 타이핑 인디케이터 표시 확인
