import * as React from 'react';
import { User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { TicketItem } from './ticket-item';
import { TeamTicketCard } from './team-ticket-card';
import type { TeamRecord, TicketDetailRecord, TicketRecord } from './ticket-types';

const statusVariant = (status: string) => {
  if (status === '완료') return 'green' as const;
  if (status === '배정') return 'amber' as const;
  return 'blue' as const;
};

const ticketTypeVariant = (type: string) => type === '버그' ? 'red' as const : 'blue' as const;

interface TicketListProps {
  tickets: TicketRecord[];
  teams: TeamRecord[];
  details: Record<string, TicketDetailRecord>;
  view: 'teams' | 'kanban';
}

export function TicketList({ tickets, teams, details, view }: TicketListProps) {
  const [displayTickets, setDisplayTickets] = React.useState(tickets);
  const [draggingTicketId, setDraggingTicketId] = React.useState<string | null>(null);
  const [dragOverIncoming, setDragOverIncoming] = React.useState(false);
  const [dragOverColumn, setDragOverColumn] = React.useState<string | null>(null);
  const [assignments, setAssignments] = React.useState<Record<string, string>>(
    () => Object.fromEntries(tickets.filter((ticket) => ticket.status !== '신규').map((ticket) => [ticket.id, ticket.teamSlug]))
  );
  const [dragOverTeam, setDragOverTeam] = React.useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = React.useState<TicketRecord | null>(null);
  const [localDetails, setLocalDetails] = React.useState(details);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  React.useEffect(() => {
    setDisplayTickets(tickets);
    setLocalDetails(details);
    setAssignments(Object.fromEntries(tickets.filter((ticket) => ticket.status !== '신규' && ticket.teamSlug).map((ticket) => [ticket.id, ticket.teamSlug])));
  }, [tickets]);
  const incomingTickets = displayTickets.filter((ticket) => ticket.status === '신규' && !assignments[ticket.id]);

  async function returnToIncoming(event: React.DragEvent<HTMLDivElement>) {
    const ticketId = event.dataTransfer.getData('ticket-id') || draggingTicketId;
    if (!ticketId) return;
    setDragOverIncoming(false);
    setAssignments((current) => { const next = { ...current }; delete next[ticketId]; return next; });
    setDraggingTicketId(null);
    const response = await fetch(`/api/tickets?id=${encodeURIComponent(ticketId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: null, status: '신규' }) });
    if (!response.ok) window.location.reload();
    else setDisplayTickets((current) => current.map((ticket) => ticket.id === ticketId ? { ...ticket, teamSlug: '', status: '신규' } : ticket));
  }

  async function assignTicket(teamSlug: string, event: React.DragEvent<HTMLDivElement>) {
    const ticketId = event.dataTransfer.getData('ticket-id') || draggingTicketId;
    if (!ticketId) return;
    const previous = assignments[ticketId];
    setAssignments((current) => ({ ...current, [ticketId]: teamSlug }));
    setDragOverTeam(null);
    setDraggingTicketId(null);
    const response = await fetch(`/api/tickets?id=${encodeURIComponent(ticketId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamSlug, status: '배정' }) });
    if (!response.ok) {
      setAssignments((current) => ({ ...current, [ticketId]: previous }));
    } else {
      const assignedTeam = teams.find((team) => team.slug === teamSlug);
      setDisplayTickets((current) => current.map((ticket) => ticket.id === ticketId ? { ...ticket, team: assignedTeam?.name ?? ticket.team, teamSlug, status: '배정' } : ticket));
    }
  }

  const kanbanColumns = ['신규', '배정', '완료'];
  async function moveToStatus(status: string, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const ticketId = event.dataTransfer.getData('ticket-id') || draggingTicketId;
    setDragOverColumn(null);
    if (!ticketId) return;
    const ticket = displayTickets.find((item) => item.id === ticketId);
    if (status === '배정' && !ticket?.teamSlug) {
      window.alert('담당 팀이 지정된 티켓만 배정 상태로 이동할 수 있습니다.');
      return;
    }
    const clearAssignment = status === '신규';
    const response = await fetch(`/api/tickets?id=${encodeURIComponent(ticketId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clearAssignment ? { status, team_id: null } : { status }) });
    if (response.ok) {
      setDisplayTickets((current) => current.map((ticket) => ticket.id === ticketId ? { ...ticket, status, ...(clearAssignment ? { team: '', teamSlug: '' } : {}) } : ticket));
      if (clearAssignment) setAssignments((current) => { const next = { ...current }; delete next[ticketId]; return next; });
    }
  }

  return (
    <>
    {view === 'kanban' && <div className="grid h-[calc(100vh-12rem)] min-h-0 gap-3 lg:grid-cols-3">{kanbanColumns.map((status) => <section key={status} onDragEnter={(event) => { event.preventDefault(); setDragOverColumn(status); }} onDragOver={(event) => { event.preventDefault(); setDragOverColumn(status); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverColumn(null); }} onDrop={(event) => moveToStatus(status, event)} className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-2 p-3 transition ${dragOverColumn === status ? 'border-blue-500 bg-blue-100 shadow-lg ring-4 ring-blue-500/30' : 'border-border bg-muted/90'}`}><h3 className="mb-3 shrink-0 font-semibold">{status}</h3><div className="min-h-0 flex-1 overflow-y-auto"><div className="grid gap-3">{displayTickets.filter((ticket) => ticket.status === status).map((ticket) => <TicketItem key={ticket.id} ticket={ticket} teams={teams} description={details[ticket.id]?.description} draggable onSelect={setSelectedTicket} />)}{!displayTickets.some((ticket) => ticket.status === status) && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">티켓을 여기로 이동</p>}</div></div></section>)}</div>}
    {view === 'teams' && (
    <>
    <div
      className="grid min-h-[calc(100vh-12rem)] gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]"
      onDragStartCapture={(event) => {
        const element = (event.target as HTMLElement).closest('[data-ticket-id]');
        if (element) setDraggingTicketId(element.getAttribute('data-ticket-id'));
      }}
    >
      <section
        className={`flex h-[calc(100vh-12rem)] min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border-2 p-3 shadow-sm transition ${dragOverIncoming ? 'border-blue-500 bg-blue-100 shadow-lg ring-4 ring-blue-500/30' : 'border-border bg-muted/90'}`}
        onDragEnter={(event) => { event.preventDefault(); setDragOverIncoming(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragOverIncoming(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverIncoming(false); }}
        onDrop={returnToIncoming}
      >
        <div className="mb-3">
          <h3 className="font-semibold tracking-tight">신규 티켓</h3>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-3">
          {incomingTickets.map((ticket) => <TicketItem key={ticket.id} ticket={ticket} teams={teams} description={details[ticket.id]?.description} draggable onSelect={setSelectedTicket} />)}
          {!incomingTickets.length && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">신규 티켓 없음</p>}
        </div>
        </div>
      </section>

      <section className="h-[calc(100vh-12rem)] min-h-0 min-w-0 flex flex-col overflow-hidden rounded-xl border border-border bg-muted/90 p-3 shadow-sm">
        <div className="mb-3">
          <h3 className="font-semibold tracking-tight">팀 목록</h3>
        </div>
        <div className="min-h-0 flex-1 grid grid-cols-1 gap-3 overflow-y-auto p-2 sm:grid-cols-2">
        {teams.map((team) => <TeamTicketCard
          key={team.slug}
          team={team}
          tickets={displayTickets.filter((ticket) => assignments[ticket.id] === team.slug && ticket.status !== '완료')}
          isDragOver={dragOverTeam === team.slug}
          onDragEnter={(event) => { event.preventDefault(); setDragOverTeam(team.slug); }}
          onDragOver={(event) => { event.preventDefault(); setDragOverTeam(team.slug); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverTeam(null); }}
          onDrop={(event) => assignTicket(team.slug, event)}
          onSelect={setSelectedTicket}
          onDragStart={(ticketId) => setDraggingTicketId(ticketId)}
        />)}
        </div>
      </section>
    </div>
    </>)}
    <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
      {selectedTicket && <DialogContent className="p-0 rounded-xl">
          <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/30 px-6 py-5">
            <div>
              <DialogDescription className="text-sm font-semibold text-muted-foreground">{selectedTicket.id}</DialogDescription>
              <DialogTitle className="mt-1 text-2xl font-bold tracking-tight">{selectedTicket.title}</DialogTitle>
            </div>
            <button type="button" className="-mt-2 rounded-lg px-3 py-2 text-xl text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setSelectedTicket(null)} aria-label="닫기">×</button>
          </div>
          <div className="max-h-[calc(85vh-9rem)] overflow-y-auto overscroll-contain px-6 py-5">
          {(() => {
            const detail = localDetails[selectedTicket.id];
            const assignedTeam = teams.find((team) => assignments[selectedTicket.id] === team.slug)?.name ?? '미배정';
            return (
              <>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-border pb-4">
                  <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">상태</span><Badge variant={statusVariant(selectedTicket.status)}>{selectedTicket.status}</Badge></div>
                  <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">담당 팀</span><Badge variant="outline">{assignedTeam}</Badge></div>
                  <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">티켓 유형</span><Badge variant={ticketTypeVariant(selectedTicket.type)}>{selectedTicket.type || '미지정'}</Badge></div>
                </div>
                <section className="mt-6 min-h-56"><p className="whitespace-pre-wrap leading-7 text-foreground">{detail?.description ?? '설명이 없습니다.'}</p></section>
                {selectedTicket.status === '배정' && <Button type="button" className="mt-6 h-11 w-full" onClick={async () => { const response = await fetch(`/api/tickets?id=${encodeURIComponent(selectedTicket.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: '완료' }) }); if (response.ok) { setDisplayTickets((current) => current.map((ticket) => ticket.id === selectedTicket.id ? { ...ticket, status: '완료' } : ticket)); setSelectedTicket((current) => current ? { ...current, status: '완료' } : current); } }}>완료 처리</Button>}
                <div className="mt-6 border-b border-border" />
                <section className="mt-6 rounded-lg border border-border bg-muted/20 p-4"><h3 className="font-semibold">댓글</h3><div className="relative mt-4"><Textarea className="h-10 min-h-0 resize-none overflow-hidden py-1 pr-16 focus-visible:border-input focus-visible:ring-0" value={commentDraft} onChange={(event) => { setCommentDraft(event.target.value); event.currentTarget.style.height = '40px'; if (event.currentTarget.scrollHeight > 40) event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`; }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && commentDraft.trim()) { event.preventDefault(); (event.currentTarget.parentElement?.querySelector('button') as HTMLButtonElement | null)?.click(); } }} placeholder="댓글을 입력하세요" /><Button className="absolute bottom-1 right-1 h-8" type="button" disabled={!commentDraft.trim() || commentSubmitting} onClick={async () => { if (commentSubmitting) return; setCommentSubmitting(true); const response = await fetch('/api/ticket-comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: selectedTicket.id, body: commentDraft }) }); if (response.ok) { setLocalDetails((current) => ({ ...current, [selectedTicket.id]: { ...current[selectedTicket.id], comments: [{ body: commentDraft.trim(), createdAt: new Date().toISOString() }, ...(current[selectedTicket.id]?.comments ?? [])] } })); setCommentDraft(''); } setCommentSubmitting(false); }}>등록</Button></div><div className="mt-5 ml-4 pb-8 divide-y divide-border/50">{detail?.comments.length ? detail.comments.map((item) => { const comment = typeof item === 'string' ? { author: '운영자', body: item, createdAt: '' } : item; return <div className="py-4 first:pt-0 last:pb-0"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-1.5"><User className="h-4 w-4 shrink-0 text-muted-foreground" /><p className="text-xs text-muted-foreground">{comment.author ?? '운영자'}</p></div><p className="text-xs text-muted-foreground">{comment.createdAt ? new Date(comment.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '시간 없음'}</p></div><p className="mt-1 text-sm leading-6 text-foreground">{comment.body}</p></div>; }) : <p className="text-sm text-muted-foreground">댓글 없음</p>}</div></section>
              </>
            );
          })()}
          </div>
      </DialogContent>}
    </Dialog>
    </>
  );
}
