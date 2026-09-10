# 프로젝트 구조

## 목표
Codystat-Teams는 Astro와 Supabase로 조직, 티켓, 회의록을 관리하는 중앙 운영 포털입니다.

## 디렉토리 구조
```text
Codystat-Teams/
├─ README.md
├─ docs/
│  ├─ screen-design.md
│  ├─ data-model.md
│  ├─ organization-schema.md
│  └─ project-structure.md
├─ src/
│  ├─ components/
│  ├─ layouts/
│  ├─ pages/
│  ├─ lib/
│  └─ styles/
├─ public/
└─ supabase/
   ├─ migrations/
   └─ config.toml
```

## 폴더 역할

### docs/
현재 서비스의 화면, 데이터 모델, 조직 스키마를 설명합니다.

### src/
Astro 페이지와 React 섬, API 라우트가 들어 있습니다.

- `components/`: 조직도, 티켓, 회의록 및 공통 UI
- `layouts/`: 사이트 공통 레이아웃
- `pages/`: 화면과 서버 API 엔드포인트
- `lib/`: 타입, 정적 데이터, 공통 유틸리티
- `styles/`: 전역 스타일과 디자인 토큰

### public/
아바타, 이미지 등 정적 자원을 관리합니다.

### supabase/
Supabase 데이터베이스 마이그레이션과 로컬 설정을 관리합니다.

## 데이터 원본

조직, 팀, 구성원, 티켓, 회의록은 모두 Supabase를 단일 원본으로 사용합니다. 외부 업무 관리 서비스 연동은 사용하지 않습니다.
