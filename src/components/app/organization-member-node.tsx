import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';

export type OrganizationMemberNodeData = {
  name: string;
  title: string;
  role: 'member';
  gender: 'male' | 'female';
  compact?: boolean;
};

function profileIllustration(gender: 'male' | 'female') {
  return gender === 'male' ? '/avatars/profile-male.svg' : '/avatars/profile-female.svg';
}

export function OrganizationMemberNode({ data }: NodeProps<OrganizationMemberNodeData>) {
  const compact = data.compact;
  return (
    <div className={compact
      ? 'flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'
      : 'flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'}>
      {!compact ? <>
        <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
        <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
      </> : null}
      <div className={compact
        ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-sm'
        : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white shadow-sm'}>
        <img src={profileIllustration(data.gender)} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{data.name}</p>
          <p className="shrink-0 text-xs font-medium text-slate-400">{data.role}</p>
        </div>
        <p className={compact ? 'truncate text-xs text-slate-500' : 'truncate text-sm text-slate-500'}>{data.title}</p>
      </div>
    </div>
  );
}
