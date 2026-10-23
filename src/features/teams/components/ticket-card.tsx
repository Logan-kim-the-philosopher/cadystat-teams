import { Bug, Lightbulb, UserRound, Users } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import type { TicketRecord } from '../domain/tickets';

type TicketCardProps = {
  ticket: TicketRecord;
  onOpen: (ticket: TicketRecord) => void;
  readOnly?: boolean;
};

function statusVariant(status: TicketRecord['status']) {
  if (status === '완료') return 'green' as const;
  if (status === '배정') return 'amber' as const;
  return 'blue' as const;
}

export function TicketCard({ ticket, onOpen, readOnly = false }: TicketCardProps) {
  return (
    <article
      className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      draggable={!readOnly}
      onDragStart={(event) => {
        if (readOnly) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('ticket-number', ticket.number);
      }}
    >
      <button type="button" className="block w-full text-left" onClick={() => onOpen(ticket)}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-500">{ticket.number}</span>
          <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
        </div>
        <h3 className="mt-3 line-clamp-2 font-bold leading-6 text-slate-900">{ticket.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{ticket.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            {ticket.typeName === '버그' ? <Bug size={13} /> : <Lightbulb size={13} />}
            {ticket.typeName}
          </span>
          <span className="inline-flex items-center gap-1"><Users size={13} />{ticket.teamName ?? '미배정'}</span>
          {ticket.assigneeName ? <span className="inline-flex items-center gap-1"><UserRound size={13} />{ticket.assigneeName}</span> : null}
        </div>
      </button>
    </article>
  );
}
