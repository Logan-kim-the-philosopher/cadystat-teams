import type * as React from 'react';
import { Badge } from '../ui/badge';
import type { TeamRecord, TicketRecord } from './ticket-types';

interface TeamTicketCardProps {
  team: TeamRecord;
  tickets: TicketRecord[];
  isDragOver: boolean;
  onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onSelect: (ticket: TicketRecord) => void;
  onDragStart: (ticketId: string) => void;
}

export function TeamTicketCard({ team, tickets, isDragOver, onDragEnter, onDragOver, onDragLeave, onDrop, onSelect, onDragStart }: TeamTicketCardProps) {
  return <div className={`h-48 min-w-0 overflow-visible rounded-xl border-2 border-slate-200 bg-[#fcfcfd] p-3 shadow-sm transition ${isDragOver ? 'border-blue-500 bg-blue-100 shadow-lg ring-4 ring-blue-500' : ''}`} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
    <div className="-mx-3 -mt-3 mb-3 flex items-center justify-between rounded-t-[10px] border-b-2 border-slate-200 bg-slate-200/70 px-3 py-2"><h3 className="font-semibold tracking-tight">{team.name}</h3><span className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">{tickets.length}</span></div>
    <div className="flex flex-wrap gap-2">{tickets.map((ticket) => <a key={ticket.id} href={`/tickets/${ticket.id}`} onClick={(event) => { event.preventDefault(); onSelect(ticket); }} className="inline-flex min-w-0 max-w-full" draggable data-ticket-id={ticket.id} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('ticket-id', ticket.id); onDragStart(ticket.id); }} title={ticket.title}><Badge variant="outline" className="max-w-full truncate bg-white px-3 py-1.5 text-sm">{ticket.id}</Badge></a>)}{!tickets.length && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">티켓을 놓으세요</p>}</div>
  </div>;
}
