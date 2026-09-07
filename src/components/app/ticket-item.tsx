import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { TicketRecord } from './ticket-types';

function priorityVariant(priority: string) {
  if (priority === '긴급') return 'red';
  if (priority === '높음') return 'amber';
  return 'muted';
}

interface TicketItemProps {
  ticket: TicketRecord;
}

export function TicketItem({ ticket }: TicketItemProps) {
  return (
    <a href={`/tickets/${ticket.id}`} className={cn('group block rounded-lg border p-4 transition hover:bg-muted/50')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold tracking-tight">{ticket.id}</h3>
            <Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge>
            <Badge variant="outline">{ticket.type}</Badge>
            <Badge variant="blue">{ticket.status}</Badge>
          </div>
          <p className="text-sm leading-6 text-foreground">{ticket.title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{ticket.summary}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{ticket.team}</p>
          <p>{ticket.reporter}</p>
          <p>{ticket.createdAt}</p>
        </div>
      </div>
    </a>
  );
}
