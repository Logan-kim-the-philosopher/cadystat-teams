import * as React from 'react';
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { OrgLeader, OrgSheet, Team } from '../../lib/site-data';
import { cn } from '../../lib/utils';

type LeaderNodeData = OrgLeader;

type SheetNodeData = {
  name: string;
  description: string;
  teamCount: number;
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
const TEAM_WIDTH = 300;
const TEAM_HEIGHT = 112;
const MEMBER_WIDTH = 300;
const MEMBER_HEIGHT = 88;
const LEADER_WIDTH = 240;
const LEADER_HEIGHT = 108;
const TOP_Y = 0;
const TEAM_Y = 190;
const MEMBER_Y = TEAM_Y + TEAM_HEIGHT + 34;
const TEAM_GAP = 52;
const MEMBER_GAP = 16;

const toneCard: Record<Team['tone'], string> = {
  blue: 'from-blue-500 to-indigo-500',
  green: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500'
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
    <div className="relative flex h-full w-full flex-col rounded-[28px] border border-slate-200 bg-white/90 px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Sheet</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{data.name}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{data.description}</p>
        </div>
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {data.teamCount}팀
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
    </div>
  );
}

function TeamNode({ data }: NodeProps<TeamNodeData>) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br px-5 py-4 text-white shadow-[0_16px_40px_rgba(79,70,229,0.18)]',
        toneCard[data.tone]
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/90">{data.name}</p>
          <p className="mt-1 text-xs text-white/70">{data.lead}</p>
        </div>
        <span className="rounded-xl bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm">{data.memberCount}명</span>
      </div>
      <div className="mt-3 inline-flex w-fit rounded-lg bg-white/18 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
        팀 조직
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
  const sheetCount = sheets.length;
  const sheetWidth = 332;
  const sheetGap = 40;
  const totalWidth = sheetCount * sheetWidth + Math.max(sheetCount - 1, 0) * sheetGap;
  const startX = (FLOW_WIDTH - totalWidth) / 2;
  const sheetTop = 170;
  const teamX = 16;
  const teamY = 64;
  const memberStartY = teamY + TEAM_HEIGHT + 18;

  nodes.push({
    id: 'leader',
    type: 'leader',
    position: { x: (FLOW_WIDTH - LEADER_WIDTH) / 2, y: TOP_Y },
    data: leader,
    style: {
      width: LEADER_WIDTH,
      height: LEADER_HEIGHT
    },
    draggable: false,
    selectable: false
  });

  sheets.forEach((sheet, index) => {
    const team = teamMap.get(sheet.teamSlugs[0]);
    if (!team) return;

    const sheetX = startX + index * (sheetWidth + sheetGap);
    const sheetHeight = Math.max(310, memberStartY + team.people.length * MEMBER_HEIGHT + Math.max(team.people.length - 1, 0) * MEMBER_GAP + 20);
    const innerWidth = sheetWidth - teamX * 2;

    nodes.push({
      id: sheet.id,
      type: 'sheet',
      position: { x: sheetX, y: sheetTop },
      data: {
        name: sheet.name,
        description: sheet.description,
        teamCount: sheet.teamSlugs.length
      },
      style: {
        width: sheetWidth,
        height: sheetHeight
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
        width: innerWidth,
        height: TEAM_HEIGHT
      },
      draggable: false,
      selectable: false
    });

    edges.push({
      id: `leader-${sheet.id}`,
      source: 'leader',
      target: sheet.id,
      type: 'smoothstep',
      style: {
        stroke: '#d1d5db',
        strokeWidth: 1.5
      }
    });

    team.people.forEach((person, memberIndex) => {
      nodes.push({
        id: person.id,
        type: 'member',
        parentId: sheet.id,
        extent: 'parent',
        position: {
          x: teamX,
          y: memberStartY + memberIndex * (MEMBER_HEIGHT + MEMBER_GAP)
        },
        data: {
          name: person.name,
          title: person.title
        },
        style: {
          width: innerWidth,
          height: MEMBER_HEIGHT
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
    <div
      className="w-full overflow-hidden rounded-[32px] border border-slate-200 bg-[#fcfcfd]"
      style={{ height: 'clamp(520px, calc(100dvh - 240px), 860px)' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnDoubleClick
        minZoom={0.5}
        maxZoom={1.4}
      >
        <Background gap={24} size={1} color="rgba(148, 163, 184, 0.08)" />
      </ReactFlow>
    </div>
  );
}
