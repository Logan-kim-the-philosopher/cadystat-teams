import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { TeamRecord } from './ticket-types';

interface TicketCreateModalProps { teams: TeamRecord[]; onCreated: () => void; }

export function TicketCreateModal({ teams, onCreated }: TicketCreateModalProps) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState('버그');
  const [team, setTeam] = React.useState('모르겠음');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const reset = () => { setTitle(''); setDescription(''); setType('버그'); setTeam('모르겠음'); setError(''); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, type, team_name: team, status: '신규' }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || '티켓 생성에 실패했습니다.'); }
      setOpen(false); reset(); onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : '티켓 생성에 실패했습니다.'); } finally { setSubmitting(false); }
  };

  return <>
    <Button className="w-28 gap-1.5 animate-pulse-ring" onClick={() => setOpen(true)}><Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />새 티켓</Button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="ticket-create-title">
        <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Inbox</p><h2 id="ticket-create-title" className="mt-1 text-2xl font-bold">새 티켓 접수</h2><p className="mt-1 text-sm text-muted-foreground">문제를 간단히 설명해 주시면 담당 팀이 확인합니다.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 text-2xl text-muted-foreground hover:bg-muted" aria-label="닫기">×</button></div>
        <div className="space-y-4">
          <label className="block text-sm font-medium">제목 <Input required autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="어떤 문제가 있나요?" className="mt-1.5" /></label>
          <label className="block text-sm font-medium">상세 설명 <Textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="재현 방법, 기대한 결과 등을 적어주세요." className="mt-1.5 min-h-28" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">유형<select value={type} onChange={e => setType(e.target.value)} className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option>버그</option><option>기능 요청</option></select></label>
            <label className="block text-sm font-medium">담당 팀<select value={team} onChange={e => setTeam(e.target.value)} className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="모르겠음">모르겠음</option>{teams.map(t => <option key={t.slug} value={t.name}>{t.name}</option>)}</select></label>
          </div>
        </div>
        {error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button><Button type="submit" disabled={submitting}>{submitting ? '접수 중…' : '티켓 접수'}</Button></div>
      </form>
    </div>}
  </>;
}
