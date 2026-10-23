import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog';
import { meetingTicketDrafts, type MeetingNote, type MeetingStatus, type MeetingTicketDraft, type MeetingWorkspace } from '../domain/meetings';
import { MeetingEditorialThumbnail } from './meeting-editorial-thumbnail';

export const meetingStatusLabel = { draft: '초안', published: '공유', archived: '보관' };
export function MeetingBrowser({ workspace, editing, readOnly = false }: { workspace: MeetingWorkspace; editing?: MeetingNote; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState(editing?.content ?? '');
  const [status, setStatus] = useState<MeetingStatus>(editing?.status ?? 'published');
  const [newTickets, setNewTickets] = useState<MeetingTicketDraft[]>([]);
  const [ticketJson, setTicketJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const changeTicket = (index: number, patch: Partial<MeetingTicketDraft>) => setNewTickets((drafts) => drafts.map((draft, i) => i === index ? { ...draft, ...patch } : draft));
  function importDrafts() {
    try {
      const drafts = meetingTicketDrafts(JSON.parse(ticketJson));
      if (newTickets.length + drafts.length > 20) throw new Error('새 티켓은 20개까지 추가할 수 있습니다.');
      setNewTickets((previous) => [...previous, ...drafts]); setTicketJson(''); setError('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '티켓 초안을 확인해 주세요.'); }
  }
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/teams/meetings${editing ? `?id=${editing.id}` : ''}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, content, status, ticketIds: editing?.tickets.map((ticket) => ticket.id) ?? [], newTickets: meetingTicketDrafts(newTickets) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(`/teams/meetings/${result.note.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '저장 실패'); }
    finally { setSaving(false); }
  }
  const visibleNotes = workspace.notes.filter((note) => note.title.includes(query));
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {!editing ? <Input aria-label="회의록 검색" placeholder="회의 제목 검색" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:w-64" /> : null}
      {!readOnly ? <Button onClick={() => setOpen(true)}>{editing ? '회의록 편집' : '새 회의록'}</Button> : null}
    </div>
    {!editing ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{visibleNotes.map((note, index) => <a key={note.id} href={`/teams/meetings/${note.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-blue-600"><MeetingEditorialThumbnail title={note.title} date={note.date} index={index} short /><div className="p-5"><h3 className="line-clamp-2 text-lg font-semibold leading-7 transition-colors group-hover:text-primary">{note.title}</h3><div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>댓글 {note.comments.length}</span><span>{note.date}</span></div><p className="mt-2 text-xs text-muted-foreground">연결 티켓 {note.tickets.length} · {meetingStatusLabel[note.status]}</p></div></a>)}{visibleNotes.length === 0 ? <p className="col-span-full rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">조건에 맞는 회의록이 없습니다.</p> : null}</div> : null}
    <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}><DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto"><DialogTitle>{editing ? '회의록 편집' : '새 회의록'}</DialogTitle><DialogDescription>회의 내용과 실행할 일을 작성하세요. 새 티켓은 회의록을 저장할 때 함께 생성됩니다.</DialogDescription>
      <form onSubmit={save} className="mt-5 space-y-4"><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-semibold">제목<Input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className="flex gap-4"><label className="text-sm font-semibold">날짜<Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="text-sm font-semibold">상태<select className="block h-10 rounded-lg border bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus)}>{Object.entries(meetingStatusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
        <label className="block text-sm font-semibold">Markdown 본문<Textarea className="min-h-48 font-mono" maxLength={50000} value={content} onChange={(e) => setContent(e.target.value)} /></label>
        {editing?.tickets.length ? <div className="rounded-xl border p-3 text-sm"><p className="font-semibold">이미 연결된 티켓</p>{editing.tickets.map((ticket) => <a className="mt-2 block underline" key={ticket.id} href={`/teams/tickets/${ticket.number}`} target="_blank" rel="noreferrer">{ticket.number} · {ticket.title}</a>)}</div> : null}
        <fieldset className="space-y-3"><legend className="font-semibold">새 티켓 {newTickets.length}개</legend><p className="text-sm text-slate-500">저장 전에 제목과 설명을 확인하고 수정할 수 있습니다.</p>
          {newTickets.map((ticket, index) => <div key={index} className="space-y-2 rounded-xl border bg-slate-50 p-3">
            <div className="flex items-center justify-between"><b className="text-sm">티켓 {index + 1}</b><Button type="button" size="sm" variant="ghost" onClick={() => setNewTickets((drafts) => drafts.filter((_, i) => i !== index))}>초안 제거</Button></div>
            <Input aria-label={`티켓 ${index + 1} 제목`} required maxLength={160} placeholder="해야 할 일" value={ticket.title} onChange={(e) => changeTicket(index, { title: e.target.value })} />
            <Textarea aria-label={`티켓 ${index + 1} 설명`} required maxLength={5000} placeholder="상세 내용과 완료 조건" value={ticket.description} onChange={(e) => changeTicket(index, { description: e.target.value })} />
            <label className="block text-sm">유형<select className="ml-2 rounded-md border bg-white p-2" value={ticket.type} onChange={(e) => changeTicket(index, { type: e.target.value as MeetingTicketDraft['type'] })}><option>기능 요청</option><option>버그</option></select></label>
          </div>)}
          <Button type="button" variant="outline" disabled={newTickets.length >= 20} onClick={() => setNewTickets((drafts) => [...drafts, { title: '', description: '', type: '기능 요청' }])}>새 티켓 추가</Button>
          <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer">에이전트가 작성한 티켓 초안 가져오기</summary><p className="my-2 text-slate-500">title, description, type을 담은 JSON 배열을 붙여 넣으면 위에서 검토할 수 있습니다.</p><Textarea aria-label="티켓 초안 JSON" value={ticketJson} onChange={(e) => setTicketJson(e.target.value)} placeholder={'[{"title":"할 일","description":"완료 조건","type":"기능 요청"}]'} /><Button type="button" className="mt-2" variant="outline" onClick={importDrafts}>초안 불러오기</Button></details>
        </fieldset>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button><Button type="submit">{saving ? '저장 중' : newTickets.length ? `회의록과 티켓 ${newTickets.length}개 저장` : '저장'}</Button></div>
      </fieldset></form>
    </DialogContent></Dialog>
  </>;
}
