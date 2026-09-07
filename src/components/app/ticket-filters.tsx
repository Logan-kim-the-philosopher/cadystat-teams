import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

export const ticketStatusTabs = [
  { value: '전체', label: '전체' },
  { value: '담당 배정', label: '담당 배정' },
  { value: '진행 중', label: '진행 중' },
  { value: '보류', label: '보류' }
] as const;

export type TicketStatus = (typeof ticketStatusTabs)[number]['value'];

interface TicketFiltersProps {
  query: string;
  status: TicketStatus;
  totalCount: number;
  resultCount: number;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: TicketStatus) => void;
  onReset: () => void;
}

export function TicketFilters({
  query,
  status,
  totalCount,
  resultCount,
  onQueryChange,
  onStatusChange,
  onReset
}: TicketFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">접수 큐 탐색기</h3>
          <p className="text-sm text-muted-foreground">검색하고, 상태를 바꾸고, 바로 인수할 수 있습니다.</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {resultCount} / {totalCount}개
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="티켓 ID, 제목, 팀, 제보자 검색" />
        <Button variant="outline" onClick={onReset}>
          초기화
        </Button>
      </div>

      <Tabs value={status} onValueChange={(value) => onStatusChange(value as TicketStatus)}>
        <TabsList className="grid w-full grid-cols-4">
          {ticketStatusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
