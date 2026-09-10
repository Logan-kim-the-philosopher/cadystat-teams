import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Calendar } from '../ui/calendar';

function formatDate(value: string | null) {
  if (!value) return '다음 회의 일정 등록';
  return `다음 회의: ${new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))}`;
}

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NextMeetingBadge({ initialValue }: { initialValue: string | null }) {
  const [value, setValue] = React.useState(initialValue);
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState(toLocalInput(initialValue));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [timeOpen, setTimeOpen] = React.useState(false);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const timeRef = React.useRef<HTMLDivElement>(null);
  const selectedDate = input?.slice(0, 10) ? new Date(`${input.slice(0, 10)}T12:00:00`) : undefined;

  React.useEffect(() => {
    if (!calendarOpen && !timeOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (calendarRef.current && !calendarRef.current.contains(target)) setCalendarOpen(false);
      if (timeRef.current && !timeRef.current.contains(target)) setTimeOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [calendarOpen, timeOpen]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch('/api/meeting-schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starts_at: input }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '일정 저장에 실패했습니다.');
      setValue(body.starts_at); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : '일정 저장에 실패했습니다.'); } finally { setSaving(false); }
  };

  return <>
    <button type="button" onClick={() => { setInput(toLocalInput(value)); setOpen(true); }} className="w-fit rounded-full border border-white/20 px-3 py-1 text-sm text-slate-300 transition hover:border-white/40 hover:bg-white/10">{formatDate(value)}</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-visible">
        <DialogTitle>다음 회의 일정</DialogTitle>
        <DialogDescription>확정된 회의 날짜와 시간을 입력하세요.</DialogDescription>
        <form onSubmit={save} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div ref={calendarRef} className="relative space-y-2"><p className="text-sm font-medium">회의 날짜</p><button type="button" onClick={() => setCalendarOpen(open => !open)} className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent">{selectedDate ? selectedDate.toLocaleDateString('ko-KR') : '날짜를 선택하세요'}</button>{calendarOpen && <div className="absolute left-0 top-[4.75rem] z-10 rounded-md bg-background shadow-lg"><Calendar mode="single" selected={selectedDate} onSelect={date => { if (!date) return; const time = input?.slice(11, 16) || '14:00'; const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); setInput(`${year}-${month}-${day}T${time}`); setCalendarOpen(false); }} /></div>}</div>
            <div ref={timeRef} className="relative space-y-2"><p className={`text-sm font-medium ${!selectedDate ? 'text-muted-foreground' : ''}`}>회의 시간</p><button type="button" disabled={!selectedDate} onClick={() => setTimeOpen(open => !open)} className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">{selectedDate ? (input.slice(11, 16) || '시간을 선택하세요') : '날짜를 먼저 선택하세요'}</button>{timeOpen && <div className="absolute left-0 top-[4.75rem] z-10 max-h-56 w-full overflow-y-auto rounded-md border bg-background p-1 shadow-lg">{Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`).map(time => <button key={time} type="button" onClick={() => { setInput(`${input.slice(0, 10)}T${time}`); setTimeOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">{time}</button>)}</div>}</div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">취소</button><button type="submit" disabled={saving || !selectedDate || !input.slice(11, 16)} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
