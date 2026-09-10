# Project Agent Instructions

## Plane API 작업 규칙

- Plane API 키는 Bitwarden Secrets Manager에서 `bws secret get` 또는 `bws run`으로 런타임 주입한다. 키 값은 출력하거나 파일에 저장하지 않는다.
- API 호출 전 설정 존재 여부를 확인한다: `PLANE_BASE_URL`, `PLANE_WORKSPACE_SLUG`, `PLANE_API_KEY`.
- 현재 Plane API의 기본 URL은 `https://api.plane.so`이며 인증 헤더는 `X-API-Key`이다.
- 기존 Work Item 커스텀 속성 조회/수정 endpoint:
  - `GET/PATCH /api/v1/workspaces/{workspace_slug}/projects/{project_id}/work-items/{work_item_id}/properties/`
  - PATCH body는 속성 ID가 아니라 속성 이름을 키로 사용한다. 예: `{ "custom_fields": { "reports_to": "<work-item-id>" } }`.
  - 상위자가 없는 관계 속성은 빈 문자열(`""`)이 아니라 `null`로 저장한다.
- 새 커스텀 속성 생성 endpoint는 다음 공식 경로를 사용한다:
  - `POST /api/v1/workspaces/{workspace_slug}/projects/{project_id}/work-item-types/{type_id}/work-item-properties/`
  - body에 `display_name`, `property_type`, 필요 시 `options`, `is_required`, `is_active`를 포함한다.
  - 생성 후 반환된 property ID를 기록하고, 반드시 GET으로 실제 생성 여부를 확인한다.
- 기존 속성 수정 성공과 새 속성 생성 실패를 권한 문제로 단정하지 않는다. 응답 상태와 body를 확인한다.
  - `403`은 payload 오류일 수도 있다(예: 관계 필드에 빈 문자열 전달).
  - `404`는 API 경로가 틀렸을 가능성이 높다. 공식 Plane API 문서에서 endpoint를 먼저 확인한다.
  - PATCH가 성공 상태를 반환해도 응답의 실제 저장값을 검증한다. Plane 일부 endpoint는 전달하지 않은 필드를 무시할 수 있다.
- 팀 Project ID와 팀 Work Item ID는 서로 다르다. 구성원과 팀 Work Item에 `team_project_id`를 저장하고, 이름/슬러그 또는 코드 하드코딩 매핑을 사용하지 않는다.
- 조직도 관계값은 Plane Work Item ID를 사용한다:
  - 구성원 `reports_to`
  - 팀 `parent_team_id`
  - 팀 `lead_member_id`
- Plane에 값을 쓰기 전 대상 Work Item의 `custom_fields` 구조와 property type을 GET으로 확인한다. 쓰기 후 같은 endpoint를 GET하여 저장값을 재검증한다.
- API 키 주입 상태로 실행한 개발 서버는 환경 변수를 상속한다. 서버 재시작 시 키 없는 별도 서버가 뜨지 않도록 기존 포트를 정리하고, `/api/plane/organization`을 호출해 200 및 팀/멤버 수를 확인한다.

## 검증 순서

1. Plane API endpoint 단위로 GET/PATCH/POST 응답과 저장값 확인
2. `GET /api/plane/organization`에서 teams/members 및 관계 필드 확인
3. `npm run build`
4. 브라우저에서 조직도 노드와 팀/멤버 엣지 확인
