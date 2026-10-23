import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { OrganizationMember, OrganizationTeam } from '../domain/organization';

export const ORGANIZATION_SHEET_WIDTH = 332;

export function organizationSheetHeight(team: OrganizationTeam) {
  const count = team.members.length;
  return Math.max(180, 60 + 32 + count * 72 + Math.max(0, count - 1) * 12);
}

function MemberCard({ member, lead }: { member: OrganizationMember; lead: boolean }) {
  const avatar = member.gender === 'male' || member.gender === 'female'
    ? `/avatars/profile-${member.gender}.svg`
    : null;

  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-sm" aria-hidden="true">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : member.name.charAt(0)}
      </span>
      <span className="min-w-0 text-left">
        <span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold text-slate-900">{member.name}</span><span className="shrink-0 text-xs font-medium text-slate-400">{lead ? '팀장' : '팀원'}</span></span>
        <span className="block truncate text-sm text-slate-500">{member.title}</span>
      </span>
    </div>
  );
}

export type OrganizationTeamFlowNode = Node<
  { team: OrganizationTeam; selected: boolean },
  'organization-team'
>;

export function OrganizationTeamNode({ data }: NodeProps<OrganizationTeamFlowNode>) {
  const { team, selected } = data;
  const lead = team.members.find((member) => member.id === team.leadMemberId) ?? null;
  const members = team.members.filter((member) => member.id !== lead?.id);

  return (
    <div className={`h-full w-[332px] overflow-hidden rounded-[28px] border-2 bg-[#FCFCFD] shadow-soft transition hover:shadow-xl ${selected ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <div className="flex h-[58px] items-center justify-between gap-3 border-b-2 border-slate-200 bg-slate-200/70 px-5">
        <h2 className="text-lg font-bold text-slate-900">{team.name}</h2>
        <span className="shrink-0 text-lg font-semibold text-slate-600">{team.members.length}명</span>
      </div>
      <div className="space-y-3 p-4">
        {lead ? <MemberCard member={lead} lead /> : null}
        {members.map((member) => <MemberCard member={member} lead={false} key={member.id} />)}
        {team.members.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">등록된 구성원이 없습니다.</p> : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
    </div>
  );
}
