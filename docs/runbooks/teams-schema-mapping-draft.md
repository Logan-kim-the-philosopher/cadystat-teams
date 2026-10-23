# Teams 스키마 매핑 초안

## 범위와 신뢰 경계

이 초안은 저장소에 체크인된 migration을 비교한 **설계 자료**입니다. 운영 DB, 실제 migration history, 데이터, project ref에는 접속하지 않았습니다. 운영 source와 새 Teams target은 담당자가 확인해야 합니다. 이 문서는 데이터 이전이나 운영 변경을 승인하지 않습니다.

- Source 코드 기준: `/Users/hskim/Projects/cody-stat`의 `main` 및 `supabase/migrations/202509*.sql`
- Target 코드 기준: `/Users/hskim/Projects/cody-stat-teams-integration`의 `supabase/migrations/202609*.sql`, `202610*.sql`
- Source worktree에는 `20250910020000_create_organization_team_rpc.sql` 및 `20250910030000_fix_organization_rpc_columns.sql`이 **untracked** 상태입니다. 이를 체크인 migration history 또는 운영에 적용된 증거로 간주하지 않습니다.
- 각 DB의 실제 적용 상태는 저장소 migration 목록만으로 알 수 없습니다. 운영 cutover 전 실제 migration history와 schema를 승인된 읽기 전용 절차로 확인해야 합니다.

## 핵심 결론과 선행 차단 조건

1. Team·member·ticket·meeting의 중심 테이블은 겹치지만, source의 회의 댓글/티켓 연결은 `meeting_slug` 기반이 섞여 있고 target은 `meeting_note_id` FK를 요구합니다. 단순 테이블 복사는 불가능합니다.
2. Source 코드에서 파생된 최신 회의 URL slug는 `meeting_notes.id` 문자열입니다. 하지만 source의 API는 임의 `meeting_slug`로 댓글을 저장할 수 있고, `meeting_notes`에 slug 컬럼은 없습니다. 기존 slug가 note UUID가 아닌 경우 자동 매핑 근거가 없습니다. 미매핑 댓글/연결이 있으면 import를 중단하고 수동 매핑 또는 별도 보존 정책을 승인받아야 합니다.
3. 현재 Cody Stat `main`의 migration에는 `meeting_api_keys`, `meeting_api_uploads`, `meeting_api_mutations`, `meeting_api_key_role_events`, `ticket_api_mutations`가 없습니다. 사용자가 결정한 기존 key 유지는 이 DB migration 집합만으로 구현할 수 없습니다. **현재 외부 Teams API를 실제로 제공하는 DB가 따로 있다면, 그 DB가 key와 idempotency 이력의 원본인지 먼저 확인해야 합니다.** key 원문을 읽거나 이동하지 않습니다.
4. `scripts/teams-data-integrity.sql`은 target Teams 전체 스키마 전용입니다. API ledger 테이블이 없는 legacy source에서는 실행할 수 없으며, source 검증을 대신하지 않습니다.

## 테이블별 매핑 초안

| 영역 | Source (`cody-stat/main`) | Target (`cody-stat-teams-integration`) | 권고 및 검증 |
|---|---|---|---|
| 팀 | `teams(id, name, parent_team_id, lead_member_id, created_at, updated_at)`; 초기 `description`은 migration으로 제거, Plane 열도 제거됨 | 동일 핵심 ID/FK; `name` unique 및 공백 제한, 부모 self-reference 금지 | 팀 UUID 유지. 부모부터 삽입. source에 중복 이름·빈 이름·자기 부모가 있는지 확인하고 target 제약 위반이면 중단. description/Plane 정보는 현재 checked-in source schema에서 가져올 수 없음. |
| 구성원 | `members(id, name, title, gender, team_id, reports_to, sort_order, created_at, updated_at)`; `team_id` 필수, `reports_to` 삭제 규칙은 `RESTRICT` | 같은 핵심 필드; `name` nonblank, `sort_order >= 0`, 자기 보고 금지, `reports_to` 삭제 규칙 `SET NULL` | member UUID와 team UUID 유지. 팀 삽입 후 member를 복사하고, lead/reports-to 관계를 적용. 음수 sort order·빈 이름·self-report를 검사. 삭제 동작 차이는 import 중 직접 변경은 없지만 사후 동작이 달라짐을 기록. |
| 티켓 유형 | `ticket_types(id, name, created_at)`, 이름 unique | 같은 구조, 이름 nonblank 제약 | source/target seed UUID가 같다고 가정하지 않음. 외부 client가 `typeId`를 참조할 수 있으므로 source ID 보존을 우선 검토하고, target seed row와 충돌하지 않는 방식을 rehearsal에서 확정. 이름과 ID 대응표 보존. |
| 티켓 상태 | `ticket_statuses(id, name, sort_order, created_at)`; checked-in migration은 최종 상태를 `신규/배정/완료`로 축약 | 상태 이름 allowlist, `sort_order` unique 및 0–2 제한 | 최신 source migration이 실제 적용됐다면 이름 기준 대응. 구 상태 `담당 배정/진행 중/보류`가 남아 있으면 `배정`으로의 정보 축약을 승인하거나 중단. UUID를 외부에서 쓰는지 확인 후 ID 보존 방식을 결정. |
| 티켓 | `tickets(id, ticket_number, title, description, team_id nullable, assignee_id, type_id nullable, status_id nullable, created_at, updated_at)`; legacy `summary/reporter/priority` 제거됨 | 유사 필드; type/status는 NOT NULL, title nonblank | ticket UUID와 `ticket_number` 유지. 모든 팀원·유형·상태를 먼저 대응. `type_id/status_id`가 null이거나 target에 매핑되지 않으면 자동 기본값으로 덮지 말고 중단/승인. source에 제거 전 컬럼의 live 데이터가 있는지는 실제 schema 확인 필요. |
| 티켓 번호 sequence | `ticket_number_seq` 시작 1000, `ticket_number` default 사용 | 동일 sequence 시작값 및 default | 명시적 ticket 번호를 복사한 뒤 source sequence의 현재 상태를 반영하고, `nextval` 결과가 target 기존 번호와 충돌하지 않는지 검증. 단순 max 번호만으로 source의 sequence 소비 이력을 대체하지 않음. |
| 티켓 댓글·이력 | `ticket_comments`, `ticket_history`; FK ticket cascade, 본문/event는 not-null | 같은 핵심 열과 FK; 댓글 작성자/본문 및 history event에 nonblank 제약 강화 | 댓글·이력 UUID와 원래 시각을 유지. 공백 데이터 검사. 티켓보다 뒤에 복사. 삭제 cascade는 target에서도 동일. |
| 회의록 | `meeting_notes(id,title,meeting_date,content,status,next_meeting_at)`; checked-in source schema에는 `created_at/updated_at/deleted_at` 없음 | 동일 도메인 필드 + `created_at/updated_at`, `deleted_at`; status 범위 동일 | 회의록 UUID, 내용, status, 일정, 삭제 상태( source의 실제 schema에 있다면) 보존. source migration 기준으로 created/updated 원시각이 없으므로 target default는 import 시각이 됨; 원래 시각으로 오인하지 않도록 문서화. |
| 회의록 댓글 | source `meeting_comments(id, meeting_slug, meeting_note_id nullable, author, body, created_at)`; API는 `meeting_slug`로 저장 | target `meeting_comments(id, meeting_note_id NOT NULL FK, author, body, created_at)`; slug 열 없음 | `meeting_note_id`가 이미 유효하면 우선 사용. 아니면 slug가 실제 note UUID인지 확인. UUID가 아닌 slug는 승인된 1:1 매핑표가 없으면 import 중단; 고아 댓글을 버리지 않음. ID·author·body·created_at 보존. |
| 회의록-티켓 연결 | source `meeting_note_tickets(meeting_slug, ticket_id)` + 후속 nullable `meeting_note_id`; PK는 slug/ticket | target `(meeting_note_id, ticket_id)` not-null PK, 둘 다 FK | 이미 유효한 note ID가 있으면 사용, 아니면 slug 매핑표 적용. ticket UUID 유지. 변환 후 중복 `(meeting_note_id,ticket_id)`는 조사; 조용히 삭제하지 않음. 모든 FK 검증. |
| API key 및 ledger | source main의 checked-in migration에는 없음 | target에 `meeting_api_keys`, upload/mutation ledger, key role events, ticket mutation ledger | 실제 key가 있는 source DB를 별도로 식별. key row ID/hash/prefix/name/role/expiry/revocation/사용 상태와 FK ledger를 보존하되 hash 외 secret은 취급하지 않음. idempotency 보장을 위해 upload·meeting mutation·ticket mutation 기록 및 참조 대상 UUID도 보존. 원본 DB가 없으면 key 유지 요구를 만족하는 데이터가 없으므로 중단. |
| 권한·사용자 | source migration에는 app user/role 테이블 없음 | target migration에도 조직 member 외 SSO user/role 테이블 없음; `teams_runtime` DB role 별도 | 조직 구성원을 인증 사용자나 권한으로 자동 간주하지 않음. Codyspace SSO/사용자 권한은 별도 계약 후 처리. target runtime 권한 migration은 target에만 적용. |

## 권고 import 순서 (구현 전 검토용)

이 순서는 코드나 운영 명령이 아닙니다. source 식별·실제 schema 확인·rehearsal 없이 실행하지 마세요.

1. 승인된 source/target schema fingerprint와 row-count snapshot을 각각 수집합니다. source용 검증 SQL과 target용 SQL은 분리합니다.
2. 정규화된 name lookup을 포함해 ticket type/status ID 대응표를 확정합니다. 가능한 경우 공개 API가 쓰는 ID를 보존합니다.
3. teams를 parent 순으로 넣고, members를 넣은 뒤 lead/reports-to FK를 연결합니다.
4. ticket types/statuses, tickets, ticket comments/history를 참조 순서대로 넣고 ticket sequence 상태를 복구합니다.
5. meetings를 넣습니다. `meeting_slug → meeting_note_id` 매핑을 사전 검증하고, 댓글/연결을 넣습니다. 미매핑·중복은 중단 사유입니다.
6. 실제 key 원본을 식별한 경우 key row와 종속 idempotency/role-event ledger를 같은 ID로 복사하고, 관련 meeting/ticket ID가 유지되는지 확인합니다.
7. target 스키마 제약, 전체 row count, FK, ticket number/sequence, request idempotency 재실행 동작을 검증합니다. 모든 차이가 설명되고 승인되기 전에는 cutover하지 않습니다.

## 운영 담당자와 함께 확인할 사항 / 차단 목록

실무 작업에서 DB 접근 권한이 있는 담당자와 아래 항목을 확인합니다. project ref·URL·key 값은 이 문서나 채팅에 기록하지 말고, `legacy-source`, `current-teams`, `new-teams-target` 같은 승인된 별칭만 사용합니다. DB 확인은 담당자가 승인한 읽기 전용 연결과 집계 결과만 사용하며, 원문 댓글·slug·key hash는 공유하지 않습니다.

- [ ] 현재 Teams 앱이 실제로 쓰는 DB 별칭과 새 target 별칭을 담당자가 식별
- [ ] 데이터 원본이 legacy Cody Stat DB인지, 현재 배포된 Teams DB인지, 또는 둘 다인지 확인하고 도메인별 authoritative source 지정
- [ ] 양쪽 DB의 실제 적용 migration 버전/schema fingerprint 확인. 저장소 migration 파일만으로 운영 적용 상태를 추정하지 않음
- [ ] 기존 API key/ledger가 있는 DB를 식별하고 활성·폐기·만료 key 수만 집계. key 값/hash는 출력하거나 전달하지 않음
- [ ] source `meeting_comments`와 `meeting_note_tickets`에서 `meeting_note_id IS NULL` 행 수, slug를 note UUID로 연결할 수 있는 행 수, 미매핑 행 수를 집계. 실제 slug/댓글 값은 출력하지 않음
- [ ] source ticket sequence 상태와 실제 live schema가 저장소 migration과 일치하는지 확인
- [ ] type/status IDs를 보존할지, target seed IDs를 사용할지 API consumer 영향 확인
- [ ] source DB에서 target 추가 제약을 위반할 데이터의 대응 정책 승인
- [ ] 별도 임시 환경에서 전체 import와 반복 실행·복구 시험 통과

## 근거 migration

- Source: `20250909013000_create_organization_tables.sql`, `20250909020000_create_ticket_tables.sql`, `20250909023000_allow_unassigned_tickets.sql`, `20250909024000_normalize_ticket_statuses.sql`, `20250910000000_remove_unused_ticket_fields.sql`, `20250910001000_simplify_ticket_statuses.sql`, `20250910002000_add_ticket_number_default.sql`, `20250910003000_add_ticket_history.sql`, `20250910004000_create_meeting_comments.sql`, `20250910011000_create_meeting_note_tickets.sql`, `20250910012000_create_meeting_notes.sql`, `20250910013000_add_meeting_note_id_relation.sql`, `20250911000000_remove_plane_legacy_columns.sql`, `20250911001000_add_next_meeting_to_notes.sql`.
- Target: `20260915020000_create_teams_core.sql`, `20260915021000_create_teams_tickets.sql`, `20260915022000_create_teams_meetings.sql`, `20260915023000_create_teams_rpcs.sql`, `20260915024000_add_organization_crud_rpcs.sql`, `20260915025000_add_ticket_crud_rpcs.sql`, `20260915030000_add_meeting_rpcs.sql`, `20260929083000_add_meeting_soft_delete.sql`, `20260929091000_add_meeting_upload_api.sql`, `20261001060000_meeting_feedback.sql`, `20261001061000_preserve_organization_reports.sql`, `20261001080000_teams_admin_api.sql`, `20261012090000_transfer_teams_runtime_access.sql`, `20261013090000_add_next_meeting_schedule.sql`, `20261014090000_team_deletion_ticket_strategy.sql`.
