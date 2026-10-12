import { formatTimestamp } from '../../../lib/platform/time.mjs';
import * as React from 'react';
import { ExternalLink, MessageSquarePlus, Pencil, Send, ShieldCheck } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';
import type { TicketRecord, TicketStatus } from '../domain/tickets';

type TicketDetailProps = {
  ticketNumber: string | null;
  onClose: () => void;
  onEdit: (ticket: TicketRecord) => void;
  onChanged: (ticket: TicketRecord) => void;
  readOnly?: boolean;
};

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error ?? `요청 실패 (${response.status})`;
}

export function TicketDetail({ ticketNumber, onClose, onEdit, onChanged, readOnly = false }: TicketDetailProps) {
  const [ticket, setTicket] = React.useState<TicketRecord | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!ticketNumber) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/tickets/${encodeURIComponent(ticketNumber)}`);
      if (!response.ok) throw new Error(await errorMessage(response));
      setTicket((await response.json()).ticket);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '티켓 상세를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  React.useEffect(() => { if (ticketNumber) void load(); else setTicket(null); }, [ticketNumber, load]);

  async function transition(nextStatus: TicketStatus) {
    if (!ticket || readOnly) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/tickets/${encodeURIComponent(ticket.number)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
          typeId: ticket.typeId,
          teamId: ticket.teamId,
          assigneeId: ticket.assigneeId,
          status: nextStatus
        })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const updated = (await response.json()).ticket;
      setTicket(updated);
      onChanged(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '상태를 변경하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitComment(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || readOnly) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/tickets/${encodeURIComponent(ticket.number)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comment })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setComment('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '댓글을 등록하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={Boolean(ticketNumber)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        {loading && !ticket ? <p className="py-16 text-center text-sm text-slate-500">티켓을 불러오는 중입니다.</p> : ticket ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><DialogDescription className="font-bold text-blue-700">{ticket.number}</DialogDescription><DialogTitle className="mt-1 text-2xl">{ticket.title}</DialogTitle></div>
              <div className="flex gap-2">{!readOnly ? <Button variant="outline" size="sm" onClick={() => onEdit(ticket)}><Pencil size={14} className="mr-1" />편집</Button> : null}<Button asChild variant="outline" size="sm"><a href={`/teams/tickets/${ticket.number}`}><ExternalLink size={14} className="mr-1" />상세 페이지</a></Button></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><Badge variant={ticket.status === '완료' ? 'green' : ticket.status === '배정' ? 'amber' : 'blue'}>{ticket.status}</Badge><Badge variant="outline">{ticket.typeName}</Badge><Badge variant="outline">{ticket.teamName ?? '미배정'}</Badge><Badge variant="outline">{ticket.assigneeName ?? '담당자 없음'}</Badge></div>
            <p className="mt-6 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{ticket.description}</p>
            {!readOnly ? <div className="mt-5 flex gap-2">
              {ticket.status === '배정' ? <Button disabled={submitting} onClick={() => transition('완료')}><ShieldCheck size={15} className="mr-1" />완료 처리</Button> : null}
            </div> : null}
            {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section><h3 className="flex items-center gap-2 font-bold"><MessageSquarePlus size={17} />댓글</h3>{!readOnly ? <form className="mt-3" onSubmit={submitComment}><Textarea required maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="의견을 남기세요." /><Button className="mt-2" size="sm" disabled={submitting || !comment.trim()}><Send size={14} className="mr-1" />등록</Button></form> : null}<div className="mt-4 divide-y">{ticket.comments.length ? ticket.comments.map((item) => <article className="py-4 first:pt-0" key={item.id}><div className="flex justify-between gap-3 text-xs text-slate-500"><b>{item.author}</b><time>{formatTimestamp(item.createdAt)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.body}</p></article>) : <p className="py-6 text-sm text-slate-500">댓글이 없습니다.</p>}</div></section>
              <details><summary className="cursor-pointer font-bold">변경 이력 보기</summary><ol className="mt-3 space-y-3">{ticket.history.map((item) => <li className="rounded-xl border bg-slate-50 px-4 py-3" key={item.id}><p className="text-sm font-medium">{item.event}</p><time className="mt-1 block text-xs text-slate-500">{formatTimestamp(item.createdAt)}</time></li>)}</ol></details>
            </div>
          </>
        ) : <><DialogTitle>티켓을 불러오지 못했습니다.</DialogTitle>{error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}</>}
      </DialogContent>
    </Dialog>
  );
}
