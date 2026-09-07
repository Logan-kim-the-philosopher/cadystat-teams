export type OrgMember = {
  id: string;
  name: string;
  title: string;
};

export type Team = {
  slug: string;
  sheetId: string;
  name: string;
  lead: string;
  members: number;
  tickets: number;
  description: string;
  responsibilities: string[];
  tone: 'blue' | 'green' | 'amber';
  people: OrgMember[];
};

export type OrgLeader = {
  name: string;
  title: string;
  subtitle: string;
  avatar: string;
};

export type OrgSheet = {
  id: string;
  name: string;
  description: string;
  teamSlugs: string[];
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

export const orgLeader: OrgLeader = {
  name: '홍길동',
  title: '대표이사',
  subtitle: 'CEO',
  avatar: '홍'
};

export const orgSheets: OrgSheet[] = [
  {
    id: 'sheet-operations',
    name: '경영지원 시트',
    description: '인사, 총무, 재무',
    teamSlugs: ['operations']
  },
  {
    id: 'sheet-engineering',
    name: '개발 시트',
    description: '제품 개발 및 운영',
    teamSlugs: ['engineering']
  },
  {
    id: 'sheet-product',
    name: '마케팅 시트',
    description: '마케팅 및 홍보',
    teamSlugs: ['product']
  }
];

export const teams: Team[] = [
  {
    slug: 'product',
    sheetId: 'sheet-product',
    name: '마케팅팀',
    lead: '정하늘',
    members: 3,
    tickets: 5,
    description: '마케팅 및 홍보를 담당합니다.',
    responsibilities: ['브랜드 캠페인', '콘텐츠 제작', '홍보 채널 운영'],
    tone: 'blue',
    people: [
      { id: 'product-jeong', name: '정하늘', title: '콘텐츠 마케터' },
      { id: 'product-yoon', name: '윤서연', title: 'SNS 마케터' },
      { id: 'product-lee', name: '이서윤', title: '브랜드 마케터' }
    ]
  },
  {
    slug: 'engineering',
    sheetId: 'sheet-engineering',
    name: '개발팀',
    lead: '박정우',
    members: 3,
    tickets: 4,
    description: '제품 개발 및 운영을 담당합니다.',
    responsibilities: ['제품 개발', '시스템 운영', '품질 검증'],
    tone: 'green',
    people: [
      { id: 'engineering-bak', name: '박정우', title: 'Backend Developer' },
      { id: 'engineering-choi', name: '최수진', title: 'Frontend Developer' },
      { id: 'engineering-ji', name: '이지훈', title: 'Platform Engineer' }
    ]
  },
  {
    slug: 'operations',
    sheetId: 'sheet-operations',
    name: '경영지원팀',
    lead: '김민수',
    members: 3,
    tickets: 3,
    description: '인사, 총무, 재무를 담당합니다.',
    responsibilities: ['인사 관리', '총무 지원', '재무 정리'],
    tone: 'amber',
    people: [
      { id: 'operations-kim', name: '김민수', title: '인사 담당' },
      { id: 'operations-lee', name: '이영희', title: '재무 담당' },
      { id: 'operations-jung', name: '정다은', title: '총무 담당' }
    ]
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
    team: '마케팅팀',
    teamSlug: 'product',
    status: '진행 중',
    priority: '보통',
    type: '기능 요청',
    reporter: '경영지원팀',
    createdAt: '2025-09-04',
    summary: '워크스페이스 밖으로 회의록을 공유할 수 있는 간단한 내보내기 경로가 필요합니다.'
  },
  {
    id: 'T-088',
    title: '입력 접수 중복 생성 버그',
    team: '경영지원팀',
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
    assignee: '박정우',
    reporter: '고객지원',
    description: '모바일 화면에서는 제출 이후에만 검증 상태가 보입니다.',
    history: ['접수됨', '개발팀 배정', '박정우가 티켓을 인수함', 'iOS Safari 재현 확인'],
    comments: ['테스트 기기에서 재현했습니다.', '패치 이후 QA가 필요합니다.'],
    linkedMeetings: ['all-hands-weekly-sync-2025-09-05']
  },
  'T-097': {
    id: 'T-097',
    title: '회의록 PDF 내보내기 기능 요청',
    status: '진행 중',
    priority: '보통',
    type: '기능 요청',
    ownerTeam: '마케팅팀',
    assignee: '정하늘',
    reporter: '경영지원팀',
    description: '내보내기 결과에는 제목, 댓글, 연결된 티켓이 유지되어야 합니다.',
    history: ['접수됨', '마케팅팀 배정', '정하늘이 내보내기 범위를 검토함', '초안 작성 중'],
    comments: ['PDF + 마크다운 내보내기를 함께 고려합니다.', '첫 버전은 가볍게 가는 것이 좋습니다.'],
    linkedMeetings: ['all-hands-weekly-sync-2025-09-05']
  },
  'T-088': {
    id: 'T-088',
    title: '입력 접수 중복 생성 버그',
    status: '보류',
    priority: '긴급',
    type: '버그',
    ownerTeam: '경영지원팀',
    assignee: '김민수',
    reporter: '웹 폼',
    description: '사용자가 제출 버튼을 두 번 누르면 중복 티켓이 생길 수 있습니다.',
    history: ['접수됨', '경영지원팀 배정', '중복 방지 규칙 문제 확인', '백엔드 수정 대기 중'],
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
    attendees: ['홍길동', '김민수', '박정우', '정하늘'],
    agenda: ['들어온 티켓', '배포 장애', '회의록 내보내기 요청'],
    decisionsList: ['개발팀이 T-102를 인수함', '마케팅팀이 PDF 내보내기 범위를 정리함', '경영지원팀이 중복 입력 문제를 수정함'],
    actionItems: ['모바일 검증 QA', '내보내기 명세 작성', '중복 접수 처리 보강'],
    linkedTickets: ['T-102', 'T-097', 'T-088']
  },
  {
    slug: 'all-hands-weekly-sync-2025-08-29',
    date: '2025-08-29',
    title: '전체 회의 주간 동기화',
    decisions: 2,
    comments: 5,
    attendees: ['홍길동', '김민수', '박정우', '정하늘'],
    agenda: ['주간 접수 검토', '로드맵 업데이트'],
    decisionsList: ['새 접수 큐 승인', '회의록 형식 표준화'],
    actionItems: ['템플릿 공개', '신규 멤버 초대'],
    linkedTickets: []
  }
];

export const meetingDetails: Record<string, Meeting> = Object.fromEntries(meetings.map((meeting) => [meeting.slug, meeting]));
export const teamDetails: Record<string, Team> = Object.fromEntries(teams.map((team) => [team.slug, team]));
