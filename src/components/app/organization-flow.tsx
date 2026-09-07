import * as React from 'react';
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { OrgLeader, OrgSheet, OrgMember, Team } from '../../lib/site-data';

type SheetNodeData = {
  name: string;
  description: string;
  memberCount: number;
};

type LeadNodeData = {
  name: string;
  title: string;
  avatar?: string;
};

type MemberNodeData = {
  name: string;
  title: string;
};

const FLOW_WIDTH = 1110;
const SHEET_WIDTH = 332;
const SHEET_GAP = 40;
const SHEET_HEADER_HEIGHT = 64;
const SHEET_PADDING_X = 16;
const SHEET_PADDING_Y = 18;
const LEAD_CARD_HEIGHT = 92;
const LEAD_MEMBER_GAP = 16;
const MEMBER_WIDTH = 300;
const MEMBER_HEIGHT = 88;
const MEMBER_GAP = 16;
const SHEET_Y = 190;
const TOP_Y = 0;
const LEADER_WIDTH = 240;
const LEADER_HEIGHT = 108;

function initialOf(name: string) {
  return name.trim().charAt(0);
}

function SheetNode({ data }: NodeProps<SheetNodeData>) {
  return (
    <div className="relative flex h-full w-full flex-col rounded-[28px] border border-slate-200 bg-white/90 px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Team</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{data.name}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{data.description}</p>
        </div>
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {data.memberCount}명
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
    </div>
  );
}

function LeadNode({ data }: NodeProps<LeadNodeData>) {
  return (
    <div className="flex h-full w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white shadow-sm">
        {data.avatar ?? initialOf(data.name)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{data.name}</p>
        <p className="text-sm text-slate-500">{data.title}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
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
  sheet: SheetNode,
  lead: LeadNode,
  member: MemberNode
};

function buildGraph(leader: OrgLeader, sheets: OrgSheet[], teams: Team[]) {
  const teamMap = new Map(teams.map((team) => [team.sheetId, team]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const totalWidth = sheets.length * SHEET_WIDTH + Math.max(sheets.length - 1, 0) * SHEET_GAP;
  const startX = (FLOW_WIDTH - totalWidth) / 2;

  sheets.forEach((sheet, index) => {
    const team = teamMap.get(sheet.id);
    if (!team) return;

    const sheetX = startX + index * (SHEET_WIDTH + SHEET_GAP);
    const isExecutive = sheet.id === 'sheet-executive';
    const leadPerson: OrgMember & { avatar?: string } = isExecutive
      ? {
          id: 'executive-lead',
          name: leader.name,
          title: leader.title,
          avatar: leader.avatar
        }
      : (team.people.find((person) => person.name === team.lead) ?? team.people[0]);
    const memberPeople = team.people.filter((person) => person.name !== leadPerson.name);
    const memberCount = 1 + memberPeople.length;
    const sheetHeight = Math.max(
      276,
      SHEET_HEADER_HEIGHT + SHEET_PADDING_Y + LEAD_CARD_HEIGHT + LEAD_MEMBER_GAP + memberPeople.length * MEMBER_HEIGHT + Math.max(memberPeople.length - 1, 0) * MEMBER_GAP + SHEET_PADDING_Y
    );
    const innerWidth = SHEET_WIDTH - SHEET_PADDING_X * 2;
    const leadNodeId = `${sheet.id}-lead`;

    nodes.push({
      id: sheet.id,
      type: 'sheet',
      position: { x: sheetX, y: SHEET_Y },
      data: {
        name: sheet.name,
        description: sheet.description,
        memberCount
      },
      style: {
        width: SHEET_WIDTH,
        height: sheetHeight
      },
      draggable: false,
      selectable: false
    });

    nodes.push({
      id: leadNodeId,
      type: 'lead',
      parentId: sheet.id,
      extent: 'parent',
      position: { x: SHEET_PADDING_X, y: SHEET_HEADER_HEIGHT + SHEET_PADDING_Y },
      data: {
        name: leadPerson.name,
        title: leadPerson.title,
        avatar: isExecutive ? leader.avatar : undefined
      },
      style: {
        width: innerWidth,
        height: LEAD_CARD_HEIGHT
      },
      draggable: false,
      selectable: false
    });

    edges.push({
      id: `${sheet.id}-lead`,
      source: sheet.id,
      target: leadNodeId,
      type: 'smoothstep',
      style: {
        stroke: '#d1d5db',
        strokeWidth: 1.5
      }
    });

    memberPeople.forEach((person, memberIndex) => {
      const memberNodeId = person.id;
      nodes.push({
        id: memberNodeId,
        type: 'member',
        parentId: sheet.id,
        extent: 'parent',
        position: {
          x: SHEET_PADDING_X,
          y: SHEET_HEADER_HEIGHT + SHEET_PADDING_Y + LEAD_CARD_HEIGHT + LEAD_MEMBER_GAP + memberIndex * (MEMBER_HEIGHT + MEMBER_GAP)
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
        id: `${leadNodeId}-${memberNodeId}`,
        source: leadNodeId,
        target: memberNodeId,
        type: 'smoothstep',
        style: {
          stroke: '#d1d5db',
          strokeWidth: 1.5
        }
      });
    });
  });

  if (sheets.length > 1) {
    const rootSheetId = sheets[0].id;
    sheets.slice(1).forEach((sheet) => {
      edges.push({
        id: `${rootSheetId}-${sheet.id}`,
        source: rootSheetId,
        target: sheet.id,
        type: 'smoothstep',
        style: {
          stroke: '#d1d5db',
          strokeWidth: 1.5
        }
      });
    });
  }

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
