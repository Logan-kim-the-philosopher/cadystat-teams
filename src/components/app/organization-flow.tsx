import * as React from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { OrgSheet, Team } from '../../lib/site-data';
import { cn } from '../../lib/utils';

type SheetNodeData = {
  name: string;
  description: string;
  teamCount: number;
  memberCount: number;
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

const NODE_WIDTH = 270;
const TEAM_HEIGHT = 92;
const MEMBER_HEIGHT = 38;
const SHEET_PADDING = 24;
const SHEET_HEADER_HEIGHT = 72;
const TEAM_GAP = 20;
const MEMBER_GAP = 10;
const SHEET_GAP = 56;

const toneBorder: Record<Team['tone'], string> = {
  blue: 'border-blue-200',
  green: 'border-emerald-200',
  amber: 'border-amber-200'
};

const toneAccent: Record<Team['tone'], string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500'
};

function SheetNode({ data }: NodeProps<SheetNodeData>) {
  return (
    <div className="relative h-full w-full rounded-[28px] border border-dashed border-sky-200 bg-sky-50/50">
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Sheet</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{data.name}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{data.description}</p>
        </div>
        <div className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
          {data.teamCount}팀 · {data.memberCount}명
        </div>
      </div>
    </div>
  );
}

function TeamNode({ data }: NodeProps<TeamNodeData>) {
  return (
    <div className={cn('relative h-full rounded-2xl border bg-card p-4 shadow-soft', toneBorder[data.tone])}>
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white !bg-slate-900" />
      <div className={cn('absolute left-0 top-0 h-1.5 w-full rounded-t-2xl', toneAccent[data.tone])} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Team</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{data.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">리드 {data.lead}</p>
        </div>
        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {data.memberCount}명
        </span>
      </div>
    </div>
  );
}

function MemberNode({ data }: NodeProps<MemberNodeData>) {
  return (
    <div className="relative flex h-full items-center rounded-xl border border-border bg-background px-4 shadow-sm">
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" />
      <div>
        <p className="text-sm font-medium text-foreground">{data.name}</p>
        <p className="text-xs text-muted-foreground">{data.title}</p>
      </div>
    </div>
  );
}

const nodeTypes = {
  sheet: SheetNode,
  team: TeamNode,
  member: MemberNode
};

function buildGraph(sheets: OrgSheet[], teams: Team[]) {
  const teamMap = new Map(teams.map((team) => [team.slug, team]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let yOffset = 0;

  sheets.forEach((sheet) => {
    const sheetTeams = sheet.teamSlugs.map((slug) => teamMap.get(slug)).filter(Boolean) as Team[];
    const teamCount = sheetTeams.length;
    const memberCount = sheetTeams.reduce((total, team) => total + team.people.length, 0);
    const columnWidth = (1100 - SHEET_PADDING * 2 - TEAM_GAP * Math.max(teamCount - 1, 0)) / teamCount;
    const teamHeights = sheetTeams.map((team) => TEAM_HEIGHT + MEMBER_GAP + team.people.length * MEMBER_HEIGHT + Math.max(team.people.length - 1, 0) * MEMBER_GAP);
    const innerHeight = Math.max(...teamHeights, TEAM_HEIGHT);
    const sheetHeight = SHEET_HEADER_HEIGHT + innerHeight + SHEET_PADDING;

    nodes.push({
      id: sheet.id,
      type: 'sheet',
      position: { x: 0, y: yOffset },
      data: {
        name: sheet.name,
        description: sheet.description,
        teamCount,
        memberCount
      },
      style: {
        width: 1100,
        height: sheetHeight,
        zIndex: 0
      },
      selectable: false,
      draggable: false
    });

    sheetTeams.forEach((team, teamIndex) => {
      const x = SHEET_PADDING + teamIndex * (columnWidth + TEAM_GAP);
      const y = SHEET_HEADER_HEIGHT;
      const memberTop = y + TEAM_HEIGHT + MEMBER_GAP;

      nodes.push({
        id: team.slug,
        type: 'team',
        parentId: sheet.id,
        extent: 'parent',
        position: { x, y },
        data: {
          name: team.name,
          lead: team.lead,
          memberCount: team.members,
          tone: team.tone
        },
        style: {
          width: columnWidth,
          height: TEAM_HEIGHT,
          zIndex: 2
        },
        draggable: false,
        selectable: false
      });

      team.people.forEach((person, memberIndex) => {
        nodes.push({
          id: person.id,
          type: 'member',
          parentId: sheet.id,
          extent: 'parent',
          position: {
            x,
            y: memberTop + memberIndex * (MEMBER_HEIGHT + MEMBER_GAP)
          },
          data: {
            name: person.name,
            title: person.title
          },
          style: {
            width: columnWidth,
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
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: 'rgba(100,116,139,0.7)'
          },
          style: {
            stroke: 'rgba(100,116,139,0.7)',
            strokeWidth: 1.5
          }
        });
      });
    });

    yOffset += sheetHeight + SHEET_GAP;
  });

  return { nodes, edges };
}

type OrganizationFlowProps = {
  sheets: OrgSheet[];
  teams: Team[];
};

export function OrganizationFlow({ sheets, teams }: OrganizationFlowProps) {
  const { nodes, edges } = React.useMemo(() => buildGraph(sheets, teams), [sheets, teams]);

  return (
    <div className="h-[780px] w-full overflow-hidden rounded-3xl border border-border bg-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnDoubleClick={false}
        minZoom={0.45}
        maxZoom={1.2}
      >
        <Background gap={24} size={1} color="rgba(148, 163, 184, 0.22)" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            if (node.type === 'sheet') return 'rgba(14, 165, 233, 0.22)';
            if (node.type === 'team') return 'rgba(15, 23, 42, 0.5)';
            return 'rgba(100, 116, 139, 0.45)';
          }}
          maskColor="rgba(15, 23, 42, 0.08)"
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
