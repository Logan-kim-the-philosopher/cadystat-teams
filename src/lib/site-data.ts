export type Team = {
  slug: string;
  name: string;
  lead: string;
  members: number;
  tickets: number;
  description: string;
  responsibilities: string[];
  tone: 'blue' | 'green' | 'amber';
};

export type Ticket = {
  id: string;
  title: string;
  team: string;
  teamSlug: string;
  status: '담당 배정' | '진행 중' | '보류';
  priority: '긴급' | '높음' | '보통';
  type: '버그' | '기능 요청';
  reporter: string;
  createdAt: string;
  summary: string;
};

export type TicketDetail = {
  id: string;
  title: string;
  status: '담당 배정' | '진행 중' | '보류';
  priority: '긴급' | '높음' | '보통';
  type: '버그' | '기능 요청';
  ownerTeam: string;
  assignee: string;
  reporter: string;
  description: string;
  history: string[];
  comments: string[];
  linkedMeetings: string[];
};

export type Meeting = {
  slug: string;
  date: string;
  title: string;
  decisions: number;
  comments: number;
  attendees: string[];
  agenda: string[];
  decisionsList: string[];
  actionItems: string[];
  linkedTickets: string[];
};

export const stats = [
  { label: '팀 수', value: '3', hint: '조직도 반영' },
  { label: '열린 티켓', value: '12', hint: '단일 접수함' },
  { label: '회의록', value: '24', hint: '전체회의 전용' }
];

export const teams: Team[] = [
  {
    slug: 'product',
    name: '제품팀',
    lead: '민지',
    members: 4,
    tickets: 5,
    description: '접수 분류, 기능 정리, 로드맵 정합성을 담당합니다.',
    responsibilities: ['접수 검토', '범위 결정', '로드맵 정리'],
    tone: 'blue'
  },
  {
    slug: 'engineering',
    name: '개발팀',
    lead: '재호',
    members: 6,
    tickets: 4,
    description: '구현, 버그 수정, 기술 검증을 담당합니다.',
    responsibilities: ['수정 배포', '원인 분석', '릴리스 점검'],
    tone: 'green'
  },
  {
    slug: 'operations',
    name: '운영팀',
    lead: '소라',
    members: 3,
    tickets: 3,
    description: '들어오는 요청을 정리하고 후속 조치를 조율합니다.',
    responsibilities: ['큐 정리', '회의 준비', '후속 추적'],
    tone: 'amber'
  }
];

export const tickets: Ticket[] = [
  {
    id: 'T-102',
    title: '모바일에서 로그인 폼 검증이 동작하지 않음',
    team: '개발팀',
    teamSlug: 'engineering',
    status: '담당 배정',
    priority: '높음',
    type: '버그',
    reporter: '고객지원',
    createdAt: '2025-09-05',
    summary: '모바일 사용자가 잘못된 자격 증명을 입력해도 즉시 검증 상태가 보이지 않습니다.'
  },
  {
    id: 'T-097',
    title: '회의록 PDF 내보내기 기능 요청',
    team: '제품팀',
    teamSlug: 'product',
    status: '진행 중',
    priority: '보통',
    type: '기능 요청',
    reporter: '운영팀',
    createdAt: '2025-09-04',
    summary: '워크스페이스 밖으로 회의록을 공유할 수 있는 간단한 내보내기 경로가 필요합니다.'
  },
  {
    id: 'T-088',
    title: '입력 접수 중복 생성 버그',
    team: '운영팀',
    teamSlug: 'operations',
    status: '보류',
    priority: '긴급',
    type: '버그',
    reporter: '웹 폼',
    createdAt: '2025-09-03',
    summary: '네트워크가 느릴 때 폼 제출이 중복 티켓으로 생성될 수 있습니다.'
  }
];

export const ticketDetails: Record<string, TicketDetail> = {
  'T-102': {
    id: 'T-102',
    title: '모바일에서 로그인 폼 검증이 동작하지 않음',
    status: '담당 배정',
    priority: '높음',
    type: '버그',
    ownerTeam: '개발팀',
    assignee: '재호',
    reporter: '고객지원',
    description: '모바일 화면에서는 제출 이후에만 검증 상태가 보입니다.',
    history: ['접수됨', '개발팀 배정', '재호가 티켓을 인수함', 'iOS Safari 재현 확인'],
    comments: ['테스트 기기에서 재현했습니다.', '패치 이후 QA가 필요합니다.'],
    linkedMeetings: ['all-hands-weekly-sync-2025-09-05']
  },
  'T-097': {
    id: 'T-097',
    title: '회의록 PDF 내보내기 기능 요청',
    status: '진행 중',
    priority: '보통',
    type: '기능 요청',
    ownerTeam: '제품팀',
    assignee: '민지',
    reporter: '운영팀',
    description: '내보내기 결과에는 제목, 댓글, 연결된 티켓이 유지되어야 합니다.',
    history: ['접수됨', '제품팀 배정', '민지가 내보내기 범위를 검토함', '초안 작성 중'],
    comments: ['PDF + 마크다운 내보내기를 함께 고려합니다.', '첫 버전은 가볍게 가는 것이 좋습니다.'],
    linkedMeetings: ['all-hands-weekly-sync-2025-09-05']
  },
  'T-088': {
    id: 'T-088',
    title: '입력 접수 중복 생성 버그',
    status: '보류',
    priority: '긴급',
    type: '버그',
    ownerTeam: '운영팀',
    assignee: '소라',
    reporter: '웹 폼',
    description: '사용자가 제출 버튼을 두 번 누르면 중복 티켓이 생길 수 있습니다.',
    history: ['접수됨', '운영팀 배정', '중복 방지 규칙 문제 확인', '백엔드 수정 대기 중'],
    comments: ['멱등 키를 추가해야 합니다.', '재시도 안전 처리가 필요합니다.'],
    linkedMeetings: ['all-hands-weekly-sync-2025-09-05']
  }
};

export const meetings: Meeting[] = [
  {
    slug: 'all-hands-weekly-sync-2025-09-05',
    date: '2025-09-05',
    title: '전체 회의 주간 동기화',
    decisions: 3,
    comments: 8,
    attendees: ['민지', '재호', '소라'],
    agenda: ['들어온 티켓', '배포 장애', '회의록 내보내기 요청'],
    decisionsList: ['개발팀이 T-102를 인수함', '제품팀이 PDF 내보내기 범위를 정리함', '운영팀이 중복 입력 문제를 수정함'],
    actionItems: ['모바일 검증 QA', '내보내기 명세 작성', '중복 접수 처리 보강'],
    linkedTickets: ['T-102', 'T-097', 'T-088']
  },
  {
    slug: 'all-hands-weekly-sync-2025-08-29',
    date: '2025-08-29',
    title: '전체 회의 주간 동기화',
    decisions: 2,
    comments: 5,
    attendees: ['민지', '재호', '소라'],
    agenda: ['주간 접수 검토', '로드맵 업데이트'],
    decisionsList: ['새 접수 큐 승인', '회의록 형식 표준화'],
    actionItems: ['템플릿 공개', '신규 멤버 초대'],
    linkedTickets: []
  }
];

export const meetingDetails: Record<string, Meeting> = Object.fromEntries(meetings.map((meeting) => [meeting.slug, meeting]));
export const teamDetails: Record<string, Team> = Object.fromEntries(teams.map((team) => [team.slug, team]));
