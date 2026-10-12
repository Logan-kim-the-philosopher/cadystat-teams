insert into public.meeting_notes (title, meeting_date, content, status)
select * from (values
  (
    '전체 회의 주간 동기화'::text,
    '2025-09-05'::date,
    E'## 참석자\n\n홍길동, 김민수, 박정우, 정하늘\n\n## 안건\n\n- 들어온 티켓\n- 배포 장애\n- 회의록 내보내기 요청\n\n## 결정사항\n\n1. 개발팀이 T-102를 인수함\n2. 마케팅팀이 PDF 내보내기 범위를 정리함\n3. 경영지원팀이 중복 입력 문제를 수정함\n\n## 액션 아이템\n\n- [ ] 모바일 검증 QA\n- [ ] 내보내기 명세 작성\n- [ ] 중복 접수 처리 보강'::text,
    'published'::text
  ),
  (
    '전체 회의 주간 동기화'::text,
    '2025-08-29'::date,
    E'## 참석자\n\n홍길동, 김민수, 박정우, 정하늘\n\n## 안건\n\n- 주간 접수 검토\n- 로드맵 업데이트\n\n## 결정사항\n\n1. 새 접수 큐 승인\n2. 회의록 형식 표준화\n\n## 액션 아이템\n\n- [ ] 템플릿 공개\n- [ ] 신규 멤버 초대'::text,
    'published'::text
  )
) as seed(title, meeting_date, content, status)
where not exists (
  select 1 from public.meeting_notes where meeting_date = seed.meeting_date
);
