# Teams Supabase

이 디렉터리는 Teams 테이블·RPC·RLS·개발 seed의 단일 migration 원본입니다. Cody Stat 저장소의 같은 migration은 독립 전환이 끝날 때까지의 동결 사본이며, 새 Teams DB 변경은 이 저장소에만 추가합니다.

- `migrations/`: 재현 가능한 Teams schema와 권한 변경
- `seed/`: 로컬 개발·검증용 합성 데이터
- `tests/database/`: pgTAP schema·업무 규칙·최소 권한 검사
- `config.toml`: `codystat_teams` 로컬 Supabase stack

```bash
npm run db:start
npm run db:reset
npm run db:migrations
npm run db:test
npm run db:lint
npm run db:restore-smoke
```

`db:reset`과 seed는 로컬 DB에서만 실행합니다. 운영 환경은 먼저 논리 백업, row count·참조 무결성 snapshot, dry-run과 복구 연습을 거쳐야 합니다.

애플리케이션은 공용 `service_role` key를 받지 않습니다. 플랫폼이 발급한 `teams_runtime` JWT와 publishable key만 서버 secret으로 주입합니다. `teams_runtime`은 RLS를 우회하지 않으며 Teams 화면에 필요한 조회, 제한된 직접 변경, Teams RPC 실행 권한만 가집니다.

Admission 사용자 원장은 이 DB에 복제하지 않습니다. 사용자 연결이 필요해지면 Admission의 불변 `sub`를 별도 nullable 참조 열에 저장하고, 이메일·전화번호·세션·권한은 Admission에 남깁니다.
