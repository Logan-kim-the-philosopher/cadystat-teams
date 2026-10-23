import { formatTimestamp } from '../../../lib/platform/time.mjs';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import type { MeetingComment } from '../domain/meetings';
export function MeetingComments({ id, initialComments, readOnly = false }: { id: string; initialComments: MeetingComment[]; readOnly?: boolean }) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/teams/meetings?id=${id}&action=comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setComments(result.comments); setBody('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '댓글 저장 실패'); }
    finally { setSaving(false); }
  }
  async function remove(commentId: string) {
    if (readOnly || saving || !window.confirm('이 댓글을 삭제할까요?')) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/teams/meetings?id=${id}&action=comment&commentId=${commentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error);
      setComments((items) => items.filter((item) => item.id !== commentId));
    } catch (caught) { setError(caught instanceof Error ? caught.message : '댓글 삭제 실패'); }
    finally { setSaving(false); }
  }
  return <section className="mt-8 border-t pt-6"><h2 className="font-bold">댓글 {comments.length}개</h2>
    {error ? <p role="alert" className="mt-3 text-red-700">{error}</p> : null}
    {!readOnly ? <form onSubmit={submit} className="mt-4 space-y-3"><Textarea aria-label="회의록 댓글" required maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="회의에 대한 의견 남기기" /><Button disabled={saving}>{saving ? '처리 중' : '댓글 등록'}</Button></form> : null}
    <div className="mt-5 divide-y">{comments.map((comment) => <article id={`comment-${comment.id}`} key={comment.id} className="scroll-mt-28 py-4 target:rounded-lg target:bg-blue-50"><div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{comment.author} · {formatTimestamp(comment.createdAt)}</p>{!readOnly ? <button type="button" disabled={saving} onClick={() => void remove(comment.id)} className="text-xs text-red-600 hover:underline disabled:opacity-50" aria-label={`${comment.author} 댓글 삭제`}>삭제</button> : null}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{comment.body}</p></article>)}</div>
  </section>;
}
