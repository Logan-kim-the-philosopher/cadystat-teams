# 시스템 아키텍처

## 개요

Codystat-Teams는 Astro Node 서버와 Supabase(PostgreSQL)를 사용하는 단일 웹 애플리케이션입니다.

```text
Browser
  └─ Astro pages + React islands
       └─ /api/* (Astro server endpoints)
            └─ Supabase REST API / RPC
                 └─ PostgreSQL
```

외부 업무 관리 서비스나 별도의 애플리케이션 서버는 필요하지 않습니다.

## 책임 경계

### 프론트엔드
- `src/pages/*.astro`: 페이지 조합과 서버 렌더링
- `src/components/app/*.tsx`: 티켓 보드, 조직도 등 상호작용 기능
- `src/components/ui/`: 재사용 가능한 shadcn 스타일 UI
- 브라우저는 `/api/*`만 호출하며 Supabase service-role 키를 직접 사용하지 않습니다.

### 서버 API
- `src/pages/api/tickets/index.ts`: 티켓 CRUD와 상태 변경 규칙
- `src/pages/api/ticket-comments.ts`: 티켓 댓글
- `src/pages/api/meetings/index.ts`: 회의록
- `src/pages/api/meeting-comments.ts`: 회의록 댓글
- `src/pages/api/organization/index.ts`: 팀·구성원·조직도

API 엔드포인트는 Supabase REST API를 서버에서 호출하며, 조직 팀 편집은 `save_organization_team` RPC를 사용합니다.

### 데이터베이스
- 모든 영속 데이터의 원본은 Supabase입니다.
- 스키마 변경은 `supabase/migrations/`의 순차 마이그레이션으로 관리합니다.
- 현재 구조는 인증/권한보다 애플리케이션 API와 데이터 모델 이식에 초점을 둡니다. 운영 환경에서는 인증과 API 권한 정책을 별도로 추가해야 합니다.

## 상태 흐름

티켓 상태는 `신규 → 배정 → 완료` 흐름을 기본으로 합니다.

- 담당 팀이 없는 티켓은 `배정`으로 이동할 수 없습니다.
- `신규`로 되돌리면 담당 팀과 팀별 배정이 해제됩니다.
- `완료` 상태에서도 담당 팀 정보는 유지됩니다.
- 모든 변경은 `ticket_history`에 기록됩니다.

## 이식 시 변경 지점

1. `.env.example`을 복사해 Supabase URL과 service-role 키를 주입합니다.
2. `supabase db push`로 마이그레이션을 적용합니다.
3. 조직과 초기 티켓 유형·상태 데이터를 준비합니다.
4. 배포 플랫폼에서 Node adapter로 Astro 서버를 실행합니다.
5. 인증을 붙이는 경우 API 라우트의 요청 검증과 Supabase RLS 정책을 함께 추가합니다.
