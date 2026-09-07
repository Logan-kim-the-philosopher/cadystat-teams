import * as React from 'react';
import { Card, CardContent } from '../ui/card';
import { TicketEmptyState } from './ticket-empty-state';
import { TicketFilters, type TicketStatus } from './ticket-filters';
import { TicketList } from './ticket-list';
import type { TicketRecord } from './ticket-types';

interface TicketBrowserProps {
  tickets: TicketRecord[];
}

export function TicketBrowser({ tickets }: TicketBrowserProps) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<TicketStatus>('전체');

  const filteredTickets = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = status === '전체' || ticket.status === status;
      const matchesQuery =
        !normalized ||
        [ticket.id, ticket.title, ticket.team, ticket.type, ticket.reporter, ticket.summary]
          .join(' ')
          .toLowerCase()
          .includes(normalized);

      return matchesStatus && matchesQuery;
    });
  }, [query, status, tickets]);

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-6 pt-6">
        <TicketFilters
          query={query}
          status={status}
          totalCount={tickets.length}
          resultCount={filteredTickets.length}
          onQueryChange={setQuery}
          onStatusChange={setStatus}
          onReset={() => {
            setQuery('');
            setStatus('전체');
          }}
        />

        {filteredTickets.length ? <TicketList tickets={filteredTickets} /> : <TicketEmptyState />}
      </CardContent>
    </Card>
  );
}
