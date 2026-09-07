# Plane 기준 기능 분해

## 1. 원칙
Plane은 **업무 원본 저장소**로 쓰고, 우리 서비스는 **보여주는 포털** 역할을 합니다.

즉:
- Plane = 데이터/권한/이력/협업
- Astro = 조직도/티켓/회의록 UI

---

## 2. Plane에서 사용할 기능

### A. Work Items
사용 목적:
- 오류 제보
- 기능 요청
- 개선 요청
- 처리 티켓

사용 이유:
- 상태, 담당자, 이관, 댓글, 이력을 관리할 수 있음

필수로 쓸 필드:
- title
- description
- status
- priority
- assignee
- owner team
- history
- comments

---

### B. Pages / Wiki
사용 목적:
- 전체 회의록
- 결정사항 기록
- 액션 아이템 정리

사용 이유:
- 문서형 정보에 적합
- 회의록 댓글/공유 흐름에 맞음

필수로 쓸 필드:
- title
- date
- attendees
- agenda
- decisions
- action items
- linked work items

---

### C. Members / Roles
사용 목적:
- 팀원 관리
- 권한 부여
- 담당자 연결

사용 이유:
- 팀 조직도와 티켓 책임 구조를 유지해야 함

필수 개념:
- admin
- manager
- member
- viewer

---

### D. 기본 상태
사용 목적:
- 티켓 처리 흐름

권장 상태:
- new
- triaged
- claimed
- in_progress
- blocked
- done
- closed

---

## 3. Plane에서 최소화할 기능
아래는 초기에 꼭 안 써도 됩니다.

- Cycles
- Modules
- Dashboards
- Time tracking
- Advanced estimates
- Complex automations
- Multiple workspaces
- Deep analytics
- AI 기능

---

## 4. 우리 포털에서 만들 기능

### A. 조직도 UI
- 팀 목록
- 팀 계층 구조
- 팀 편집
- 팀원 표시
- 담당 티켓 수 표시

### B. 티켓 포털 UI
- 단일 접수함
- 티켓 목록
- 티켓 상세
- 팀이 티켓 가져가기
- 이관 기록 표시

### C. 회의록 포털 UI
- 전체 회의록 목록
- 회의록 상세
- 연결된 티켓 표시
- 댓글 표시

### D. 집계 화면
- 팀별 티켓 수
- 진행 중/보류/완료 현황
- 최근 회의록

---

## 5. 외부 입력 처리
### 입력 소스
- Google Form
- 이메일
- 수기 입력
- 나중에 API

### 처리 방식
- 입력은 단일 접수함으로 모읍니다.
- 자동 분류가 가능하면 팀/유형을 붙입니다.
- 사람이 최종적으로 인수하거나 조정합니다.

---

## 6. 권장 운영 규칙
1. 티켓은 한 곳에만 접수합니다.
2. 팀은 티켓을 인수합니다.
3. 이관 기록은 반드시 남깁니다.
4. 회의록은 전체 회의만 기록합니다.
5. 댓글은 회의록과 티켓 모두에서 허용합니다.

---

## 7. 최종 역할 분담
- Plane: 원본 데이터와 협업
- Astro: 보기 좋은 운영 화면
- 외부 폼: 제보 입력
