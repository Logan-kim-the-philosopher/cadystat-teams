export type TicketDetailRecord = {
  id: string;
  title: string;
  status: string;
  type: string;
  ownerTeam: string;
  assignee: string;
  description: string;
  history: string[];
  comments: Array<string | { author?: string; body: string; createdAt: string }>;
  linkedMeetings: string[];
};

export type TeamRecord = {
  id?: string;
  name: string;
  slug: string;
};

export type TicketRecord = {
  id: string;
  title: string;
  team: string;
  teamSlug: string;
  status: string;
  type: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketStatusVariant = 'green' | 'amber' | 'red';

export function ticketStatusVariant(status: string): TicketStatusVariant {
  if (status === '완료') return 'green';
  if (status === '배정' || status === '담당 배정' || status === '진행 중') return 'amber';
  return 'red';
}
