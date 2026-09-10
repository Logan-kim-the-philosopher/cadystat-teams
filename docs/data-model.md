# 데이터 모델 상세화

## 1. Team
팀과 조직 구조를 표현합니다.

### 필드
- `id`: 고유 식별자
- `name`: 팀 이름
- `slug`: URL용 식별자
- `parentTeamId`: 상위 팀 ID
- `leadUserId`: 팀 리더 ID
- `memberIds`: 팀원 ID 배열
- `description`: 팀 설명
- `color`: UI 구분용 색상
- `activeTicketCount`: 진행 중 티켓 수
- `createdAt`: 생성 시각
- `updatedAt`: 수정 시각

### 용도
- 조직도 시각화
- 팀별 티켓 집계
- 팀 수정/관리

---

## 2. User
팀원 정보를 표현합니다.

### 필드
- `id`: 고유 식별자
- `name`: 표시 이름
- `email`: 이메일
- `role`: `admin | manager | member | viewer`
- `teamIds`: 속한 팀 ID 배열
- `avatarUrl`: 프로필 이미지
- `status`: `active | inactive`
- `createdAt`: 생성 시각

### 용도
- 조직도 멤버 표시
- 담당자 지정
- 권한 판별

---

## 3. Ticket
오류/기능 제보를 처리하는 단위입니다.

### 필드
- `id`: 고유 식별자
- `title`: 제목
- `description`: 설명
- `type`: `bug | feature | request`
- `status`: `신규 | 배정 | 완료`
- `priority`: `low | medium | high | urgent`
- `source`: `form | email | manual | import`
- `ownerTeamId`: 현재 담당 팀
- `previousTeamIds`: 이전 담당 팀 배열
- `assigneeUserId`: 현재 담당자
- `reporterName`: 제보자 이름
- `reporterContact`: 제보자 연락처
- `tags`: 태그 배열
- `attachments`: 첨부 파일 배열
- `linkedMeetingNoteIds`: 관련 회의록 ID 배열
- `history`: 상태/이관 변경 기록
- `createdAt`: 생성 시각
- `updatedAt`: 수정 시각
- `closedAt`: 완료 시각

### history 예시
- action
- fromTeamId
- toTeamId
- fromStatus
- toStatus
- actorUserId
- note
- createdAt

### 용도
- 단일 접수함
- 팀 간 이관
- 처리 상태 추적
- 감사 로그

---

## 4. MeetingNote
전체 회의록을 표현합니다.

### 필드
- `id`: 고유 식별자
- `title`: 회의 제목
- `meetingDate`: 회의 일자
- `content`: 회의록 본문
- `status`: `draft | published | archived`
- `linkedTicketIds`: 연결된 티켓 ID 배열

### comments 예시
- `id`
- `authorUserId`
- `body`
- `createdAt`

### 용도
- 전체 회의 아카이브
- 티켓과의 연결 기록
- 댓글 기반 의견 수렴

---

## 5. Comment
회의록이나 티켓에 달리는 의견입니다.

### 필드
- `id`: 고유 식별자
- `targetType`: `ticket | meetingNote`
- `targetId`: 대상 ID
- `authorUserId`: 작성자 ID
- `body`: 본문
- `createdAt`: 생성 시각
- `updatedAt`: 수정 시각

### 용도
- 회의록 피드백
- 티켓 처리 의견
- 후속 논의 기록

---

## 6. 핵심 관계
- `Team` → `User` 다대다
- `Ticket` → `Team` 단일 현재 담당 + 이력
- `Ticket` → `MeetingNote` 다대다
  - DB 연결 테이블: `meeting_note_tickets(meeting_slug, ticket_id)`
- `MeetingNote` → `Comment` 일대다
- `Ticket` → `Comment` 일대다

---

## 7. 우선순위
1. Team
2. User
3. Ticket
4. MeetingNote
5. Comment
