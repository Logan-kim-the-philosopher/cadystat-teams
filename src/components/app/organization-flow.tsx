import * as React from 'react';
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { OrgMember, OrgUnit } from '../../lib/site-data';

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
  compact?: boolean;
};

type SheetLayout = {
  unit: OrgUnit;
  width: number;
  height: number;
  mode: 'hierarchical' | 'horizontal';
  leadPerson: OrgMember | null;
  members: OrgMember[];
};

const FLOW_WIDTH = 1110;
const SHEET_WIDTH = 332;
const SHEET_GAP = 40;
const SHEET_HEADER_HEIGHT = 64;
const SHEET_PADDING_X = 16;
const SHEET_PADDING_Y = 18;
const LEAD_CARD_HEIGHT = 92;
const HIER_MEMBER_WIDTH = 300;
const HIER_MEMBER_HEIGHT = 88;
const HIER_MEMBER_GAP = 16;
const FLAT_MEMBER_WIDTH = 124;
const FLAT_MEMBER_HEIGHT = 72;
const FLAT_MEMBER_GAP = 12;
const SHEET_Y = 190;
const TOP_Y = 0;

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
    <div
      className={
        data.compact
          ? 'flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'
          : 'flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'
      }
    >
      {!data.compact ? <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" /> : null}
      <div
        className={
          data.compact
            ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-sm'
            : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white shadow-sm'
        }
      >
        {initialOf(data.name)}
      </div>
      <div className="min-w-0">
        <p className={data.compact ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-slate-900'}>{data.name}</p>
        <p className={data.compact ? 'text-xs text-slate-500' : 'text-sm text-slate-500'}>{data.title}</p>
      </div>
    </div>
  );
}

const nodeTypes = {
  sheet: SheetNode,
  lead: LeadNode,
  member: MemberNode
};

function resolveSheetLayout(unit: OrgUnit): SheetLayout {
  const leadIndex = unit.leadMemberId ? unit.people.findIndex((person) => person.id === unit.leadMemberId) : -1;
  const hasLead = leadIndex >= 0;
  const leadPerson = hasLead ? unit.people[leadIndex] : null;
  const members = hasLead ? unit.people.filter((_, index) => index !== leadIndex) : unit.people;

  if (hasLead) {
    const memberCount = team.people.length;
    const height = Math.max(
      276,
      SHEET_HEADER_HEIGHT + SHEET_PADDING_Y + LEAD_CARD_HEIGHT + SHEET_PADDING_Y + members.length * HIER_MEMBER_HEIGHT + Math.max(members.length - 1, 0) * HIER_MEMBER_GAP + SHEET_PADDING_Y
    );

    return {
      sheet: unit,
      team: unit,
      width: SHEET_WIDTH,
      height,
      mode: 'hierarchical',
      leadPerson,
      members
    };
  }

  const rowWidth = members.length * FLAT_MEMBER_WIDTH + Math.max(members.length - 1, 0) * FLAT_MEMBER_GAP;
  const width = Math.max(SHEET_WIDTH, SHEET_PADDING_X * 2 + rowWidth);
  const height = SHEET_HEADER_HEIGHT + SHEET_PADDING_Y + FLAT_MEMBER_HEIGHT + SHEET_PADDING_Y;

  return {
    sheet,
    team,
    width,
    height,
    mode: 'horizontal',
    leadPerson: null,
    members
  };
}

function buildGraph(units: OrgUnit[]) {
  const layouts = units
    .map((unit) => resolveSheetLayout(unit))
    .filter((layout): layout is SheetLayout => Boolean(layout));

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const totalWidth = layouts.reduce((sum, layout, index) => sum + layout.width + (index > 0 ? SHEET_GAP : 0), 0);
  let cursorX = (FLOW_WIDTH - totalWidth) / 2;

  layouts.forEach((layout, index) => {
    const { sheet, team, width, height, mode, leadPerson, members } = layout;
    const sheetX = cursorX;
    cursorX += width + (index < layouts.length - 1 ? SHEET_GAP : 0);
    const innerWidth = width - SHEET_PADDING_X * 2;

    nodes.push({
      id: sheet.id,
      type: 'sheet',
      position: { x: sheetX, y: SHEET_Y },
      data: {
        name: sheet.name,
        description: sheet.description,
        memberCount: team.people.length
      },
      style: {
        width,
        height
      },
      draggable: false,
      selectable: false
    });

    if (mode === 'hierarchical' && leadPerson) {
      const leadNodeId = `${sheet.id}-lead`;
      nodes.push({
        id: leadNodeId,
        type: 'lead',
        parentId: sheet.id,
        extent: 'parent',
        position: { x: SHEET_PADDING_X, y: SHEET_HEADER_HEIGHT + SHEET_PADDING_Y },
        data: {
          name: leadPerson.name,
          title: leadPerson.title
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

      const memberNodeIds = new Map<string, string>([[leadPerson.id, leadNodeId]]);
      members.forEach((person) => memberNodeIds.set(person.id, person.id));

      members.forEach((person, memberIndex) => {
        const memberNodeId = person.id;
        nodes.push({
          id: memberNodeId,
          type: 'member',
          parentId: sheet.id,
          extent: 'parent',
          position: {
            x: SHEET_PADDING_X,
            y: SHEET_HEADER_HEIGHT + SHEET_PADDING_Y + LEAD_CARD_HEIGHT + SHEET_PADDING_Y + memberIndex * (HIER_MEMBER_HEIGHT + HIER_MEMBER_GAP)
          },
          data: {
            name: person.name,
            title: person.title
          },
          style: {
            width: innerWidth,
            height: HIER_MEMBER_HEIGHT
          },
          draggable: false,
          selectable: false
        });

        const reportingNodeId = person.reportsToMemberId ? memberNodeIds.get(person.reportsToMemberId) : leadNodeId;
        if (!reportingNodeId) return;

        edges.push({
          id: `${reportingNodeId}-${memberNodeId}`,
          source: reportingNodeId,
          target: memberNodeId,
          type: 'smoothstep',
          style: {
            stroke: '#d1d5db',
            strokeWidth: 1.5
          }
        });
      });
      return;
    }

    members.forEach((person, memberIndex) => {
      nodes.push({
        id: person.id,
        type: 'member',
        parentId: sheet.id,
        extent: 'parent',
        position: {
          x: SHEET_PADDING_X + memberIndex * (FLAT_MEMBER_WIDTH + FLAT_MEMBER_GAP),
          y: SHEET_HEADER_HEIGHT + SHEET_PADDING_Y
        },
        data: {
          name: person.name,
          title: person.title,
          compact: true
        },
        style: {
          width: FLAT_MEMBER_WIDTH,
          height: FLAT_MEMBER_HEIGHT
        },
        draggable: false,
        selectable: false
      });
    });
  });

  if (layouts.length > 1) {
    const rootSheetId = layouts.find((layout) => layout.sheet.parentId === null)?.sheet.id ?? layouts[0].sheet.id;
    layouts.filter((layout) => layout.sheet.id !== rootSheetId).forEach((layout) => {
      edges.push({
        id: `${layout.sheet.parentId ?? rootSheetId}-${layout.sheet.id}`,
        source: layout.sheet.parentId ?? rootSheetId,
        target: layout.sheet.id,
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
  units: OrgUnit[];
};

export function OrganizationFlow({ units }: OrganizationFlowProps) {
  const { nodes, edges } = React.useMemo(() => buildGraph(units), [units]);

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
