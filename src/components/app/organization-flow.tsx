import * as React from 'react';
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { OrgLeader, OrgSheet, Team } from '../../lib/site-data';
import { cn } from '../../lib/utils';

type LeaderNodeData = OrgLeader;

type SheetNodeData = {
  name: string;
  description: string;
};

type TeamNodeData = {
  name: string;
  lead: string;
  memberCount: number;
  tone: Team['tone'];
};

type MemberNodeData = {
  name: string;
  title: string;
};

const FLOW_WIDTH = 1110;
const SHEET_WIDTH = 325;
const SHEET_HEIGHT = 360;
const ROOT_WIDTH = 240;
const ROOT_HEIGHT = 110;
const TEAM_HEIGHT = 112;
const MEMBER_HEIGHT = 104;
const TEAM_PADDING_X = 22;
const TEAM_PADDING_TOP = 22;
const TEAM_PADDING_BOTTOM = 20;
const TEAM_MEMBER_GAP = 18;
const SHEET_GAP = 46;

const toneRing: Record<Team['tone'], string> = {
  blue: 'from-blue-500 to-indigo-500',
  green: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500'
};

const tonePill: Record<Team['tone'], string> = {
  blue: 'bg-white/20 text-white',
  green: 'bg-white/20 text-white',
  amber: 'bg-white/20 text-white'
};

function initialOf(name: string) {
  return name.trim().charAt(0);
}

function LeaderNode({ data }: NodeProps<LeaderNodeData>) {
  return (
    <div className="flex h-full w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white shadow-sm">
        {data.avatar}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-slate-900">{data.name}</p>
        <p className="text-sm text-slate-500">{data.title}</p>
        <p className="mt-1 text-xs text-slate-400">{data.subtitle}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
    </div>
  );
}

function SheetNode({ data }: NodeProps<SheetNodeData>) {
  return (
    <div className="relative h-full w-full rounded-[28px] border border-slate-200/80 bg-white/70">
      <div className="absolute right-5 top-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
        {data.description}
      </div>
      <div className="absolute left-5 top-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
        {data.name}
      </div>
    </div>
  );
}

function TeamNode({ data }: NodeProps<TeamNodeData>) {
  return (
    <div className={cn('relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br px-5 py-4 text-white shadow-[0_16px_40px_rgba(79,70,229,0.18)]', toneRing[data.tone])}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/90">{data.name}</p>
          <p className="mt-1 text-xs text-white/70">{data.lead}</p>
        </div>
        <span className={cn('rounded-xl px-3 py-1 text-sm font-semibold backdrop-blur-sm', tonePill[data.tone])}>
          {data.memberCount}명
        </span>
      </div>
      <div className="mt-3 inline-flex w-fit rounded-lg bg-white/18 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
        {data.name}
      </div>
    </div>
  );
}

function MemberNode({ data }: NodeProps<MemberNodeData>) {
  return (
    <div className="flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white shadow-sm">
        {initialOf(data.name)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{data.name}</p>
        <p className="text-sm text-slate-500">{data.title}</p>
      </div>
    </div>
  );
}

const nodeTypes = {
  leader: LeaderNode,
  sheet: SheetNode,
  team: TeamNode,
  member: MemberNode
};

function buildGraph(leader: OrgLeader, sheets: OrgSheet[], teams: Team[]) {
  const teamMap = new Map(teams.map((team) => [team.slug, team]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const topY = 0;
  const sheetY = 170;
  const sheetCount = sheets.length;
  const totalSheetsWidth = sheetCount * SHEET_WIDTH + Math.max(sheetCount - 1, 0) * SHEET_GAP;
  const startX = (FLOW_WIDTH - totalSheetsWidth) / 2;

  nodes.push({
    id: 'leader',
    type: 'leader',
    position: { x: (FLOW_WIDTH - ROOT_WIDTH) / 2, y: topY },
    data: leader,
    style: {
      width: ROOT_WIDTH,
      height: ROOT_HEIGHT
    },
    draggable: false,
    selectable: false
  });

  sheets.forEach((sheet, sheetIndex) => {
    const team = teamMap.get(sheet.teamSlugs[0]);
    if (!team) return;

    const sheetX = startX + sheetIndex * (SHEET_WIDTH + SHEET_GAP);
    const memberCount = team.people.length;
    const sheetContentHeight = TEAM_PADDING_TOP + TEAM_HEIGHT + TEAM_MEMBER_GAP + memberCount * MEMBER_HEIGHT + Math.max(memberCount - 1, 0) * 18 + TEAM_PADDING_BOTTOM;
    const sheetHeight = Math.max(SHEET_HEIGHT, sheetContentHeight + 56);
    const teamX = 22;
    const teamY = 60;
    const memberStartY = teamY + TEAM_HEIGHT + TEAM_MEMBER_GAP;

    nodes.push({
      id: sheet.id,
      type: 'sheet',
      position: { x: sheetX, y: sheetY },
      data: {
        name: sheet.name,
        description: sheet.description
      },
      style: {
        width: SHEET_WIDTH,
        height: sheetHeight,
        zIndex: 0
      },
      draggable: false,
      selectable: false
    });

    nodes.push({
      id: team.slug,
      type: 'team',
      parentId: sheet.id,
      extent: 'parent',
      position: { x: teamX, y: teamY },
      data: {
        name: team.name,
        lead: team.lead,
        memberCount: team.members,
        tone: team.tone
      },
      style: {
        width: SHEET_WIDTH - TEAM_PADDING_X * 2,
        height: TEAM_HEIGHT,
        zIndex: 2
      },
      draggable: false,
      selectable: false
    });

    team.people.forEach((person, index) => {
      nodes.push({
        id: person.id,
        type: 'member',
        parentId: sheet.id,
        extent: 'parent',
        position: {
          x: teamX,
          y: memberStartY + index * (MEMBER_HEIGHT + 14)
        },
        data: {
          name: person.name,
          title: person.title
        },
        style: {
          width: SHEET_WIDTH - TEAM_PADDING_X * 2,
          height: MEMBER_HEIGHT,
          zIndex: 2
        },
        draggable: false,
        selectable: false
      });

      edges.push({
        id: `${team.slug}-${person.id}`,
        source: team.slug,
        target: person.id,
        type: 'smoothstep',
        style: {
          stroke: '#d1d5db',
          strokeWidth: 1.5
        }
      });
    });

    edges.push({
      id: `leader-${team.slug}`,
      source: 'leader',
      target: team.slug,
      type: 'smoothstep',
      style: {
        stroke: '#d1d5db',
        strokeWidth: 1.5
      }
    });
  });

  return { nodes, edges };
}

type OrganizationFlowProps = {
  leader: OrgLeader;
  sheets: OrgSheet[];
  teams: Team[];
};

export function OrganizationFlow({ leader, sheets, teams }: OrganizationFlowProps) {
  const { nodes, edges } = React.useMemo(() => buildGraph(leader, sheets, teams), [leader, sheets, teams]);

  return (
    <div className="h-[760px] w-full overflow-hidden rounded-[32px] border border-slate-200 bg-[#fcfcfd]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        minZoom={0.7}
        maxZoom={1.1}
      >
        <Background gap={24} size={1} color="rgba(148, 163, 184, 0.08)" />
      </ReactFlow>
    </div>
  );
}
