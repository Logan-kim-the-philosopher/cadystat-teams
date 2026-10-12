import type { DatabaseSync } from 'node:sqlite';
import { meetings, orgUnits, ticketDetails, tickets } from '../site-data.ts';

// Applied once per database. Restarting or rerunning the seed preserves edits/deletions.
export function seedDatabase(db: DatabaseSync) {
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare('SELECT 1 FROM seed_versions WHERE version = 1').get()) {
      db.exec('COMMIT');
      return;
    }
    const teamInsert = db.prepare('INSERT INTO teams (id, slug, name, parent_team_id) VALUES (?, ?, ?, ?)');
    const memberInsert = db.prepare('INSERT INTO members (id, name, title, gender, team_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    for (const unit of orgUnits) teamInsert.run(unit.id, unit.slug, unit.name, unit.parentId);
    for (const unit of orgUnits) {
      unit.people.forEach((person, index) => memberInsert.run(person.id, person.name, person.title, person.gender, unit.id, index));
    }
    for (const unit of orgUnits) {
      db.prepare('UPDATE teams SET lead_member_id = ? WHERE id = ?').run(unit.leadMemberId, unit.id);
      for (const person of unit.people) db.prepare('UPDATE members SET reports_to = ? WHERE id = ?').run(person.reportsToMemberId, person.id);
    }

    const extraTickets = [
      ['T-128', '고객 문의 검색 필터 추가', 'engineering', '기능 요청'],
      ['T-129', '캠페인 성과 대시보드 구축', 'product', '기능 요청'],
      ['T-130', '출장비 정산 승인 오류', 'operations', '버그'],
      ['T-131', '회의록 모바일 화면 개선', 'engineering', '버그'],
      ['T-132', '브랜드 가이드 문서 배포', 'product', '기능 요청'],
      ['T-133', '신규 입사자 온보딩 체크리스트', 'operations', '기능 요청'],
      ['T-134', '분기 목표 공유 페이지', 'executive', '기능 요청'],
      ['T-135', '조직도 검색 결과 누락', 'engineering', '버그'],
    ].map(([id, title, teamSlug, type]) => ({ id, title, teamSlug, type, summary: `${title} 작업의 요구사항을 확인하고 담당 팀에서 검토합니다.` }));
    const samples = [...tickets, ...extraTickets];
    const ticketInsert = db.prepare('INSERT INTO tickets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const historyInsert = db.prepare('INSERT INTO ticket_history VALUES (?, ?, ?, ?)');
    const commentInsert = db.prepare('INSERT INTO ticket_comments VALUES (?, ?, ?, ?, ?)');
    samples.forEach((ticket, index) => {
      const status = ['new', 'assigned', 'done'][index % 3];
      const unit = orgUnits.find((item) => item.slug === ticket.teamSlug)!;
      const detail = ticketDetails[ticket.id];
      const day = String(10 + index).padStart(2, '0');
      const createdAt = `2026-09-${day}T00:00:00.000Z`;
      ticketInsert.run(ticket.id, ticket.id, ticket.title, detail?.description || ticket.summary,
        status === 'new' ? null : unit.id, status === 'new' ? null : unit.leadMemberId,
        ticket.type === '버그' ? 'bug' : 'feature', status, createdAt, createdAt);
      const events = ['티켓 접수', ...(status !== 'new' ? [`${unit.name} 배정`] : []), ...(status === 'done' ? ['작업 검증 후 완료 처리'] : [])];
      events.forEach((event, offset) => historyInsert.run(`history-${ticket.id}-${offset}`, ticket.id, event, `2026-09-${day}T0${offset}:00:00.000Z`));
      const comments = detail?.comments?.length ? detail.comments : ['요구사항과 재현 경로를 확인했습니다.', '검토 결과를 다음 회의에서 공유하겠습니다.'];
      comments.forEach((body, offset) => commentInsert.run(`comment-${ticket.id}-${offset}`, ticket.id,
        unit.people[offset % unit.people.length].name, body, `2026-09-${day}T0${offset + 3}:00:00.000Z`));
    });

    const extraMeetings = [
      ['weekly-sync-2026-09-04', '2026-09-04', '9월 첫째 주 전체 회의', ['T-102', 'T-097']],
      ['product-review-2026-09-09', '2026-09-09', '제품 개선과 고객 피드백', ['T-121', 'T-128', 'T-131']],
      ['marketing-plan-2026-09-15', '2026-09-15', '가을 캠페인 실행 계획', ['T-122', 'T-129', 'T-132']],
      ['operations-review-2026-09-18', '2026-09-18', '경영지원 운영 점검', ['T-123', 'T-126', 'T-130']],
      ['engineering-review-2026-09-23', '2026-09-23', '개발팀 품질 회고', ['T-124', 'T-127', 'T-135']],
      ['quarterly-planning-2026-09-29', '2026-09-29', '4분기 목표와 협업 계획', ['T-133', 'T-134']],
    ] as const;
    const notes = [...meetings, ...extraMeetings.map(([slug, date, title, linkedTicketIds]) => ({
      slug, date, title, linkedTicketIds: [...linkedTicketIds],
      body: `## 참석자\n\n홍길동, 박정우, 정하늘, 김민수\n\n## 회의 목적\n\n${title}을 논의하고 팀별 후속 작업을 정리합니다.\n\n## 안건\n\n- 지난 작업 진행 상황 공유\n- 고객 피드백과 개선 요청 검토\n- 담당 팀과 완료 기준 확정\n\n## 결정사항\n\n1. 우선순위가 높은 오류를 먼저 해결합니다.\n2. 팀별 담당자가 진행 상황을 댓글로 공유합니다.\n3. 다음 회의에서 결과를 함께 검증합니다.\n\n## 액션 아이템\n\n- [x] 요구사항과 담당자 확인\n- [ ] 구현 및 검토 진행\n- [ ] 결과 공유와 회고\n\n## 연결된 티켓\n\n${linkedTicketIds.map((id) => `- ${id}`).join('\n')}`,
    }))];
    for (const [index, note] of notes.entries()) {
      db.prepare('INSERT INTO meeting_notes VALUES (?, ?, ?, ?, ?)').run(note.slug, note.title, note.date, note.body, 'published');
      for (const ticketId of note.linkedTicketIds) db.prepare('INSERT INTO meeting_note_tickets VALUES (?, ?)').run(note.slug, ticketId);
      ['결정사항 확인했습니다. 팀별 일정에 반영하겠습니다.', '관련 티켓에 검토 결과와 진행 상황을 업데이트했습니다.'].forEach((body, offset) => {
        db.prepare('INSERT INTO meeting_comments VALUES (?, ?, ?, ?, ?)').run(`meeting-comment-${index}-${offset}`, note.slug,
          ['박정우', '정하늘'][offset], body, `${note.date}T0${offset + 5}:00:00.000Z`);
      });
    }
    db.prepare('INSERT INTO seed_versions VALUES (1)').run();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
