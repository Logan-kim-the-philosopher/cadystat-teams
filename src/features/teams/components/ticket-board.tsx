import * as React from 'react';
import { ListFilter, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { TICKET_STATUSES, type TicketRecord, type TicketStatus, type TicketWorkspace } from '../domain/tickets';
import { TicketCard } from './ticket-card';
import { TicketDetail } from './ticket-detail';
import { TicketEditor } from './ticket-editor';

type TicketBoardProps = { initialWorkspace: TicketWorkspace; readOnly?: boolean };
type View = 'teams' | 'kanban';

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error ?? `요청 실패 (${response.status})`;
}

export function TicketBoard({ initialWorkspace, readOnly = false }: TicketBoardProps) {
  const [workspace, setWorkspace] = React.useState(initialWorkspace);
  const [view, setView] = React.useState<View>('teams');
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [teamFilter, setTeamFilter] = React.useState('');
  const [selectedNumber, setSelectedNumber] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorTicket, setEditorTicket] = React.useState<TicketRecord | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOverTeam, setDragOverTeam] = React.useState<string | null>(null);

  const visibleTickets = React.useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko');
    return workspace.tickets.filter((ticket) => {
      const searchText = [ticket.number, ticket.title, ticket.description, ticket.typeName, ticket.teamName ?? ''].join(' ').toLocaleLowerCase('ko');
      return (!normalized || searchText.includes(normalized)) && (!statusFilter || ticket.status === statusFilter) && (!teamFilter || ticket.teamId === teamFilter);
    });
  }, [query, statusFilter, teamFilter, workspace.tickets]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/teams/tickets');
      if (!response.ok) throw new Error(await errorMessage(response));
      setWorkspace(await response.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '티켓 목록을 새로 고치지 못했습니다.');
    } finally {
      setRefreshing(false);
    }
  }

  function upsertTicket(ticket: TicketRecord) {
    setWorkspace((current) => ({
      ...current,
      tickets: current.tickets.some((item) => item.number === ticket.number)
        ? current.tickets.map((item) => item.number === ticket.number ? ticket : item)
        : [ticket, ...current.tickets]
    }));
  }

  async function moveTicket(ticketNumber: string, next: { status: TicketStatus; teamId: string | null }) {
    if (readOnly) return;
    const ticket = workspace.tickets.find((item) => item.number === ticketNumber);
    if (!ticket) return;
    if (next.status === '완료' && ticket.status === '신규') {
      setError('신규 티켓은 담당 팀에 배정한 뒤 완료할 수 있습니다.');
      return;
    }
    if (next.status === '배정' && !next.teamId) {
      setError('배정 상태로 이동하려면 먼저 담당 팀을 지정하세요.');
      setEditorTicket(ticket);
      setEditorOpen(true);
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/teams/tickets/${encodeURIComponent(ticket.number)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
          typeId: ticket.typeId,
          status: next.status,
          teamId: next.status === '신규' ? null : next.teamId,
          assigneeId: next.status === '신규' || next.teamId !== ticket.teamId ? null : ticket.assigneeId
        })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      upsertTicket((await response.json()).ticket);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '티켓을 이동하지 못했습니다.');
    }
  }

  function droppedNumber(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    return event.dataTransfer.getData('ticket-number');
  }

  function dropOnStatus(status: TicketStatus, event: React.DragEvent<HTMLElement>) {
    const number = droppedNumber(event);
    if (readOnly) return;
    const ticket = workspace.tickets.find((item) => item.number === number);
    if (!ticket) return;
    void moveTicket(number, { status, teamId: status === '신규' ? null : ticket.teamId });
  }

  function dropOnTeam(teamId: string | null, event: React.DragEvent<HTMLElement>) {
    const number = droppedNumber(event);
    setDragOverTeam(null);
    if (readOnly) return;
    const ticket = workspace.tickets.find((item) => item.number === number);
    if (!ticket) return;
    void moveTicket(number, { status: teamId ? ticket.status === '신규' ? '배정' : ticket.status : '신규', teamId });
  }

  const dropProps = {
    onDragOver: (event: React.DragEvent<HTMLElement>) => event.preventDefault()
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {!readOnly ? <Button onClick={() => { setEditorTicket(null); setEditorOpen(true); }}><Plus size={16} className="mr-1" />새 티켓</Button> : null}
            <Button variant="outline" onClick={refresh} disabled={refreshing} aria-label="티켓 새로고침"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /></Button>
          </div>
          <div className="flex items-center justify-center gap-5 sm:absolute sm:left-1/2 sm:-translate-x-1/2" aria-label="티켓 보기 방식">
            <button type="button" aria-pressed={view === 'teams'} onClick={() => setView('teams')} className={`border-b-2 px-1 pb-1 text-sm transition-colors ${view === 'teams' ? 'border-slate-950 font-semibold text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>팀별 현황</button>
            <button type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={`border-b-2 px-1 pb-1 text-sm transition-colors ${view === 'kanban' ? 'border-slate-950 font-semibold text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>칸반보드</button>
          </div>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="티켓 검색" aria-label="티켓 검색" className="w-full sm:w-52" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="상태 필터"><option value="">전체 상태</option>{TICKET_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}</select>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="담당 팀 필터"><option value="">전체 담당 팀</option>{workspace.teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select>
          <span className="inline-flex items-center gap-2 px-2 text-sm text-slate-500"><ListFilter size={15} /><b className="text-slate-800">{visibleTickets.length}</b>건</span>
        </div>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {view === 'kanban' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {TICKET_STATUSES.map((status) => {
            const tickets = visibleTickets.filter((ticket) => ticket.status === status);
            return <section {...dropProps} onDrop={(event) => dropOnStatus(status, event)} className="min-h-[30rem] rounded-2xl border bg-slate-100/70 p-3" key={status}><header className="mb-3 flex items-center justify-between px-1"><h2 className="font-bold">{status}</h2><Badge variant="outline">{tickets.length}</Badge></header><div className="space-y-3">{tickets.map((ticket) => <TicketCard ticket={ticket} onOpen={(item) => setSelectedNumber(item.number)} readOnly={readOnly} key={ticket.id} />)}{tickets.length === 0 ? <p className="rounded-xl border border-dashed bg-white/50 p-6 text-center text-sm text-slate-500">{readOnly ? '표시할 티켓이 없습니다.' : '여기로 티켓을 옮기세요.'}</p> : null}</div></section>;
          })}
        </div>
      ) : (
        <div className="grid min-h-[32rem] gap-3 lg:h-[calc(100vh-17rem)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]">
          <section {...dropProps} onDragEnter={() => { if (!readOnly) setDragOverTeam('incoming'); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverTeam(null); }} onDrop={(event) => dropOnTeam(null, event)} className={`flex min-h-[20rem] min-w-0 flex-col overflow-hidden rounded-xl border-2 p-3 shadow-sm transition ${dragOverTeam === 'incoming' ? 'border-blue-500 bg-blue-100 ring-4 ring-blue-500/30' : 'border-slate-200 bg-slate-100/90'}`}><header className="mb-3 flex items-center justify-between"><h2 className="font-semibold tracking-tight">신규 티켓</h2><Badge variant="outline">{visibleTickets.filter((ticket) => !ticket.teamId).length}</Badge></header><div className="min-h-0 flex-1 space-y-3 overflow-y-auto">{visibleTickets.filter((ticket) => !ticket.teamId).map((ticket) => <TicketCard ticket={ticket} onOpen={(item) => setSelectedNumber(item.number)} readOnly={readOnly} key={ticket.id} />)}{visibleTickets.every((ticket) => ticket.teamId) ? <p className="rounded-lg border border-dashed bg-white p-4 text-center text-sm text-slate-500">신규 티켓 없음</p> : null}</div></section>
          <section className="flex min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100/90 p-3 shadow-sm"><header className="mb-3"><h2 className="font-semibold tracking-tight">팀 목록</h2></header><div className="grid min-h-0 flex-1 auto-rows-[12rem] grid-cols-1 gap-3 overflow-y-auto p-2 sm:grid-cols-2">
            {workspace.teams.map((team) => {
              const tickets = visibleTickets.filter((ticket) => ticket.teamId === team.id);
              return <div {...dropProps} onDragEnter={() => { if (!readOnly) setDragOverTeam(team.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverTeam(null); }} onDrop={(event) => dropOnTeam(team.id, event)} className={`min-w-0 rounded-xl border-2 bg-[#fcfcfd] p-3 shadow-sm transition ${dragOverTeam === team.id ? 'border-blue-500 bg-blue-100 ring-4 ring-blue-500/30' : 'border-slate-200'}`} key={team.id}>
                <div className="-mx-3 -mt-3 mb-3 flex items-center justify-between rounded-t-[10px] border-b-2 border-slate-200 bg-slate-200/70 px-3 py-2"><h3 className="truncate font-semibold tracking-tight">{team.name}</h3><span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{tickets.length}</span></div>
                <div className="flex max-h-[7rem] flex-wrap content-start gap-2 overflow-y-auto">{tickets.map((ticket) => <button type="button" key={ticket.id} onClick={() => setSelectedNumber(ticket.number)} draggable={!readOnly} onDragStart={(event) => { if (readOnly) return; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('ticket-number', ticket.number); }} title={ticket.title} className="max-w-full truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-600">{ticket.number}</button>)}{tickets.length === 0 ? <p className="rounded-lg border border-dashed bg-white p-4 text-center text-sm text-slate-500">{readOnly ? '티켓 없음' : '티켓을 놓으세요'}</p> : null}</div>
              </div>;
            })}
          </div></section>
        </div>
      )}

      <TicketDetail ticketNumber={selectedNumber} onClose={() => setSelectedNumber(null)} onEdit={(ticket) => { setSelectedNumber(null); setEditorTicket(ticket); setEditorOpen(true); }} onChanged={upsertTicket} readOnly={readOnly} />
      {!readOnly ? <TicketEditor
        open={editorOpen}
        ticket={editorTicket}
        teams={workspace.teams}
        types={workspace.types}
        onClose={() => setEditorOpen(false)}
        onSaved={(ticket) => { upsertTicket(ticket); setEditorOpen(false); setSelectedNumber(ticket.number); void refresh(); }}
        onDeleted={(ticketNumber) => { setWorkspace((current) => ({ ...current, tickets: current.tickets.filter((ticket) => ticket.number !== ticketNumber) })); setEditorOpen(false); setSelectedNumber(null); }}
      /> : null}
    </div>
  );
}
