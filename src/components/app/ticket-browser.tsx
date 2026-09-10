import * as React from 'react';
import { TicketEmptyState } from './ticket-empty-state';
import { TicketFilters } from './ticket-filters';
import { TicketList } from './ticket-list';
import type { TeamRecord, TicketDetailRecord, TicketRecord } from './ticket-types';

interface TicketBrowserProps {
  tickets: TicketRecord[];
  teams: TeamRecord[];
  details: Record<string, TicketDetailRecord>;
}

export function TicketBrowser({ tickets, teams, details }: TicketBrowserProps) {
  const [liveTickets, setLiveTickets] = React.useState<TicketRecord[]>([]);
  const [liveTeams, setLiveTeams] = React.useState<TeamRecord[]>(teams);
  const [liveDetails, setLiveDetails] = React.useState<Record<string, TicketDetailRecord>>({});
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState<'teams' | 'kanban'>('teams');
  React.useEffect(() => {
    fetch('/api/tickets')
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload; })
      .then((payload) => { setLiveTickets(payload.tickets); if (payload.teams?.length) setLiveTeams(payload.teams); setLiveDetails(Object.fromEntries(payload.tickets.map((ticket: TicketRecord & { detail: TicketDetailRecord }) => [ticket.id, ticket.detail]))); })
      .catch((error) => setLoadError(error instanceof Error ? error.message : '티켓 조회에 실패했습니다.'))
      .finally(() => setLoading(false));
  }, []);
  const [draftQuery, setDraftQuery] = React.useState('');
  const filteredTickets = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return liveTickets.filter((ticket) => {
      const matchesQuery =
        !normalized ||
        [ticket.id, ticket.title, ticket.team, ticket.type]
          .join(' ')
          .toLowerCase()
          .includes(normalized);

      return matchesQuery;
    });
  }, [query, liveTickets]);

  return (
    <div className="space-y-6">
        <TicketFilters
          query={draftQuery}
          onQueryChange={setDraftQuery}
          onSearch={() => setQuery(draftQuery)}
          teams={liveTeams}
          view={view}
          onViewChange={setView}
          onCreated={() => {
            setLoading(true);
            fetch('/api/tickets').then((response) => response.json()).then((payload) => {
              setLiveTickets(payload.tickets);
              if (payload.teams?.length) setLiveTeams(payload.teams);
              setLiveDetails(Object.fromEntries(payload.tickets.map((ticket: TicketRecord & { detail: TicketDetailRecord }) => [ticket.id, ticket.detail])));
            }).finally(() => setLoading(false));
          }}
        />

        {loading ? <div className="grid min-h-[calc(100vh-12rem)] gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]" aria-label="티켓을 불러오는 중입니다." aria-busy="true">
          <div className="h-[calc(100vh-12rem)] min-h-0 rounded-xl border border-border bg-muted/60 p-3"><div className="mb-3 h-6 w-28 animate-pulse rounded bg-muted-foreground/15" /><div className="grid gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg border bg-background/70 p-3"><div className="h-4 w-16 rounded bg-muted-foreground/15" /><div className="mt-4 h-4 w-4/5 rounded bg-muted-foreground/15" /><div className="mt-2 h-3 w-2/5 rounded bg-muted-foreground/10" /></div>)}</div></div>
          <div className="h-[calc(100vh-12rem)] min-h-0 rounded-xl border border-border bg-muted/60 p-3"><div className="mb-3 h-6 w-24 animate-pulse rounded bg-muted-foreground/15" /><div className="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-48 animate-pulse rounded-xl border bg-background/70 p-3"><div className="h-7 rounded bg-muted-foreground/10" /><div className="mt-6 h-8 w-20 rounded bg-muted-foreground/10" /></div>)}</div></div>
        </div> : loadError ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">{loadError}</p> : filteredTickets.length ? <TicketList tickets={filteredTickets} teams={liveTeams} details={liveDetails} view={view} /> : <TicketEmptyState />}
    </div>
  );
}
