import * as React from 'react';
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { OrgLeader, Team } from '../../lib/site-data';
import { cn } from '../../lib/utils';

type LeaderNodeData = OrgLeader;

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
  team: TeamNode,
  member: MemberNode
};

function buildGraph(leader: OrgLeader, teams: Team[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const sheetCount = teams.length;
  const totalWidth = sheetCount * TEAM_WIDTH + Math.max(sheetCount - 1, 0) * TEAM_GAP;
  const startX = (FLOW_WIDTH - totalWidth) / 2;

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

  teams.forEach((team, index) => {
    const x = startX + index * (TEAM_WIDTH + TEAM_GAP);
    const memberTop = MEMBER_Y;

    nodes.push({
      id: team.slug,
      type: 'team',
      position: { x, y: TEAM_Y },
      data: {
        name: team.name,
        lead: team.lead,
        memberCount: team.members,
        tone: team.tone
      },
      style: {
        width: TEAM_WIDTH,
        height: TEAM_HEIGHT
      },
      draggable: false,
      selectable: false
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

    team.people.forEach((person, memberIndex) => {
      nodes.push({
        id: person.id,
        type: 'member',
        position: {
          x,
          y: memberTop + memberIndex * (MEMBER_HEIGHT + MEMBER_GAP)
        },
        data: {
          name: person.name,
          title: person.title
        },
        style: {
          width: MEMBER_WIDTH,
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
  teams: Team[];
};

export function OrganizationFlow({ leader, teams }: OrganizationFlowProps) {
  const { nodes, edges } = React.useMemo(() => buildGraph(leader, teams), [leader, teams]);

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
