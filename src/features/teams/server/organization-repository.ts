import type { Json } from './database.types';
import {
  buildOrganizationSnapshot,
  type CreateOrganizationTeamInput,
  type OrganizationSnapshot,
  type OrganizationTeam,
  type UpdateOrganizationTeamInput
} from '../domain/organization';
import { getSupabaseServerClient } from '../../../lib/server/supabase';

export class OrganizationRepositoryError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

function fail(message: string, error: { message: string; code?: string } | null) {
  if (error) throw new OrganizationRepositoryError(error.message || message, error.code);
}

function rpcId(value: Json, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OrganizationRepositoryError('조직 RPC 응답이 올바르지 않습니다.');
  const id = value[key];
  if (typeof id !== 'string') throw new OrganizationRepositoryError('조직 RPC 응답에 팀 ID가 없습니다.');
  return id;
}

export async function listOrganization(): Promise<OrganizationSnapshot> {
  const client = getSupabaseServerClient();
  const [teamsResult, membersResult] = await Promise.all([
    client.from('teams').select('id,name,parent_team_id,lead_member_id,created_at,updated_at').order('created_at'),
    client.from('members').select('id,name,title,gender,team_id,reports_to,sort_order,created_at,updated_at').order('sort_order')
  ]);

  fail('팀 목록을 불러오지 못했습니다.', teamsResult.error);
  fail('구성원 목록을 불러오지 못했습니다.', membersResult.error);
  return buildOrganizationSnapshot(teamsResult.data ?? [], membersResult.data ?? []);
}

export async function getOrganizationTeam(teamId: string): Promise<OrganizationTeam | null> {
  const snapshot = await listOrganization();
  return snapshot.teams.find((team) => team.id === teamId) ?? null;
}

export async function countTicketsForTeam(teamId: string): Promise<number> {
  const client = getSupabaseServerClient();
  const { count, error } = await client.from('tickets').select('id', { count: 'exact', head: true }).eq('team_id', teamId);
  fail('팀 티켓 수를 불러오지 못했습니다.', error);
  return count ?? 0;
}

export async function createOrganizationTeam(input: CreateOrganizationTeamInput) {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc('create_organization_team', {
    p_name: input.name,
    ...(input.parentTeamId ? { p_parent_team_id: input.parentTeamId } : {}),
    ...(input.leadName ? { p_lead_name: input.leadName } : {}),
    ...(input.leadTitle ? { p_lead_title: input.leadTitle } : {}),
    ...(input.leadGender ? { p_lead_gender: input.leadGender } : {})
  });
  fail('팀을 생성하지 못했습니다.', error);
  const team = await getOrganizationTeam(rpcId(data, 'teamId'));
  if (!team) throw new OrganizationRepositoryError('생성된 팀을 다시 불러오지 못했습니다.');
  return team;
}

export async function updateOrganizationTeam(input: UpdateOrganizationTeamInput) {
  const client = getSupabaseServerClient();
  const members = input.members.map((member) => ({
    action: member.action,
    id: member.id,
    ...(member.name !== undefined ? { name: member.name } : {}),
    ...(member.title !== undefined ? { title: member.title } : {}),
    ...(member.gender !== undefined ? { gender: member.gender ?? '' } : {}),
    ...(member.sortOrder !== undefined ? { sortOrder: member.sortOrder } : {})
  }));
  const { error } = await client.rpc('save_organization_team', {
    p_team_id: input.teamId,
    p_name: input.name,
    p_members: members,
    ...(input.leadMemberId ? { p_lead_member_id: input.leadMemberId } : {})
  });
  fail('팀을 저장하지 못했습니다.', error);
  const team = await getOrganizationTeam(input.teamId);
  if (!team) throw new OrganizationRepositoryError('저장된 팀을 다시 불러오지 못했습니다.');
  return team;
}

export async function deleteOrganizationTeam(teamId: string, ticketAction: 'delete' | 'reset' | null) {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc('delete_organization_team', {
    p_team_id: teamId,
    p_ticket_action: ticketAction
  });
  fail('팀을 삭제하지 못했습니다.', error);
  rpcId(data, 'teamId');
}
