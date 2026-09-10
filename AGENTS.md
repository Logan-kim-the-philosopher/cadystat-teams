# Project Agent Instructions

## 데이터 및 API 규칙

- 조직도, 팀, 구성원, 티켓, 회의록 데이터는 Supabase를 단일 원본으로 사용한다.
- Plane API와 Plane 관련 환경 변수는 사용하지 않는다.
- Supabase CLI로 스키마 변경을 관리한다:
  - 변경 전 `supabase db push --dry-run`
  - 적용 후 `supabase db push`
  - 적용 상태는 `supabase migration list`로 확인
- 실제 비밀값은 출력하거나 파일에 저장하지 않는다. 환경 변수 이름과 빈 placeholder만 `.env.example`에 기록한다.
- 조직 관계값은 Supabase UUID를 사용한다:
  - 구성원 `reports_to`
  - 팀 `parent_team_id`
  - 팀 `lead_member_id`
- 조직 API 변경 후 `GET /api/organization`으로 팀·구성원 및 관계 필드를 검증한다.

## 검증 순서

1. 관련 Supabase API 또는 CLI 명령으로 변경 사항 확인
2. `GET /api/organization`에서 teams/members 및 관계 필드 확인
3. `npm run build`
4. 브라우저에서 조직도 노드와 팀·구성원 관계 확인

## 커밋 및 배포

- 관련 없는 파일은 변경하지 않는다.
- 커밋 전 `git status`와 `git diff --check`를 확인한다.
- 사용자가 명시적으로 요청한 경우에만 커밋하거나 공개 원격 저장소에 push한다.
