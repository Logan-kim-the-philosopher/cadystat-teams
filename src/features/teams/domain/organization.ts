import type { Database } from '../server/database.types';

type TeamRow = Database['public']['Tables']['teams']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

export type MemberGender = 'male' | 'female' | null;

export type OrganizationMember = {
  id: string;
  name: string;
  title: string;
  gender: MemberGender;
  teamId: string;
  reportsToMemberId: string | null;
  sortOrder: number;
};

export type OrganizationTeam = {
  id: string;
  name: string;
  parentTeamId: string | null;
  leadMemberId: string | null;
  members: OrganizationMember[];
};

export type OrganizationSnapshot = { teams: OrganizationTeam[] };

export type CreateOrganizationTeamInput = {
  name: string;
  parentTeamId: string | null;
  leadName: string | null;
  leadTitle: string | null;
  leadGender: MemberGender;
};

export type OrganizationMemberMutation = {
  action: 'create' | 'update' | 'delete';
  id: string;
  name?: string;
  title?: string;
  gender?: MemberGender;
  sortOrder?: number;
};

export type UpdateOrganizationTeamInput = {
  teamId: string;
  name: string;
  leadMemberId: string | null;
  members: OrganizationMemberMutation[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrganizationInputError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OrganizationInputError('JSON 객체가 필요합니다.');
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim() === '') throw new OrganizationInputError(`${label}은(는) 필수입니다.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new OrganizationInputError(`${label}은(는) ${maxLength}자 이하여야 합니다.`);
  return normalized;
}

function optionalText(value: unknown, label: string, maxLength: number) {
  if (value === undefined || value === null || value === '') return null;
  return requiredText(value, label, maxLength);
}

export function parseOrganizationId(value: unknown, label = '팀 ID') {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new OrganizationInputError(`${label} 형식이 올바르지 않습니다.`);
  return value;
}

function optionalId(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return null;
  return parseOrganizationId(value, label);
}

function gender(value: unknown): MemberGender {
  if (value === undefined || value === null || value === '') return null;
  if (value !== 'male' && value !== 'female') throw new OrganizationInputError('성별 값이 올바르지 않습니다.');
  return value;
}

export function buildOrganizationSnapshot(teamRows: TeamRow[], memberRows: MemberRow[]): OrganizationSnapshot {
  const membersByTeam = new Map<string, OrganizationMember[]>();

  for (const member of memberRows) {
    const mapped: OrganizationMember = {
      id: member.id,
      name: member.name,
      title: member.title,
      gender: member.gender === 'male' || member.gender === 'female' ? member.gender : null,
      teamId: member.team_id,
      reportsToMemberId: member.reports_to,
      sortOrder: member.sort_order
    };
    membersByTeam.set(member.team_id, [...(membersByTeam.get(member.team_id) ?? []), mapped]);
  }

  const teams = teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    parentTeamId: team.parent_team_id,
    leadMemberId: team.lead_member_id,
    members: (membersByTeam.get(team.id) ?? []).sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'ko'))
  }));

  teams.sort((left, right) => {
    if (left.parentTeamId === null && right.parentTeamId !== null) return -1;
    if (left.parentTeamId !== null && right.parentTeamId === null) return 1;
    return left.name.localeCompare(right.name, 'ko');
  });

  return { teams };
}

export function parseCreateOrganizationTeamInput(value: unknown): CreateOrganizationTeamInput {
  const body = record(value);
  const leadName = optionalText(body.leadName, '팀장 이름', 80);
  const leadTitle = optionalText(body.leadTitle, '팀장 직책', 120);

  if ((leadName && !leadTitle) || (!leadName && leadTitle)) {
    throw new OrganizationInputError('팀장 이름과 직책은 함께 입력해야 합니다.');
  }

  return {
    name: requiredText(body.name, '팀 이름', 80),
    parentTeamId: optionalId(body.parentTeamId, '상위 팀 ID'),
    leadName,
    leadTitle,
    leadGender: gender(body.leadGender)
  };
}

export function parseUpdateOrganizationTeamInput(value: unknown): UpdateOrganizationTeamInput {
  const body = record(value);
  if (!Array.isArray(body.members)) throw new OrganizationInputError('구성원 목록이 필요합니다.');
  if (body.members.length > 100) throw new OrganizationInputError('한 번에 저장할 수 있는 구성원은 100명 이하입니다.');

  const members = body.members.map((rawMember, index): OrganizationMemberMutation => {
    const member = record(rawMember);
    const action = member.action;
    if (action !== 'create' && action !== 'update' && action !== 'delete') {
      throw new OrganizationInputError(`${index + 1}번째 구성원 작업이 올바르지 않습니다.`);
    }

    const id = parseOrganizationId(member.id, `${index + 1}번째 구성원 ID`);
    if (action === 'delete') return { action, id };

    const rawSortOrder = member.sortOrder ?? index;
    if (!Number.isInteger(rawSortOrder) || Number(rawSortOrder) < 0 || Number(rawSortOrder) > 999) {
      throw new OrganizationInputError('구성원 순서는 0부터 999 사이의 정수여야 합니다.');
    }

    return {
      action,
      id,
      name: requiredText(member.name, '구성원 이름', 80),
      title: requiredText(member.title, '구성원 직책', 120),
      gender: gender(member.gender),
      sortOrder: Number(rawSortOrder)
    };
  });

  const duplicateIds = members.filter((member, index) => members.findIndex((candidate) => candidate.id === member.id) !== index);
  if (duplicateIds.length > 0) throw new OrganizationInputError('구성원 ID가 중복되었습니다.');

  return {
    teamId: parseOrganizationId(body.teamId),
    name: requiredText(body.name, '팀 이름', 80),
    leadMemberId: optionalId(body.leadMemberId, '팀장 ID'),
    members
  };
}
