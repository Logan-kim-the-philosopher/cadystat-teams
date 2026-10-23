# Codystat-Teams

조직도, 티켓, 회의록과 외부 agent API를 제공하는 독립 Teams 서비스입니다. 희성님이 애플리케이션과 Teams 데이터 변경을 관리하고 Cody Stat 플랫폼은 배포·도메인·Gateway 라우팅을 제공합니다.

## 기능

- 조직·팀·구성원 조회와 편집
- 티켓 생성, 배정, 상태 이동, 댓글과 변경 이력
- Markdown·Mermaid 회의록 조회, 생성, 수정, soft delete와 댓글
- 회의록에서 새 티켓 생성 및 기존 티켓 연결
- `/api/teams/*` 브라우저 API
- `/api/v1/*` 외부·agent API의 key 역할, idempotency와 rate limit

`/`는 `/teams/meetings`로 이동합니다. 주요 화면은 다음과 같습니다.

- `/teams/meetings`
- `/teams/tickets`
- `/teams/organization`

## 로컬 실행

Node.js 22.18 이상, Docker Desktop과 Teams migration이 적용된 Supabase가 필요합니다.

```bash
npm ci
npm run db:start
npm run db:reset
npm run dev:local
```

`dev:local`은 로컬 Supabase 상태를 읽어 메모리에서만 `teams_runtime` 토큰을 만들고 Astro에 전달합니다. 토큰 원문을 파일이나 출력에 남기지 않습니다. 운영·공유 개발 환경에서는 아래 환경 변수를 배포 secret으로 주입하고 `npm run dev` 또는 빌드 서버를 실행합니다.

서버 전용 환경 변수:

```dotenv
TEAMS_SUPABASE_URL=
TEAMS_SUPABASE_PUBLISHABLE_KEY=
TEAMS_SUPABASE_ACCESS_TOKEN=
```

Teams 애플리케이션에는 공용 `service_role` key를 주입하지 않습니다. `TEAMS_SUPABASE_ACCESS_TOKEN`은 RLS를 우회하지 않는 `teams_runtime` 역할 전용 JWT여야 하며, 서버 시작 시 역할을 확인합니다. access token에 `PUBLIC_` 접두사를 붙이거나 브라우저 bundle·로그에 원문을 넣지 않습니다.

`PUBLIC_CODY_STAT_HOME_URL`은 헤더의 “Cody Stat” 링크가 이동할 Playground 주소입니다. 기본값은 `https://codystat.com/`입니다.

## 인증 경계

현재 앱은 사용자 로그인을 직접 검증하지 않습니다. middleware는 cross-origin 변경 요청만 거부하며, `/api/teams/*` 변경 API는 앱 안에서 익명 접근을 허용합니다. 따라서 `/teams/*`와 `/api/teams/*`는 배포 Gateway로 보호하고, Astro origin에 Gateway를 우회해 직접 접근할 수 없게 해야 합니다. `/api/v1/*`의 API key 인증은 별도 경계이며 브라우저 API 인증을 대신하지 않습니다. 배포 전 Gateway 경로와 origin 제한을 확인하세요. Codyspace SSO는 연동 계약이 확정될 때까지 별도로 보류합니다.

## 검증

```bash
npm run check
npm test
npm run build
npm run db:test
npm run db:lint
npm run db:restore-smoke
```

Supabase 로컬 환경이 준비된 경우 다음 통합 검증을 추가로 실행합니다.

```bash
npm run test:organization-api
npm run test:ticket-api
npm run test:meeting-api
npm run test:meeting-upload
npm run test:meeting-feedback
npm run test:teams-admin
```

통합 테스트는 테스트 중 만든 레코드만 정리하며 운영 DB를 대상으로 실행하지 않습니다.

## API 문서

- [회의록 업로드 API](docs/guides/meeting-api-agent-guide.md)
- [회의록 수정·삭제 API](docs/guides/meeting-mutation-api-agent-guide.md)
- [Teams 관리자 API](docs/guides/teams-admin-api-agent-guide.md)

API key 원문은 발급 시 한 번만 전달합니다. 현재 key 도구는 Admission 도입 전 계약을 보존하기 위한 것이며, 사람의 관리자 권한을 대신하지 않습니다.

```bash
npm run meeting-keys -- issue --name "개발자 이름" --days 30
npm run meeting-keys -- list
npm run meeting-keys -- set-role <키-ID> --role teams_admin
npm run meeting-keys -- revoke <키-ID>
```

## 저장소 경계

- 이 저장소: Teams UI, 도메인 로직, API, Teams migration과 테스트
- Cody Stat: Playground 서비스 카드와 Teams 외부 링크
- 플랫폼: 컨테이너 배포, secret 주입, `teams.codystat.com`과 Gateway
- Admission: 사용자·조직·권한, 사용자 token과 개발자 API key

Teams DB 변경은 이 저장소의 `supabase/migrations`에만 추가합니다. 2025년 migration 시도와 SQLite 문서는 `docs/legacy`에 감사 자료로 보존하며 현재 실행 경로에서는 사용하지 않습니다. 운영 DB에는 `reset`이나 개발 seed를 실행하지 않습니다.

용재님과의 DB·SSO 협의는 [Teams 협업 착수 안내](docs/runbooks/teams-collaboration-handoff.md)부터 시작하세요. 데이터 분리 전환·검증·복구 절차는 [Teams 데이터 분리 runbook](docs/runbooks/teams-data-separation.md)을 따릅니다. 두 문서 모두 절차 안내이며 운영 DB 변경이나 데이터 이전을 승인하지 않습니다.
