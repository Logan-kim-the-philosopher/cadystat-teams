import type { OrganizationSnapshot } from './organization';

// Adapter for the original Teams organization view; storage stays in this feature.
export type OrgMember = {
  id: string; name: string; title: string; gender: 'male' | 'female';
  orgUnitId: string; reportsToMemberId: string | null;
};
export type OrgUnit = {
  id: string; name: string; parentId: string | null; leadMemberId: string | null;
  members: number; people: OrgMember[];
};
export function organizationUnits(snapshot: OrganizationSnapshot): OrgUnit[] {
  return snapshot.teams.map((team) => ({
    id: team.id, name: team.name, parentId: team.parentTeamId, leadMemberId: team.leadMemberId,
    members: team.members.length,
    people: team.members.map((member) => ({
      id: member.id, name: member.name, title: member.title, gender: member.gender ?? 'male',
      orgUnitId: team.id, reportsToMemberId: member.reportsToMemberId
    }))
  }));
}
