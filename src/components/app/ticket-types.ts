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
};
