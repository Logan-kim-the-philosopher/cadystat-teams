import * as React from 'react';
import dagre from '@dagrejs/dagre';
import { Background, Handle, Panel, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import type { OrgMember, OrgUnit } from '../../lib/site-data';
import { OrganizationMemberNode, type OrganizationMemberNodeData } from './organization-member-node';

type SheetNodeData = {
  name: string;
  memberCount: number;
};

type LeadNodeData = {
  name: string;
  title: string;
  role: 'lead';
  gender: 'male' | 'female';
  avatar?: string;
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
const SHEET_HEADER_GAP = 0;
const LEAD_CARD_HEIGHT = 88;
const HIER_MEMBER_WIDTH = 220;
const HIER_MEMBER_HEIGHT = 88;
const HIER_MEMBER_GAP = 16;
const FLAT_MEMBER_WIDTH = 220;
const FLAT_MEMBER_HEIGHT = 88;
const FLAT_MEMBER_GAP = 12;
const SHEET_Y = 190;
const TOP_Y = 0;

function initialOf(name: string) {
  return name.trim().charAt(0);
}

function profileIllustration(gender: 'male' | 'female') {
  return gender === 'male' ? '/avatars/profile-male.svg' : '/avatars/profile-female.svg';
}

function SheetNode({ data }: NodeProps<SheetNodeData>) {
  return (
    <>
    <style>{`.react-flow__node:hover > .relative { border-color: rgb(148 163 184); box-shadow: 0 20px 35px rgba(15,23,42,.12); }`}</style>
    <div className="relative flex h-full w-full cursor-pointer flex-col rounded-[28px] border-2 border-slate-200 bg-[#FCFCFD] px-5 py-4 transition-shadow hover:border-slate-300 hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <div className="-mx-5 -mt-4 mb-4 flex items-start justify-between gap-3 rounded-t-[26px] border-b-2 border-slate-200 bg-slate-200/70 px-5 py-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{data.name}</h3>
        </div>
        <span className="text-lg font-semibold text-slate-600">
          {data.memberCount}명
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
    </div>
    </>
  );
}

function LeadNode({ data }: NodeProps<LeadNodeData>) {
  return (
    <div className="flex h-full w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white shadow-sm">
        <img src={data.avatar ?? profileIllustration(data.gender)} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{data.name}</p>
          <p className="shrink-0 text-xs font-medium text-slate-400">{data.role}</p>
        </div>
        <p className="truncate text-sm text-slate-500">{data.title}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-transparent" />
    </div>
  );
}

function JunctionNode() {
  return (
    <div className="h-px w-px">
      <Handle type="target" position={Position.Top} className="!h-px !w-px !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="!h-px !w-px !border-0 !bg-transparent" />
    </div>
  );
}


const nodeTypes = {
  sheet: SheetNode,
  lead: LeadNode,
  member: OrganizationMemberNode,
  junction: JunctionNode
};

function resolveSheetLayout(unit: OrgUnit): SheetLayout {
  const leadIndex = unit.leadMemberId ? unit.people.findIndex((person) => person.id === unit.leadMemberId) : -1;
  const hasLead = leadIndex >= 0;
  const leadPerson = hasLead ? unit.people[leadIndex] : null;
  const members = hasLead ? unit.people.filter((_, index) => index !== leadIndex) : unit.people;

  if (hasLead) {
    const memberCount = unit.people.length;
    const depths = new Map<string, number>([[leadPerson.id, 0]]);
    const pending = [...members];
    while (pending.length > 0) {
      const person = pending.shift();
      if (!person) break;
      const parentDepth = person.reportsToMemberId ? depths.get(person.reportsToMemberId) : 0;
      if (parentDepth === undefined) {
        pending.push(person);
        continue;
      }
      depths.set(person.id, parentDepth + 1);
    }
    const maxBreadth = Math.max(...Array.from(depths.values()).map((depth) => Array.from(depths.values()).filter((value) => value === depth).length), 1);
    const width = Math.max(SHEET_WIDTH, SHEET_PADDING_X * 2 + maxBreadth * HIER_MEMBER_WIDTH + Math.max(maxBreadth - 1, 0) * HIER_MEMBER_GAP);
    const height = Math.max(
      276,
      SHEET_HEADER_HEIGHT + SHEET_HEADER_GAP + LEAD_CARD_HEIGHT + SHEET_PADDING_Y + members.length * HIER_MEMBER_HEIGHT + Math.max(members.length - 1, 0) * HIER_MEMBER_GAP + SHEET_PADDING_Y
    );

    return {
      sheet: unit,
      team: unit,
      width,
      height,
      mode: 'hierarchical',
      leadPerson,
      members
    };
  }

  const rowWidth = members.length * FLAT_MEMBER_WIDTH + Math.max(members.length - 1, 0) * FLAT_MEMBER_GAP;
  const width = Math.max(SHEET_WIDTH, SHEET_PADDING_X * 2 + rowWidth);
  const height = SHEET_HEADER_HEIGHT + SHEET_HEADER_GAP + FLAT_MEMBER_HEIGHT + SHEET_PADDING_Y;

  return {
    sheet: unit,
    team: unit,
    width,
    height,
    mode: 'horizontal',
    leadPerson: null,
    members
  };
}

function buildGraph(units: OrgUnit[]) {
  const layouts = units
    .slice()
    .sort((a, b) => (a.name === '운영진' ? -1 : b.name === '운영진' ? 1 : 0))
    .map((unit) => resolveSheetLayout(unit))
    .filter((layout): layout is SheetLayout => Boolean(layout));

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const totalWidth = layouts.reduce((sum, layout, index) => sum + layout.width + (index > 0 ? SHEET_GAP : 0), 0);
  let cursorX = Math.max(24, (FLOW_WIDTH - totalWidth) / 2);

  layouts.forEach((layout, index) => {
    const { sheet, width, height, mode, leadPerson, members } = layout;
    const sheetX = cursorX;
    cursorX += width + (index < layouts.length - 1 ? SHEET_GAP : 0);
    const innerWidth = width - SHEET_PADDING_X * 2;

    nodes.push({
      id: sheet.id,
      type: 'sheet',
      position: { x: sheetX, y: SHEET_Y },
      data: {
        name: sheet.name,
        memberCount: sheet.people.length
      },
      style: {
        width,
        height
      },
      draggable: false,
      selectable: true,
      zIndex: 0
    });

    if (mode === 'hierarchical' && leadPerson) {
      const leadNodeId = `${sheet.id}-lead`;
      nodes.push({
        id: leadNodeId,
        type: 'lead',
        position: { x: sheetX + SHEET_PADDING_X, y: SHEET_Y + SHEET_HEADER_HEIGHT + SHEET_HEADER_GAP },
        data: {
          name: leadPerson.name,
          title: leadPerson.title,
          role: '팀장',
          gender: leadPerson.gender
        },
        style: {
          width: HIER_MEMBER_WIDTH,
          height: LEAD_CARD_HEIGHT
        },
        draggable: false,
        selectable: false,
        zIndex: 1
      });

      const memberNodeIds = new Map<string, string>([[leadPerson.id, leadNodeId]]);
      members.forEach((person) => memberNodeIds.set(person.id, person.id));

      members.forEach((person, memberIndex) => {
        const memberNodeId = person.id;
        nodes.push({
          id: memberNodeId,
          type: 'member',
          position: {
            x: sheetX + SHEET_PADDING_X,
            y: SHEET_Y + SHEET_HEADER_HEIGHT + SHEET_HEADER_GAP + LEAD_CARD_HEIGHT + SHEET_PADDING_Y + memberIndex * (HIER_MEMBER_HEIGHT + HIER_MEMBER_GAP)
          },
          data: {
            name: person.name,
            title: person.title,
            role: '팀원',
            gender: person.gender
          },
          style: {
            width: HIER_MEMBER_WIDTH,
            height: HIER_MEMBER_HEIGHT
          },
          draggable: false,
          selectable: false,
          zIndex: 1
        });

      });
      return;
    }

    members.forEach((person, memberIndex) => {
      nodes.push({
        id: person.id,
        type: 'member',
        position: {
          x: sheetX + SHEET_PADDING_X + memberIndex * (FLAT_MEMBER_WIDTH + FLAT_MEMBER_GAP),
          y: SHEET_Y + SHEET_HEADER_HEIGHT + SHEET_HEADER_GAP
        },
        data: {
          name: person.name,
          title: person.title,
          role: '팀원',
          gender: person.gender,
          compact: true
        },
        style: {
          width: FLAT_MEMBER_WIDTH,
          height: FLAT_MEMBER_HEIGHT
        },
        draggable: false,
        selectable: false,
        zIndex: 1
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
          stroke: '#94a3b8',
          strokeWidth: 2
        }
      });
    });
  }

  // Dagre lays out organization cards according to parentId. Member nodes keep
  // their positions inside each card and move together with that card.
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 56, marginx: 24, marginy: 24 });

  layouts.forEach((layout) => {
    dagreGraph.setNode(layout.sheet.id, { width: layout.width, height: layout.height });
  });
  edges
    .filter((edge) => layouts.some((layout) => layout.sheet.id === edge.source) && layouts.some((layout) => layout.sheet.id === edge.target))
    .forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childTopByParent = new Map<string, number>();
  layouts.forEach((layout) => {
    if (layout.sheet.parentId === null) return;
    const dagrePosition = dagreGraph.node(layout.sheet.id);
    if (!dagrePosition) return;
    const top = dagrePosition.y - layout.height / 2;
    const current = childTopByParent.get(layout.sheet.parentId);
    childTopByParent.set(layout.sheet.parentId, current === undefined ? top : Math.max(current, top));
  });
  layouts.forEach((layout) => {
    const sheetNode = nodesById.get(layout.sheet.id);
    const dagrePosition = dagreGraph.node(layout.sheet.id);
    if (!sheetNode || !dagrePosition) return;

    const nextX = dagrePosition.x - layout.width / 2;
    const dagreTop = dagrePosition.y - layout.height / 2;
    const nextY = layout.sheet.parentId === null
      ? dagreTop
      : childTopByParent.get(layout.sheet.parentId) ?? dagreTop;
    const deltaX = nextX - sheetNode.position.x;
    const deltaY = nextY - sheetNode.position.y;
    const memberIds = new Set(layout.sheet.people.map((person) => person.id));

    nodes.forEach((node) => {
      if (node.id === layout.sheet.id || memberIds.has(node.id) || node.id === `${layout.sheet.id}-lead`) {
        node.position = { x: node.position.x + deltaX, y: node.position.y + deltaY };
      }
    });

    if (layout.mode !== 'hierarchical' || !layout.leadPerson) return;

    // Lay out members from reportsToMemberId instead of treating them as one list.
    const memberGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    const memberWidth = HIER_MEMBER_WIDTH;
    memberGraph.setGraph({ rankdir: 'TB', nodesep: 16, ranksep: 56, marginx: 0, marginy: 0 });
    const leadNodeId = `${layout.sheet.id}-lead`;
    memberGraph.setNode(leadNodeId, { width: memberWidth, height: LEAD_CARD_HEIGHT });
    layout.members.forEach((person) => memberGraph.setNode(person.id, { width: memberWidth, height: HIER_MEMBER_HEIGHT }));

    const childrenByManager = new Map<string, string[]>();
    layout.members.forEach((person) => {
      const managerId = person.reportsToMemberId
        ? (person.reportsToMemberId === layout.leadPerson.id ? leadNodeId : person.reportsToMemberId)
        : leadNodeId;
      if (!managerId) return;
      childrenByManager.set(managerId, [...(childrenByManager.get(managerId) ?? []), person.id]);
    });
    childrenByManager.forEach((children, managerId) => {
      children.forEach((childId) => {
        memberGraph.setEdge(managerId, childId);
        edges.push({ id: `${managerId}-${childId}`, source: managerId, target: childId, type: 'smoothstep', zIndex: 2, style: { stroke: '#94a3b8', strokeWidth: 2 } });
      });
    });
    nodes.forEach((node) => nodesById.set(node.id, node));
    dagre.layout(memberGraph);

    const memberGraphSize = memberGraph.graph();
    const memberNodeIds = [leadNodeId, ...layout.members.map((person) => person.id)];
    const memberPositions = memberNodeIds.map((nodeId) => memberGraph.node(nodeId));
    const minMemberX = Math.min(...memberPositions.map((position) => position.x - memberWidth / 2));
    const maxMemberX = Math.max(...memberPositions.map((position) => position.x + memberWidth / 2));
    const memberOffsetX = (layout.width - (maxMemberX - minMemberX)) / 2 - minMemberX;
    if (sheetNode) {
      sheetNode.style = {
        ...sheetNode.style,
        width: Math.max(layout.width, (memberGraphSize.width ?? 0) + SHEET_PADDING_X * 2),
        height: SHEET_HEADER_HEIGHT + SHEET_HEADER_GAP + SHEET_PADDING_Y + (memberGraphSize.height ?? 0)
      };
    }

    const hierarchyNodeIds = memberGraph.nodes().filter((nodeId) => Boolean(memberGraph.node(nodeId)));
    hierarchyNodeIds.forEach((nodeId) => {
      const node = nodesById.get(nodeId);
      const position = memberGraph.node(nodeId);
      if (!node || !position) return;
      const isJunction = nodeId.endsWith('-junction');
      const nodeWidth = isJunction ? 1 : memberWidth;
      const nodeHeight = isJunction ? 1 : nodeId === leadNodeId ? LEAD_CARD_HEIGHT : HIER_MEMBER_HEIGHT;
      node.position = {
        x: nextX + memberOffsetX + position.x - nodeWidth / 2,
        y: nextY + SHEET_HEADER_HEIGHT + SHEET_HEADER_GAP + position.y - nodeHeight / 2
      };
    });

    // Center each manager above the direct reports Dagre placed below it.
    [...hierarchyNodeIds]
      .sort((left, right) => (memberGraph.node(right)?.y ?? 0) - (memberGraph.node(left)?.y ?? 0))
      .forEach((nodeId) => {
        const children = layout.members
          .filter((person) => (person.reportsToMemberId ? person.reportsToMemberId : layout.leadPerson.id) === (nodeId === leadNodeId ? layout.leadPerson.id : nodeId))
          .map((person) => person.id);
        const node = nodesById.get(nodeId);
        if (!node || children.length === 0) return;
        const childCenters = children
          .map((childId) => nodesById.get(childId))
          .filter((child): child is Node => Boolean(child))
          .map((child) => child.position.x + memberWidth / 2);
        if (childCenters.length > 0) {
          node.position.x = childCenters.reduce((sum, center) => sum + center, 0) / childCenters.length - memberWidth / 2;
        }
      });
  });

  return { nodes, edges };
}

type OrganizationFlowProps = {
  units: OrgUnit[];
};

export function OrganizationFlow({ units }: OrganizationFlowProps) {
  const [planeUnits, setPlaneUnits] = React.useState<OrgUnit[] | null>(null);
  const [planeError, setPlaneError] = React.useState<string | null>(null);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<OrgUnit | null>(null);
  const [isTeamDirty, setIsTeamDirty] = React.useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false);
  const [organizationRefresh, setOrganizationRefresh] = React.useState(0);
  const [editingMember, setEditingMember] = React.useState<OrgMember | null>(null);
  const [draftMembers, setDraftMembers] = React.useState<Record<string, OrgMember[]>>({});
  const [isOrganizationSaving, setIsOrganizationSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch(`/api/organization?refresh=${Date.now()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? `Supabase 오류 (${response.status})`);
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        if (!payload?.members) throw new Error('조직도 응답에 members가 없습니다.');
        setPlaneError(null);
        const projectSlugById: Record<string, string> = {
          'f74a3d41-b751-47c7-9e7e-dccb6fdd1376': 'executive',
          '2ed7cfb0-8c81-4dcf-bbc6-2577ce3bc3ad': 'product',
          'dbede9f0-feb1-4c4c-88dd-0cf213b67aa3': 'engineering',
          '9504146c-a139-4476-a4be-133c997ef4d4': 'operations',
        };
        const planeTeams = payload.teams as Array<{ id: string; name: string; parentTeamId: string | null; leadMemberId: string | null }>;
        const planeMembers = payload.members as Array<{ id: string; name: string; title: string; gender?: 'male' | 'female' | null; teamProjectId: string | null; reportsTo: string | null; sortOrder: number }>;
        const executiveTeam = planeTeams.find((team) => team.name === '운영진') ?? planeTeams[0];
        const nextUnits = planeTeams.map((team, index) => {
          const slug = projectSlugById[team.id] ?? `plane-${team.id}`;
          const people = planeMembers
            .filter((member) => member.teamProjectId === team.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((member) => ({
              id: member.id,
              name: member.name,
              title: member.title,
              gender: member.gender ?? 'male',
              orgUnitId: team.id,
              reportsToMemberId: member.reportsTo,
            }));
          const lead = people.find((person) => person.reportsToMemberId === null) ?? people[0] ?? null;
          return {
            id: team.id,
            slug,
            name: team.name,
            parentId: team.parentTeamId ?? null,
            leadMemberId: team.leadMemberId ?? null,
            members: people.length,
            tickets: 0,
            tone: index % 2 ? 'green' : 'blue',
            people,
          };
        });
        setPlaneUnits(nextUnits);
      })
      .catch((error: unknown) => {
        if (active) {
          setPlaneError(error instanceof Error ? error.message : '조직도 조회에 실패했습니다.');
          setPlaneUnits(null);
        }
      });


    return () => {
      active = false;
    };
  }, [units, organizationRefresh]);

  // Do not render the static fallback before Plane responds; otherwise the
  // mock team name briefly flashes before the 조직 데이터 replaces it.
  const canvasUnits = planeUnits ?? [];
  const renderedUnits = (planeUnits ?? []).map((unit) => ({
    ...unit,
    people: draftMembers[unit.id] ?? unit.people,
    members: (draftMembers[unit.id] ?? unit.people).length,
  }));
  React.useEffect(() => {
    if (!editingUnit || !planeUnits) return;
    const updated = planeUnits.find((unit) => unit.id === editingUnit.id);
    if (updated) setEditingUnit(updated);
  }, [planeUnits, editingUnit?.id]);
  async function createTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/organization', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    if (!response.ok) { window.alert('팀 생성에 실패했습니다.'); return; }
    setIsTeamDialogOpen(false);
    setPlaneUnits(null);
    setPlaneUnits(null); setOrganizationRefresh((value) => value + 1);
  }
  const { nodes, edges } = React.useMemo(() => buildGraph(canvasUnits), [canvasUnits]);

  return (
    <div
      className="relative w-full overflow-hidden border-x-0 border-b-0 border-t border-slate-200 bg-[#fcfcfd]"
      style={{ height: 'max(520px, calc(100dvh - 77px))' }}
    >
      {planeError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
          <div className="rounded-2xl border border-red-200 bg-white px-6 py-5 text-sm text-red-700 shadow-sm">
            조직도 데이터를 불러오지 못했습니다.<br />
            <span className="text-xs text-red-500">{planeError}</span>
          </div>
        </div>
      ) : null}
      {!planeUnits && !planeError ? (
        <div className="absolute inset-0 z-10 overflow-hidden bg-[#fcfcfd] p-8 [background-image:radial-gradient(rgba(100,116,139,0.16)_2.5px,transparent_2.5px)] [background-size:56px_56px]">
          <div className="mx-auto mb-16 h-4 w-48 animate-pulse rounded-full bg-slate-200" />
          <div className="mx-auto grid max-w-6xl grid-cols-4 gap-10">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-[28px] border-2 border-slate-200 bg-white p-5">
                <div className="mb-8 h-8 w-2/3 rounded-lg bg-slate-200" />
                <div className="mx-auto h-16 w-48 rounded-2xl bg-slate-100" />
                <div className="mt-8 grid grid-cols-2 gap-3"><div className="h-14 rounded-xl bg-slate-100" /><div className="h-14 rounded-xl bg-slate-100" /></div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <ReactFlow
        key={planeUnits ? 'organization-loaded' : 'organization-loading'}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView={false}
        // 운영진(조직도 최상위 팀)을 첫 화면의 상단 중앙에 배치한다.
        defaultViewport={{ x: 0, y: 0, zoom: 0.3 }}
        onInit={(instance) => {
          const executive = nodes.find((node) => node.type === 'sheet' && node.data.name === '운영진');
          if (!executive) return;
          const width = Number(executive.style?.width ?? SHEET_WIDTH);
          const canvasWidth = document.querySelector('.react-flow')?.clientWidth ?? window.innerWidth;
          const xBounds = nodes.reduce((bounds, node) => ({ min: Math.min(bounds.min, node.position.x), max: Math.max(bounds.max, node.position.x + Number(node.style?.width ?? SHEET_WIDTH)) }), { min: Infinity, max: -Infinity });
          instance.setViewport({
            x: canvasWidth / 2 - ((xBounds.min + xBounds.max) / 2) * 0.6,
            y: 104 - executive.position.y * 0.6,
            zoom: 0.6,
          });
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={(_, node) => { const unit = canvasUnits.find((item) => node.id === item.id || node.id.startsWith(`${item.id}-`) || item.people.some((person) => person.id === node.id)); if (unit) { setIsTeamDirty(false); setDraftMembers((drafts) => ({ ...drafts, [unit.id]: drafts[unit.id] ?? unit.people })); setEditingUnit(unit); } }}
        onNodeMouseEnter={(_, node) => { const unit = renderedUnits.find((item) => node.id === item.id || node.id.startsWith(`${item.id}-`) || item.people.some((person) => person.id === node.id)); if (unit) { const el = document.querySelector(`[data-id="${unit.id}"] > div`) as HTMLElement | null; if (el) { el.style.borderColor = 'rgb(148 163 184)'; el.style.boxShadow = '0 20px 35px rgba(15,23,42,.12)'; } } }}
        onNodeMouseLeave={(_, node) => { const unit = renderedUnits.find((item) => node.id === item.id || node.id.startsWith(`${item.id}-`) || item.people.some((person) => person.id === node.id)); if (unit) { const el = document.querySelector(`[data-id="${unit.id}"] > div`) as HTMLElement | null; if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; } } }}
        panOnDrag
        zoomOnScroll
        zoomOnDoubleClick
        minZoom={0.3}
        maxZoom={1.4}
      >
        <Background variant="dots" gap={56} size={5} color="rgba(100, 116, 139, 0.16)" />
        <Panel position="top-left" className="!mt-8 !mb-4 !left-1/2 !right-auto !w-full !max-w-7xl !-translate-x-1/2 !px-2 lg:!px-4">
          <button
            type="button"
            onClick={() => setIsTeamDialogOpen(true)}
            className="inline-flex h-9 w-28 items-center justify-center whitespace-nowrap animate-pulse-ring gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            팀 추가
          </button>
        </Panel>
      </ReactFlow>
      {editingUnit ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDraftMembers((drafts) => { const next = { ...drafts }; delete next[editingUnit.id]; return next; }); setEditingUnit(null); } }}>
          <form className="flex w-full max-w-2xl min-h-[620px] max-h-[90vh] flex-col overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-2xl" onChange={() => setIsTeamDirty(true)} onSubmit={async (event) => { event.preventDefault(); if (isOrganizationSaving) return; setIsOrganizationSaving(true); const form = new FormData(event.currentTarget); const original = editingUnit.people; const draft = draftMembers[editingUnit.id] ?? original; const members = [...draft.map((member) => ({ id: member.id, name: member.name, title: member.title, gender: member.gender, action: member.id.startsWith('draft-') ? 'create' : 'update' })), ...original.filter((member) => !draft.some((next) => next.id === member.id)).map((member) => ({ id: member.id, action: 'delete' }))]; const response = await fetch('/api/organization', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: editingUnit.id, name: form.get('name'), leadMemberId: form.get('leadMemberId'), members }) }); if (!response.ok) { const detail = await response.json().catch(() => ({})); window.alert(detail.error ?? '팀 저장에 실패했습니다.'); setIsOrganizationSaving(false); return; } setDraftMembers((drafts) => { const next = { ...drafts }; delete next[editingUnit.id]; return next; }); setEditingUnit(null); setPlaneUnits(null); setOrganizationRefresh((value) => value + 1); setIsOrganizationSaving(false); }}>
            <div className="mb-6"><h2 className="text-lg font-bold text-slate-900">팀 편집</h2></div>
            <div className="space-y-4"><label className="block text-sm font-medium text-slate-700">팀 이름<input name="name" defaultValue={editingUnit.name} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>{editingUnit.name !== '운영진' ? <label className="block text-sm font-medium text-slate-700">팀장<select name="leadMemberId" defaultValue={editingUnit.leadMemberId ?? ''} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">팀장을 선택하세요</option>{(renderedUnits.find((unit) => unit.id === editingUnit.id)?.people ?? editingUnit.people).map((person) => <option key={person.id} value={person.id}>{person.name} · {person.title}</option>)}</select></label> : null}<div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">팀원 ({(renderedUnits.find((unit) => unit.id === editingUnit.id)?.people ?? editingUnit.people).length})</p><button type="button" onClick={() => setIsMemberDialogOpen(true)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">+ 팀원 추가</button></div><div className="max-h-80 space-y-2 overflow-y-auto">{(renderedUnits.find((unit) => unit.id === editingUnit.id)?.people ?? editingUnit.people).map((person) => <div key={person.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><div><p className="text-sm font-medium text-slate-800">{person.name}</p><p className="text-xs text-slate-500">{person.title}</p></div><div className="flex items-center gap-1"><button type="button" aria-label={`${person.name} 편집`} title="편집" onClick={() => setEditingMember(person)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={14} aria-hidden="true" /></button><button type="button" aria-label={`${person.name} 삭제`} title="삭제" onClick={() => { if (!window.confirm(`${person.name} 구성원을 삭제할까요?`)) return; setDraftMembers((drafts) => ({ ...drafts, [editingUnit.id]: (drafts[editingUnit.id] ?? editingUnit.people).filter((member) => member.id !== person.id) })); setIsTeamDirty(true); }} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} aria-hidden="true" /></button></div></div>)}</div></div></div>
            <div className="mt-auto pt-6 flex items-center justify-between gap-2"><button type="button" onClick={async () => { if (!window.confirm(`${editingUnit.name} 팀을 삭제할까요? 팀원과 연결된 데이터가 정리됩니다.`)) return; const response = await fetch(`/api/organization?id=${encodeURIComponent(editingUnit.id)}`, { method: 'DELETE' }); if (!response.ok) { const detail = await response.text(); window.alert(`팀 삭제에 실패했습니다.\n${detail}`); return; } setEditingUnit(null); setPlaneUnits(null); setOrganizationRefresh((value) => value + 1); }} className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50">팀 삭제</button><div className="flex gap-2"><button type="button" onClick={() => { setDraftMembers((drafts) => { const next = { ...drafts }; delete next[editingUnit.id]; return next; }); setEditingUnit(null); }} className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted">취소</button><button type="submit" disabled={!isTeamDirty || isOrganizationSaving} className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">저장</button></div></div>
          </form>
        </div>
      ) : null}
      {editingMember ? (<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"><form className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (editingUnit) setDraftMembers((drafts) => ({ ...drafts, [editingUnit.id]: (drafts[editingUnit.id] ?? editingUnit.people).map((member) => member.id === editingMember.id ? { ...member, name: String(form.get('name')), title: String(form.get('title')), gender: form.get('gender') as 'male' | 'female' } : member) })); setEditingMember(null); setIsTeamDirty(true); }}><h2 className="text-lg font-bold">구성원 편집</h2><div className="mt-5 space-y-4"><label className="block text-sm font-medium">이름<input required name="name" defaultValue={editingMember.name} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label><label className="block text-sm font-medium">직책<input required name="title" defaultValue={editingMember.title} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label><label className="block text-sm font-medium">성별<select name="gender" defaultValue={editingMember.gender} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5"><option value="male">남성</option><option value="female">여성</option></select></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditingMember(null)} className="h-10 rounded-md border border-input bg-background px-4 text-sm hover:bg-muted">취소</button><button className="h-10 rounded-md bg-primary px-4 font-medium text-primary-foreground">변경</button></div></form></div>) : null}
      {isMemberDialogOpen && editingUnit ? (<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"><form className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const member: OrgMember = { id: `draft-${crypto.randomUUID()}`, name: String(form.get('name')), title: String(form.get('title')), gender: form.get('gender') as 'male' | 'female', orgUnitId: editingUnit.id, reportsToMemberId: editingUnit.leadMemberId }; setDraftMembers((drafts) => ({ ...drafts, [editingUnit.id]: [...(drafts[editingUnit.id] ?? editingUnit.people), member] })); setIsMemberDialogOpen(false); setIsTeamDirty(true); }}><h2 className="text-lg font-bold text-slate-900">팀원 추가</h2><div className="mt-5 space-y-4"><label className="block text-sm font-medium">이름<input required name="name" placeholder="예: 홍길동" className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label><label className="block text-sm font-medium">직책<input required name="title" placeholder="예: Backend" className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label><label className="block text-sm font-medium">성별<select required name="gender" defaultValue="" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>선택하세요</option><option value="male">남성</option><option value="female">여성</option></select></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setIsMemberDialogOpen(false)} className="h-10 rounded-md border border-input bg-background px-4 text-sm hover:bg-muted">취소</button><button className="h-10 rounded-md bg-primary px-4 font-medium text-primary-foreground">추가</button></div></form></div>) : null}
      {isTeamDialogOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsTeamDialogOpen(false); }}>
          <form className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl" onSubmit={createTeam}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">팀 추가</h2>
              </div>
              <button type="button" onClick={() => setIsTeamDialogOpen(false)} className="text-xl text-slate-400 hover:text-slate-700" aria-label="닫기">×</button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">팀 이름 *<input required name="name" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-500" placeholder="예: 고객지원팀" /></label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-sm font-semibold text-slate-800">팀장 정보</p>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">이름 *<input required name="leadName" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-500" placeholder="예: 홍길동" /></label>
                  <label className="block text-sm font-medium text-slate-700">직책 *<input required name="leadTitle" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-500" placeholder="예: Backend" /></label>
                  <label className="block text-sm font-medium text-slate-700">성별 *<select required name="leadGender" defaultValue="" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-500"><option value="" disabled>선택하세요</option><option value="male">남성</option><option value="female">여성</option></select></label>
                </div>
              </div>
              <label className="block text-sm font-medium text-slate-700">상위 팀<select name="parentTeamId" defaultValue={planeUnits?.find((unit) => unit.parentId === null)?.id ?? ''} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-500">{planeUnits?.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setIsTeamDialogOpen(false)} className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted">취소</button><button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">팀 생성</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
