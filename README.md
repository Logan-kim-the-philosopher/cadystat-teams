# cody-stat

팀 협업/티켓 관리 포털 기획 저장소입니다.

## 목표
- 오류/기능 제보를 하나의 창구로 받습니다.
- 각 팀이 티켓을 인수해서 처리합니다.
- 팀 조직도를 시각화합니다.
- 전체 회의록을 남기고 댓글을 달 수 있게 합니다.

## 방향
- **Plane**: 티켓, 상태, 이관, 권한, 회의록 원본
- **Astro**: 포털 라우팅/레이아웃
- **React islands**: 상호작용이 필요한 부분
- **shadcn UI**: 카드/배지/탭/입력 등 핵심 UI 컴포넌트
- **Sanity**: 현재는 필수 아님. 필요할 때 보조 문서 저장소로만 검토

## 핵심 요구사항
1. 팀은 2~3개 이상 존재해야 함
2. 팀 생성/수정 가능해야 함
3. 조직도를 실시간에 가깝게 표시해야 함
4. 오류/기능 제보는 하나의 접수함으로 받아야 함
5. 각 팀이 티켓을 가져가서 처리해야 함
6. 처리 상태와 이관 기록을 보여줘야 함
7. 회의록은 전체 회의용으로만 저장해야 함
8. 회의록에 댓글이 가능해야 함

## 최소 데이터 모델

### Team
- id
- name
- slug
- parentTeamId
- leadUserId
- members

### Ticket
- id
- title
- type (`bug`, `feature`, `request`)
- status
- ownerTeamId
- assigneeUserId
- priority
- history

### MeetingNote
- id
- title
- date
- attendees
- agenda
- decisions
- linkedTicketIds
- comments

## 화면
- 홈 대시보드
- 조직도
- 티켓 접수함
- 티켓 상세
- 전체 회의록 목록
- 회의록 상세

## 운영 흐름
1. 폼/메일/수기 입력으로 제보 접수
2. 단일 큐에 적재
3. 팀이 티켓을 가져감
4. 상태/담당자/팀 변경
5. 회의에서 논의
6. 회의록에 결정사항 기록
7. 댓글과 후속 처리 반영

## 우선순위
1. Plane 워크스페이스/권한 정리
2. 단일 티켓 접수 흐름
3. 회의록 + 댓글 흐름
4. 조직도 화면
5. Astro 포털 연결
6. 외부 폼 자동 티켓 생성

## 문서
- [화면 설계](docs/screen-design.md)
- [데이터 모델 상세화](docs/data-model.md)
- [Plane 기준 기능 분해](docs/plane-feature-split.md)
- [초기 구현 순서](docs/implementation-roadmap.md)
- [프로젝트 구조](docs/project-structure.md)
- [shadcn 전환 계획](docs/shadcn-rewrite-plan.md)
