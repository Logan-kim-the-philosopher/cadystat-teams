# Teams 협업 착수 안내

- 상태: 용재님과의 첫 기술 협의용
- 목적: DB 분리와 SSO 작업을 안전하게 시작하기 위해 먼저 확인할 사실과 결정 사항을 한곳에 모읍니다.
- 경계: 이 문서는 운영 DB 변경, 데이터 복사, SSO 구현 또는 배포 설정 변경을 승인하지 않습니다.

## 현재 확인된 상태

- Teams 앱은 독립 서비스이며, 새 저장소가 사용할 target은 **전용 Supabase 프로젝트**로 정했습니다.
- 현재 운영 앱이 실제로 사용하는 source DB와 기존 API key/idempotency 기록의 위치는 아직 확인하지 않았습니다. 저장소 migration만으로 추정하지 마세요.
- source의 `meeting_slug`와 target의 `meeting_note_id` 사이에는 자동 변환이 보장되지 않는 데이터가 있습니다. 실제 schema와 매핑을 확인해야 합니다.
- `/api/teams/*`는 앱에서 사용자 로그인을 검증하지 않습니다. 배포 Gateway가 경로를 보호하고 origin 직접 접근을 막아야 합니다. 실제 배포 설정은 확인되지 않았습니다.
- SSO 문서는 제안 초안입니다. issuer, claims, Gateway identity, 역할 정책을 담당자와 확정하기 전에는 SSO 코드를 구현하지 않습니다.
- 운영 migration, 데이터 복사, cutover는 별도 승인 전까지 하지 않습니다.

## 먼저 읽을 문서

1. [프로젝트 README](../../README.md): 서비스 경계, 로컬 실행, 인증 경계
2. [데이터 분리 runbook](teams-data-separation.md): 중단 조건, rehearsal, 전환·복구 안전선
3. [스키마 매핑 초안](teams-schema-mapping-draft.md): 저장소 migration 기준 매핑과 데이터 차단 조건
4. [Codyspace SSO 계약 초안](../codyspace-sso-integration-contract.md): 확인이 필요한 로그인·claim·역할 정책

## 첫 협의에서 확정할 항목

| 주제 | 확인할 사실·결정 | 남길 결과 |
|---|---|---|
| DB 식별 | 현재 Teams 앱이 쓰는 DB와 새 전용 target을 각각 누가 소유하고 관리하는가? 기존 API key와 ledger는 어느 DB에 있는가? | 승인된 별칭만 사용한 source/target 목록과 데이터 영역별 원본 지정 |
| 읽기 전용 확인 | 양쪽의 실제 적용 migration, schema, 핵심 행 수를 누가 어떤 승인된 연결로 확인하는가? | migration/schema 확인 결과와 민감값 없는 집계 |
| 데이터 매핑 | `meeting_slug`의 미매핑 댓글·티켓 연결, type/status ID, ticket sequence를 어떻게 처리할 것인가? | 승인된 매핑표와 중단/예외 기준 |
| API key 보존 | key hash, ID, 역할, 만료·폐기 상태와 idempotency/role-event 기록을 어느 source에서 보존할 것인가? | 복사 범위와 무결성 검증 기준. key 원문은 제외 |
| Gateway와 SSO | `/teams/*`, `/api/teams/*`, `/api/v1/*` 접근 정책과 origin 직접 접근 차단은 어떻게 확인하는가? OIDC 또는 검증된 Gateway identity 중 무엇을 쓰는가? | 확정된 인증 경계, machine identity, issuer/claims, callback 계약 |
| 책임과 승인 | schema 확인, 코드, Gateway 변경, 운영 승인, rollback 결정의 담당자는 누구인가? | 담당자별 다음 작업과 별도 승인 지점 |

**확정하지 못한 항목은 추정으로 채우지 말고 `미확정`으로 남깁니다.** DB 연결 이름이나 MCP 연결 이름만으로 실제 프로젝트를 판별하지 마세요. 프로젝트 식별은 DB 담당자와 확인합니다.

## 작업 순서와 완료 기준

1. 먼저 source, target, API key/ledger 원본을 담당자와 함께 식별합니다. 이 단계에서는 읽기 전용 확인만 합니다.
2. 실제 schema와 migration history를 저장소 기준과 비교하고, 매핑표의 차단 항목을 해결하거나 예외를 승인받습니다. slug·댓글 원문·key hash는 채팅이나 문서에 붙이지 않습니다.
3. Gateway 접근 정책과 SSO 계약을 확정합니다. 특히 브라우저 API 보호, origin 우회 차단, 비대화형 `/api/v1/*` 호출 방식을 별도로 검증합니다.
4. 승인된 source/target과 매핑이 확정된 뒤에만 데이터 복사 절차를 설계합니다. 격리 환경 rehearsal, 복구 검증과 별도 운영 승인 없이는 운영 복사나 cutover를 하지 않습니다.
5. 이 협의 단계는 source/target 별칭, mapping blockers, Gateway/SSO 결정, 담당자와 다음 승인 단계가 기록되면 완료입니다. 실제 운영 적용은 별도 단계입니다.

## 저장소와 보안 주의사항

- 작업 전 `git status --short --branch`로 현재 변경사항을 확인합니다. 기존 미커밋 파일을 보존하고, 승인 없이 `git reset --hard`, `git clean`, 다른 worktree 덮어쓰기를 하지 않습니다.
- `.env`, API key, JWT, DB URL/project ref, 사용자 데이터는 채팅·문서·로그·임시 파일에 남기지 않습니다. 승인된 secret manager와 읽기 전용 연결 절차를 사용합니다.
- `npm run db:reset`과 seed는 격리된 로컬 DB에서만 실행합니다. 운영 또는 공유 DB에서 실행하지 않습니다.
- Teams migration은 승인된 전용 target에만 적용합니다. `20261012090000_transfer_teams_runtime_access.sql`은 source에 적용하지 마세요. 그 rollback SQL은 데이터 복사/역복사를 하지 않습니다.
- 운영 DB 변경, 데이터 복사, Gateway 설정 변경, 사용자 권한 변경은 각각 별도 승인을 받습니다.

## 다음 단계

용재님과 첫 협의에서 위 표의 미확정 항목에 담당자와 확인 방법을 지정하세요. 결과는 승인된 별칭, 결정, 미해결 blocker만 기록하고, secret과 원시 데이터를 포함하지 않습니다. 기술 검증이 필요하면 [데이터 분리 runbook](teams-data-separation.md)의 rehearsal 절차부터 별도로 승인받아 진행합니다.
