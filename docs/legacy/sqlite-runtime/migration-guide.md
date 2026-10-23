# 로컬 실행과 서버 이식

현재 버전은 SQLite를 사용합니다. Supabase 프로젝트, CLI, REST API 키는 필요하지 않습니다.

## 준비

- Node.js 22.18 이상
- npm
- SQLite 파일을 저장할 쓰기 가능한 디렉터리

```bash
npm ci
npm run db:seed
npm run dev
```

화면은 `/meetings`, `/tickets`, `/organization`에서 확인합니다.
DB 기본 경로는 `data/codystat.sqlite`이며 `SQLITE_PATH` 환경 변수로 변경할 수 있습니다.
선택적으로 `.env.example`을 `.env`에 복사해 설정합니다.

## 테스트 데이터

처음 실행하면 팀 4개, 구성원 10명, 티켓 18개, 회의록 8개 및 댓글·이력·연결 데이터를 넣습니다.
`npm run db:seed`는 이미 시드가 적용된 DB를 변경하지 않습니다.
빈 DB를 원하면 새 `SQLITE_PATH`와 `SQLITE_SEED=0`을 설정하고 서버를 시작합니다.
기존 DB에 `SQLITE_SEED=0`을 지정해도 이미 저장된 데이터는 삭제되지 않습니다.

## 배포

```bash
npm test
npm run build
SQLITE_PATH=/absolute/path/to/data/codystat.sqlite SQLITE_SEED=0 node dist/server/entry.mjs
```

DB 파일은 빌드 결과에 포함되지 않습니다. 배포 시 `SQLITE_PATH`를 영속 디스크로 지정하세요.
포트와 호스트는 `PORT`, `HOST` 환경 변수로 설정합니다.
서버를 시작하는 프로세스에 환경 변수를 주입하세요. 직접 `node`로 실행하는 경우 `.env`가 자동 로드되지 않습니다.

## 데이터 이동

DB를 사용하는 서버를 종료한 뒤 SQLite 파일을 옮기고 새 서버의 `SQLITE_PATH`를 지정합니다.
WAL 모드에서 실행 중인 DB의 본체 파일만 복사하면 최근 변경이 빠질 수 있습니다.
실행 중 백업은 SQLite backup 기능을 사용하세요.

기존 `supabase/migrations/`와 `supabase/seed.example.sql`은 이전 PostgreSQL 구현 자료이며
SQLite에 직접 적용하지 않습니다. 현재 스키마는 `src/lib/server/schema.ts`를 기준으로 합니다.
