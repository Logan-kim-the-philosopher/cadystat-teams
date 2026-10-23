import * as React from 'react';
import { Save, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import type { TicketRecord, TicketStatus, TicketTeamOption, TicketTypeOption } from '../domain/tickets';

type TicketEditorProps = {
  open: boolean;
  ticket?: TicketRecord | null;
  teams: TicketTeamOption[];
  types: TicketTypeOption[];
  onClose: () => void;
  onSaved: (ticket: TicketRecord, created: boolean) => void;
  onDeleted: (ticketNumber: string) => void;
};

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error ?? `요청 실패 (${response.status})`;
}

export function TicketEditor({ open, ticket, teams, types, onClose, onSaved, onDeleted }: TicketEditorProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [typeId, setTypeId] = React.useState('');
  const [teamId, setTeamId] = React.useState('');
  const [assigneeId, setAssigneeId] = React.useState('');
  const [status, setStatus] = React.useState<TicketStatus>('신규');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const selectedTeam = teams.find((team) => team.id === teamId);

  React.useEffect(() => {
    if (!open) return;
    setTitle(ticket?.title ?? '');
    setDescription(ticket?.description ?? '');
    setTypeId(ticket?.typeId ?? types[0]?.id ?? '');
    setTeamId(ticket?.teamId ?? '');
    setAssigneeId(ticket?.assigneeId ?? '');
    setStatus(ticket?.status ?? '신규');
    setError(null);
  }, [open, ticket, types]);

  function changeTeam(nextTeamId: string) {
    setTeamId(nextTeamId);
    setAssigneeId('');
    if (!nextTeamId) setStatus('신규');
    else if (status === '신규') setStatus('배정');
  }

  function changeStatus(nextStatus: TicketStatus) {
    setStatus(nextStatus);
    if (nextStatus === '신규') {
      setTeamId('');
      setAssigneeId('');
    }
  }

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const endpoint = ticket ? `/api/teams/tickets/${encodeURIComponent(ticket.number)}` : '/api/teams/tickets';
      const response = await fetch(endpoint, {
        method: ticket ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, typeId, teamId: teamId || null, assigneeId: assigneeId || null, ...(ticket ? { status } : {}) })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      onSaved((await response.json()).ticket, !ticket);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '티켓을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!ticket || !window.confirm(`${ticket.number} 티켓을 삭제할까요?`)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/tickets/${encodeURIComponent(ticket.number)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      onDeleted(ticket.number);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '티켓을 삭제하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>{ticket ? `${ticket.number} 편집` : '새 티켓 접수'}</DialogTitle>
        <DialogDescription>{ticket ? '필드와 담당 관계를 한 트랜잭션으로 저장합니다.' : '담당 팀을 선택하면 배정 상태로 바로 접수됩니다.'}</DialogDescription>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-semibold">제목<Input className="mt-2" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="block text-sm font-semibold">설명<Textarea className="mt-2 min-h-32" required maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">유형<select required value={typeId} onChange={(event) => setTypeId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-white px-3 font-normal">{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
            {ticket ? <label className="text-sm font-semibold">상태<select value={status} onChange={(event) => changeStatus(event.target.value as TicketStatus)} className="mt-2 h-10 w-full rounded-lg border bg-white px-3 font-normal"><option value="신규">신규</option><option value="배정">배정</option><option value="완료">완료</option></select></label> : null}
            <label className="text-sm font-semibold">담당 팀<select value={teamId} onChange={(event) => changeTeam(event.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-white px-3 font-normal"><option value="">미배정</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>
            <label className="text-sm font-semibold">담당자<select disabled={!teamId} value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-white px-3 font-normal disabled:bg-slate-100"><option value="">미지정</option>{selectedTeam?.members.map((member) => <option value={member.id} key={member.id}>{member.name} · {member.title}</option>)}</select></label>
          </div>
          {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            {ticket ? <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={saving} onClick={remove}><Trash2 size={15} className="mr-1" />삭제</Button> : <span />}
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={onClose}>취소</Button><Button disabled={saving}><Save size={15} className="mr-1" />{saving ? '저장 중' : ticket ? '변경 저장' : '티켓 접수'}</Button></div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
