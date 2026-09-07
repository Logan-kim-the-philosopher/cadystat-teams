import { TicketItem } from './ticket-item';
import type { TicketRecord } from './ticket-types';

interface TicketListProps {
  tickets: TicketRecord[];
}

export function TicketList({ tickets }: TicketListProps) {
  return (
    <div className="grid gap-3">
      {tickets.map((ticket) => (
        <TicketItem key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
