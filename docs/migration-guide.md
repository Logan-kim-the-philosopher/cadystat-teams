# 서비스 이식 가이드

다른 개발자가 이 프로젝트를 자신의 서버와 Supabase 프로젝트로 옮기는 절차입니다.

## 요구 사항

- Node.js 20 이상
- npm
- Supabase CLI
- 새 Supabase 프로젝트

## 1. 코드 준비

```bash
git clone <repository-url>
cd codystat-teams
npm install
cp .env.example .env
```

`.env`에는 실제 값을 로컬 파일 또는 비밀 관리 도구로 주입합니다. 비밀값을 커밋하지 마세요.

필수 환경 변수:

```text
CODY_STAT_SUPABASE_URL=https://<project-ref>.supabase.co
CODY_STAT_SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
```

`CODY_STAT_SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용해야 하며 브라우저 번들에 포함하면 안 됩니다.

## 2. Supabase 연결과 스키마 적용

Supabase 프로젝트에 로그인하고 연결합니다.

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
supabase migration list
```

마이그레이션에는 조직, 구성원, 티켓, 티켓 이력, 회의록, 댓글, 관계 테이블과 조직 저장 RPC가 포함됩니다.

기존 데이터를 이식할 때는 먼저 테이블 구조를 확인한 뒤 `teams`, `members`, `ticket_types`, `ticket_statuses` 순서로 넣고, 티켓과 회의록을 연결합니다.

## 3. 로컬 실행

```bash
npm run dev
```

기본 화면:

- `/`: 대시보드
- `/organization`: 조직도
- `/tickets`: 티켓 보드
- `/meetings`: 회의록

## 4. 배포

Provider-neutral Node 배포를 위해 Astro Node adapter를 사용합니다.

```bash
npm run build
node ./dist/server/entry.mjs
```

배포 서버에 다음을 설정합니다.

- `HOST` 및 `PORT`는 호스팅 환경의 규칙에 맞게 설정
- `CODY_STAT_SUPABASE_URL`
- `CODY_STAT_SUPABASE_SERVICE_ROLE_KEY`

실제 배포 전에 `npm run build`, 조직도 조회, 티켓 생성·상태 변경, 회의록 조회를 확인합니다.

## 5. 기능별 이식 포인트

### 조직도
`src/pages/api/organization/index.ts`가 `teams`와 `members`를 조회·수정합니다. 조직 저장 RPC는 `supabase/migrations/20250910010000_save_organization_team_rpc.sql` 및 최신 보정 마이그레이션에서 정의됩니다.

### 티켓
`src/pages/api/tickets/index.ts`에서 상태 이동 규칙과 팀 배정 검증을 확인합니다. 티켓에 필요한 외래 키와 상태 데이터는 티켓 관련 마이그레이션을 그대로 적용해야 합니다.

### 회의록
회의록 본문은 Markdown 문자열로 저장하고, 댓글과 관련 티켓은 별도 관계 테이블을 사용합니다.

## 6. 운영 전 점검

- service-role 키가 클라이언트 코드나 로그에 노출되지 않는지 확인
- Supabase 백업과 복구 절차 마련
- API 인증·인가 추가
- CORS와 rate limit 설정
- 빈 데이터베이스에서 마이그레이션을 처음부터 재현
- `npm run build`와 주요 화면의 브라우저 검증
