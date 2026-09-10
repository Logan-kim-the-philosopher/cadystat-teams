# Codystat-Teams

중앙 조직 운영 포털입니다. 티켓 접수·배정·상태 관리, 팀 조직도, 회의록과 댓글을 한 곳에서 관리합니다.

## 기술 스택

- **Astro**: 페이지 라우팅, 서버 렌더링, 공통 레이아웃
- **React islands**: 티켓 보드, 조직도 등 상호작용 UI
- **Tailwind CSS + shadcn 스타일 컴포넌트**: 일관된 UI
- **Supabase/Postgres**: 티켓, 조직, 회의록 데이터 저장

## 실행

```bash
npm install
npm run dev
npm run build
```

환경 변수는 `.env.example`을 참고합니다. 실제 값은 `.env` 또는 Bitwarden Secrets Manager에서 런타임에 주입합니다.

## 프로젝트 구조

```text
src/
├── components/
│   ├── app/              # 도메인별 화면 및 React island
│   │   ├── ticket-browser.tsx
│   │   ├── ticket-list.tsx
│   │   ├── ticket-item.tsx
│   │   ├── ticket-create-modal.tsx
│   │   ├── ticket-filters.tsx
│   │   ├── team-ticket-card.tsx
│   │   └── organization-flow.tsx
│   └── ui/               # 공통 shadcn 스타일 컴포넌트
├── layouts/
│   └── SiteLayout.astro  # 전체 사이트 레이아웃
├── lib/
│   ├── site-data.ts      # 화면용 데이터 타입 및 변환
│   ├── server-meetings.ts
│   └── renderers/        # Markdown 렌더링
├── pages/
│   ├── index.astro       # 홈 대시보드
│   ├── organization.astro
│   ├── organization/[slug].astro
│   ├── meetings/index.astro
│   ├── meetings/[slug].astro
│   ├── tickets/index.astro
│   └── api/              # 서버 API 엔드포인트
└── styles/global.css

supabase/migrations/      # 데이터베이스 마이그레이션
docs/                     # 설계 및 데이터 모델 문서
public/                   # 정적 이미지 및 아바타
```

## 주요 기능

### 티켓

- 신규 티켓 접수: 제목, 설명, 유형, 담당 팀
- 목록/팀별 현황/칸반보드 보기
- 카드 드래그 앤 드롭으로 상태 변경
- 신규 상태로 이동하면 담당 팀 자동 해제
- 담당 팀이 없는 티켓은 배정 상태로 이동 불가
- 티켓 편집·삭제 메뉴
- 상태별 배지와 팀/유형 정보 표시
- 티켓 클릭 시 상세 모달에서 본문, 이력, 댓글 확인

### 조직도

- 전체 조직 및 팀 상세 화면
- 팀/구성원 표시
- 상위 팀과 리더 관계 시각화
- 팀 및 구성원 관리 API

### 회의록

- 회의록 목록 및 상세 화면
- Markdown 기반 본문 렌더링
- 관련 티켓 연결
- 댓글 작성 및 조회

## API

- `GET/POST/PATCH/DELETE /api/tickets`
- `GET/POST /api/ticket-comments`
- `GET/POST /api/meeting-comments`
- `GET/POST /api/meetings`
- `GET /api/organization`
- `GET/POST /api/organization/members`

티켓 상태는 `신규`, `배정`, `완료`를 사용하며, 데이터베이스의 유형·상태·팀 ID와 연결됩니다.

## 문서

- [화면 설계](docs/screen-design.md)
- [데이터 모델](docs/data-model.md)
- [프로젝트 구조](docs/project-structure.md)
- [조직도 데이터 스키마](docs/organization-schema.md)
