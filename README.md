# Codystat-Teams

조직도, 티켓, 회의록과 댓글을 관리하는 중앙 조직 운영 포털입니다.
Astro 서버와 React islands, Tailwind CSS를 사용하며 모든 데이터는 로컬 SQLite 파일에 저장합니다.

## 실행

Node.js **22.18 이상**이 필요합니다. 별도 DB 서버나 Supabase 키는 필요하지 않습니다.

```bash
npm ci
npm run db:seed
npm run dev
```

기본 주소는 `http://localhost:4321`입니다. `/`는 `/meetings`로 이동합니다.
`npm run db:seed`를 생략해도 첫 데이터 조회 시 DB와 테스트 데이터가 자동 생성됩니다.

## SQLite와 테스트 데이터

기본 DB는 `data/codystat.sqlite`입니다. DB 파일과 WAL 파일은 Git에서 제외됩니다.
데이터는 파일에 저장되므로 서버를 재시작해도 편집·추가·삭제 내용이 유지됩니다.
시드는 DB당 한 번만 적용되며 다시 실행해도 기존 데이터를 덮어쓰거나 삭제한 예제를 복원하지 않습니다.

| 데이터 | 개수 |
|---|---:|
| 팀 | 4 |
| 구성원 | 10 |
| 티켓 | 18 (신규·배정·완료 각 6) |
| 티켓 이력 | 36 |
| 티켓 댓글 | 36 |
| 회의록 | 8 |
| 회의록 댓글 | 16 |
| 회의록–티켓 연결 | 19 |

기존 예제 조직·티켓·회의록을 포함하고, 추가 테스트 시나리오를 함께 제공합니다.
티켓 유형 2개와 상태 3개도 초기화합니다.

선택적으로 `.env.example`을 `.env`에 복사해 다음을 설정할 수 있습니다.

```dotenv
SQLITE_PATH=./data/codystat.sqlite
SQLITE_SEED=1
```

- `SQLITE_PATH`: DB 파일 경로. 상대 경로는 실행 디렉터리를 기준으로 합니다.
- `SQLITE_SEED=0`: 새 DB를 예제 데이터 없이 시작합니다. 유형·상태는 생성됩니다.
- `npm run db:seed`: `SQLITE_SEED` 설정과 관계없이 아직 적용되지 않은 예제 시드를 적용합니다.
- 새 예제로 다시 테스트하려면 `SQLITE_PATH`에 다른 파일 경로를 지정하세요.

## 프로젝트 구조

```text
src/
├── components/app/       # 티켓 보드, 조직도, 댓글 UI
├── components/ui/        # 공통 UI
├── layouts/              # 사이트 레이아웃
├── pages/                # 회의록, 티켓, 조직도 화면
│   └── api/              # 서버 API
├── lib/server/
│   ├── schema.ts         # SQLite 스키마와 기본 유형·상태
│   ├── database.ts       # DB 연결, 트랜잭션, 초기화
│   ├── seed.ts           # 테스트 데이터
│   ├── repository.ts     # 데이터 조회·저장과 업무 규칙
│   └── http.ts           # API 요청 검증과 오류 응답
├── lib/server-meetings.ts # 회의록 화면용 데이터 변환
└── styles/
scripts/seed.ts           # 반복 실행 가능한 시드 명령
test/sqlite.test.ts      # 저장·무결성·재실행 테스트
data/                   # 로컬 DB (Git 제외)
docs/                   # 설계 및 실행 문서
supabase/               # 이전 Supabase 스키마 자료 (현재 런타임에서 사용하지 않음)
```

## 주요 동작

- 티켓 접수·편집·삭제, 팀 배정, 상태 변경, 댓글과 이력 저장
- 담당 팀 없는 티켓의 배정 차단, 신규 상태로 되돌릴 때 팀·담당자 해제
- 팀·구성원 편집을 하나의 트랜잭션으로 저장, 하위 팀이 있는 팀의 삭제 차단
- 회의록 Markdown 렌더링, 실제 댓글 수, 관련 티켓 상세 모달 연결
- 티켓 삭제 시 댓글·이력·회의록 연결 정리

## API

- `GET/POST/PATCH/DELETE /api/tickets`
- `GET /api/ticket-comments?ticket_id=T-102`, `POST /api/ticket-comments`
- `GET/POST /api/meeting-comments` (`GET`에 `slug`를 지정하면 해당 회의록 댓글 조회)
- `GET/POST /api/meetings`
- `GET/POST/PATCH/DELETE /api/organization`

## 검증과 빌드

```bash
npm test
npx astro check
npm run build
node dist/server/entry.mjs
```

테스트는 임시 DB를 사용하며 개발 DB를 수정하지 않습니다.
배포 시에도 Node.js 22.18 이상과 쓰기 가능한 영속 디스크가 필요합니다.
자세한 내용은 [아키텍처](docs/architecture.md), [실행·이식 가이드](docs/migration-guide.md)를 참고하세요.
