
# 채팅 실시간 동기화 개선 계획

## ✅ 완료된 작업

### 1단계: 팀 채팅 참여자 자동 등록 (완료)

**데이터베이스 변경사항:**

1. **기존 데이터 마이그레이션** - 기존 팀 채팅에 리더와 멤버를 `conversation_participants`에 등록
2. **트리거 생성:**
   - `on_team_conversation_created`: 팀 채팅 생성 시 리더/멤버 자동 등록
   - `on_team_membership_created`: 팀 멤버 추가 시 해당 팀 채팅에 자동 참여

### 2단계: 메시지 읽음 상태 관리 개선 (완료)

- `markAsRead()` 함수에서 `upsert` 사용으로 참여자 레코드 자동 생성

### 3단계: Realtime 구독 개선 (완료)

- `self: true, ack: true` 설정으로 같은 계정 멀티 윈도우 테스트 지원
- Broadcast 전송 시 `await`로 전송 성공 확인
- 콘솔 로그 추가: `📤 Broadcast sent:`, `📨 Broadcast received:`, `🔔 Postgres INSERT received:`

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| 팀 채팅 참여자 트리거 | ✅ 완료 |
| 멀티 윈도우 self broadcast | ✅ 설정됨 |
| Broadcast 전송 확인 | ✅ await + 로그 |
| 중복 메시지 방지 | ✅ temp- 프리픽스 체크 |

---

## 테스트 방법

1. 브라우저에서 로그인 후 팀 채팅방 입장
2. 새 탭/창에서 같은 URL로 동일한 채팅방 입장
3. 한 창에서 메시지 전송
4. 다른 창에서 새로고침 없이 메시지 수신 확인
5. 콘솔에서 `📤 Broadcast sent: ok` 및 `📨 Broadcast received:` 로그 확인

---

## 문제 발생 시 확인 사항

1. **콘솔 로그 확인:**
   - `📡 Realtime subscription status: SUBSCRIBED` 확인
   - `📤 Broadcast sent: ok` 확인
   - `📨 Broadcast received:` 로그가 다른 창에서 나타나는지 확인

2. **네트워크 탭:**
   - WebSocket 연결 상태 확인 (wss://...)

3. **다른 계정으로 테스트:**
   - 실제 다중 사용자 환경에서 테스트
