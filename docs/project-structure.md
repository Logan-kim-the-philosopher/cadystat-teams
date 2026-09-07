# 프로젝트 구조

## 목표
이 프로젝트는 Plane 기반 협업 포털을 만들기 위한 기획 저장소입니다.
초기에는 문서 중심으로 유지하고, 이후 Astro 구현으로 확장합니다.

## 권장 디렉토리 구조
```text
cody-stat/
├─ README.md
├─ docs/
│  ├─ screen-design.md
│  ├─ data-model.md
│  ├─ plane-feature-split.md
│  ├─ implementation-roadmap.md
│  └─ project-structure.md
├─ src/
│  ├─ components/
│  ├─ layouts/
│  ├─ pages/
│  ├─ lib/
│  └─ styles/
├─ public/
└─ package.json
```

## 각 폴더 역할

### docs/
- 서비스 기획
- 화면 설계
- 데이터 모델
- 구현 순서
- 기능 분해

### src/
Astro 실제 구현 코드가 들어갈 자리입니다.

#### components/
- 조직도 카드
- 티켓 카드
- 회의록 카드
- 공통 UI

#### layouts/
- 전체 레이아웃
- 포털 공통 틀

#### pages/
- 홈
- 조직도
- 티켓
- 회의록

#### lib/
- Plane 연동
- 데이터 변환
- 유틸 함수

#### styles/
- 전역 스타일
- 디자인 토큰

### public/
- 이미지
- 아이콘
- 정적 자원

## 초기 단계 운영
처음에는 `docs/`만 유지해도 충분합니다.
실제 개발을 시작할 때 `src/`를 추가합니다.
