# shadcn 전환 계획

## 목표
현재 샘플 UI를 버리고, shadcn 스타일의 컴포넌트 기반 UI로 다시 만듭니다.

## 전환 원칙
- Astro 뼈대는 유지
- 라우트는 유지
- 데이터 모델 방향은 유지
- 스타일과 컴포넌트는 전면 교체

## 선택 이유
- 업무용 포털에 맞는 정돈된 UI를 만들기 좋습니다.
- 컴포넌트 단위로 재사용하기 쉽습니다.
- 나중에 Plane 연동 시 목록/상세 UI를 바꾸기 쉽습니다.

## 권장 스택
- Astro
- Tailwind CSS
- shadcn 스타일 컴포넌트
- 필요 시 React islands

## 적용 범위
### 유지
- `/organization`
- `/tickets`
- `/meetings`
- 상세 라우트 구조

### 재작성
- 레이아웃
- 네비게이션
- 카드/표/필터/배지
- 조직도 시각화
- 티켓 상세 패널
- 회의록 상세 패널

## 진행 순서
1. Tailwind 추가
2. shadcn 스타일의 공통 컴포넌트 구조 만들기
3. 레이아웃 교체
4. 홈 화면 재작성
5. 조직도 화면 재작성
6. 티켓 목록/상세 재작성
7. 회의록 목록/상세 재작성
8. Plane 연결 준비

## 컴포넌트 규칙
- UI 원자 컴포넌트는 `src/components/ui/`에 둡니다.
- 화면 조립 컴포넌트는 `src/components/app/`에 둡니다.
- 페이지는 최대한 얇게 유지합니다.

## 파일 구조 예시
```text
src/
├─ components/
│  ├─ ui/
│  │  ├─ button.astro
│  │  ├─ card.astro
│  │  ├─ badge.astro
│  │  ├─ table.astro
│  │  └─ tabs.astro
│  └─ app/
│     ├─ dashboard-summary.astro
│     ├─ team-tree.astro
│     ├─ ticket-list.astro
│     └─ meeting-note.astro
├─ layouts/
│  └─ AppLayout.astro
├─ pages/
│  ├─ index.astro
│  ├─ organization/
│  ├─ tickets/
│  └─ meetings/
└─ styles/
   └─ global.css
```

## 확인 기준
- 디자인이 더 단정하고 업무용처럼 보입니다.
- 공통 컴포넌트가 페이지를 대신합니다.
- Plane 데이터를 붙일 자리가 명확합니다.
