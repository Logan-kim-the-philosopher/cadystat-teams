import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TicketCreateModal } from './ticket-create-modal';

interface TicketFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  teams: { name: string; slug: string }[];
  onCreated: () => void;
  view: 'teams' | 'kanban';
  onViewChange: (view: 'teams' | 'kanban') => void;
}

export function TicketFilters({
  query,
  onQueryChange,
  onSearch,
  teams,
  onCreated,
  view,
  onViewChange
}: TicketFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <TicketCreateModal teams={teams} onCreated={onCreated} />
        <div className="flex items-center justify-center gap-5 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <button type="button" className={`border-b-2 px-1 pb-1 text-sm transition-colors ${view === 'teams' ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => onViewChange('teams')}>팀별 현황</button>
          <button type="button" className={`border-b-2 px-1 pb-1 text-sm transition-colors ${view === 'kanban' ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => onViewChange('kanban')}>칸반보드</button>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Input className="w-full sm:w-52" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="티켓 검색" />
          <Button onClick={onSearch}>검색</Button>
        </div>
      </div>

    </div>
  );
}
