# Teams 데이터 분리 전환 runbook

## 목적과 전환 결정

Teams는 **전용 Supabase 프로젝트**를 target으로 사용합니다. source 후보는 현재 Cody Stat 앱이 사용하는 Supabase/Postgres입니다. 이 문서는 전환 준비와 검증 절차를 정의하며, 운영 DB migration 적용·데이터 복사·트래픽 전환을 승인하지 않습니다.

현재 저장소에는 Teams target schema migration, 읽기 전용 무결성 snapshot, 로컬 export/restore 검증, runtime 권한 migration과 권한 복구 SQL이 있습니다. **source에서 새 target으로 데이터를 옮기는 운영 복사 스크립트는 없습니다.** 저장소 migration 비교 결과와 매핑 차단 조건은 [스키마 매핑 초안](teams-schema-mapping-draft.md)을 참고하세요.

현재 Cody Stat `main`의 migration에는 회의록 agent API key/ledger 테이블이 없습니다. 기존 key를 유지하려면 실제 key를 발급·검증하는 Teams DB가 어느 source인지 별도로 확인해야 합니다. 기존 Teams DB와 legacy Cody Stat DB가 다르면 source가 둘 이상일 수 있습니다.

## 중단 조건

아래 항목 중 하나라도 확인되지 않으면 운영 전환을 시작하지 마세요.

- **DB 식별:** DB 접근 권한이 있는 담당자와 함께 현재 Teams 앱이 쓰는 실제 source 및 전용 target을 확인합니다. legacy Cody Stat DB와 기존 Teams DB가 다를 수 있으므로 각 데이터 영역의 원본을 지정합니다. project ref, URL, key는 채팅·문서·로그에 남기지 않고 승인된 별칭만 사용합니다.
- **source schema:** 운영 source의 적용 migration과 실제 테이블·컬럼을 확인하고 이 저장소의 target schema와 매핑합니다. 이 저장소의 migration은 target에만 적용합니다.
- **복사 절차:** source → target 데이터 복사 도구, 테이블 순서, ID·sequence 보존 및 재실행 전략을 구현하고 임시 환경에서 검증합니다. 이 저장소에는 해당 도구가 없습니다. 담당자와 함께 읽기 전용 schema/migration 확인 및 aggregate 점검을 먼저 수행합니다.
- **외부 key:** 기존 key를 유지합니다. 원문은 복구할 수 없으므로 key hash·ID·역할·만료/폐기 상태와 해당 idempotency 기록을 target으로 복사합니다. key 원문은 복사하거나 출력하지 않습니다.
- **서비스 경로:** 새 앱의 runtime token 주입, Gateway route 변경, 구 앱 복귀 담당자와 순서를 확정합니다.
- **복구 목표:** 허용 중단 시간, 최종 복사 이후 쓰기 차단 방식, rollback 결정권자를 확정합니다.

**source와 target을 같은 DB로 판명하면 이 runbook을 중단하고 권한 전환 전용 절차를 다시 승인받으세요.** `20261012090000_transfer_teams_runtime_access.sql`은 적용된 DB의 `service_role` 권한을 회수합니다.

secret은 승인된 secret manager와 운영 절차로만 사용하세요. 운영 값을 명령행 인자, 문서, 출력, 임시 파일에 넣지 마세요.

## 전환 전 리허설

1. 이 저장소의 migration으로 격리된 로컬 DB를 만들고 `npm run db:reset`, `npm run db:test`, `npm run db:lint`, `npm run db:restore-smoke`를 실행합니다. `db:reset`과 seed는 로컬 DB에만 사용합니다.
2. source/target과 같은 스키마를 가진 임시 환경에서 승인된 데이터 복사 절차를 리허설합니다. `supabase/seed/teams-development.sql`은 합성 개발 데이터이며 운영 이전에 사용하지 않습니다.
3. `scripts/teams-data-integrity.sql`은 Teams target 스키마 전용 읽기 전용 snapshot이며 legacy source에는 그대로 실행할 수 없습니다. source와 target은 각각의 실제 schema에 맞는 별도 snapshot을 준비해 정규화된 결과를 비교합니다. source용 snapshot이 준비되기 전에는 행 수·참조 무결성을 비교했다고 간주하지 마세요.
4. 팀·구성원, ticket types/statuses, 티켓, 댓글·이력, 회의록·댓글·티켓 연결, API key 행과 key ID, upload·mutation idempotency 기록, role-event 기록, sequence를 매핑표에 기록합니다. key hash는 원문 없이 복사하고 모든 FK가 보존되는지 검증합니다.
5. 티켓 번호와 UUID, FK 관계, 댓글·이력, 삭제 상태, 회의록 연결 및 sequence가 보존되는지 확인합니다. 설명되지 않는 차이가 있으면 중단합니다.
6. 전용 target에서 `teams_runtime` API, 외부 API key 흐름, Gateway 보호, 새 앱과 구 앱의 분리된 DB 연결을 검증합니다.

## 운영 전환 체크리스트

각 단계는 승인된 change window에서 담당자가 확인합니다. **새 Teams migration과 데이터 import는 전용 target에만 적용하세요.**

1. source/target 담당자, 승인자, project ref, 복구 담당자와 중단 시간을 확인합니다.
2. target에 이 저장소의 migration을 적용하고 전용 앱 secret을 준비합니다. `TEAMS_SUPABASE_ACCESS_TOKEN`이 `teams_runtime` 역할인지 서버 시작 검증으로 확인합니다.
3. source 백업과 target 복구 가능성을 확인합니다. 백업 시각과 복구 확인자만 change 기록에 남깁니다.
4. 사전 리허설에서 승인한 절차로 초기 데이터 복사를 수행하고, target의 행 수·참조·sequence를 검증합니다.
5. 구 앱의 쓰기를 잠시 중지하고 최종 변경분을 복사합니다. source/target 전용 무결성 snapshot과 API smoke 결과를 비교합니다. legacy source 스키마와 target의 slug/ID 차이 및 API key 원본이 모두 매핑되지 않으면 중단하고 트래픽을 전환하지 않습니다.
6. `20261012090000_transfer_teams_runtime_access.sql`은 target 권한 정책에 필요한지 migration 계획에서 확인한 뒤 적용합니다. source에 적용하지 마세요. 이 migration은 `service_role`의 Teams 테이블·RPC 권한을 회수합니다.
7. 새 앱을 target에 연결하고 조회·쓰기, 기존 회의록 API key 인증 및 idempotency replay, Gateway 보호를 확인합니다. 구 앱이 source에만 연결되고 양쪽이 동시에 쓰지 않는지 검증한 후 트래픽을 전환합니다.
8. 검증 결과, migration 버전, snapshot 결과, key 처리 결정, 담당자와 승인을 기록합니다. secret과 개인정보는 기록하지 않습니다.

## 복구

1. 쓰기를 멈추고 Gateway를 구 앱으로 되돌립니다. 구 앱이 원래 source DB에 연결되는지 확인합니다.
2. 전환 이후 target에 생성된 데이터는 source에 자동 반영되지 않습니다. target과 source가 달라질 수 있으므로 복구 즉시 target 쓰기를 중지하고 차이를 기록합니다.
3. **target을 분리된 프로젝트로 운영하는 경우** `scripts/rollback/20261012090000_restore_service_role_access.sql`을 source에 적용하지 마세요. 이 스크립트는 같은 DB에서 runtime 권한 변경을 되돌리는 용도이며 데이터 복사나 역복사를 수행하지 않습니다.
4. target의 새 데이터를 source로 옮기거나 재전환하려면 별도 매핑·승인·리허설을 받으세요. 백업 복원이나 양방향 동기화를 즉석에서 수행하지 마세요.
5. 구 앱의 조회·쓰기, key 상태, 누락·중복 데이터 검증을 확인한 뒤 서비스 재개를 승인받습니다.

## 전환 승인 기준

- [ ] 운영 source와 전용 target이 확인됨
- [ ] source/target schema 및 데이터 매핑표 승인
- [ ] 기존 API key hash·ID·역할·상태와 idempotency 기록 보존 검증
- [ ] 양쪽 백업에서 임시 DB 복구 성공
- [ ] 데이터 복사 리허설에서 행 수·FK·sequence 검증 통과
- [ ] `npm run db:test`, `npm run db:lint`, `npm run db:restore-smoke` 통과
- [ ] 새 앱·Gateway smoke 및 rollback 리허설 통과
- [ ] change window와 운영 승인 기록 완료

```bash
# runbook 핵심 경계와 검증 자료가 유지되는지 확인
rg -n "전용 Supabase 프로젝트|운영 복사 스크립트는 없습니다|target에만 적용|target을 분리된 프로젝트|teams-data-integrity.sql" docs/runbooks/teams-data-separation.md
```
