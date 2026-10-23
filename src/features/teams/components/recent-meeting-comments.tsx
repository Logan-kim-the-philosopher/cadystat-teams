import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecentMeetingComment } from '../domain/meetings';
import { formatTimestamp } from '../../../lib/platform/time.mjs';

export function RecentMeetingComments({ initialComments, initialError = false }: { initialComments: RecentMeetingComment[]; initialError?: boolean }) {
  const [comments, setComments] = useState(initialComments);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    setLoading(true);
    try {
      const response = await fetch('/api/teams/meetings?action=recent-comments', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('load_failed');
      const result = await response.json();
      if (!Array.isArray(result.comments)) throw new Error('invalid_response');
      if (!controller.signal.aborted) { setComments(result.comments); setError(false); }
    } catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('pageshow', update); window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { activeRequest.current?.abort(); window.removeEventListener('pageshow', update); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [refresh]);
  return <div className="h-full rounded-xl border border-white/15 bg-white/5 p-5 shadow-lg backdrop-blur-xl">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xs font-normal text-slate-400">최근 댓글</h2><button type="button" disabled={loading} onClick={() => void refresh()} className="text-xs text-slate-300 underline disabled:opacity-50">{loading ? '불러오는 중' : '새로고침'}</button></div>
    {error ? <p role="alert" className="mt-3 text-sm text-rose-200">댓글을 불러오지 못했습니다. 새로고침으로 다시 시도해 주세요.</p> : null}
    <div className="mt-3 max-h-64 min-h-40 divide-y divide-white/15 overflow-y-auto" aria-busy={loading}>
      {comments.map((comment) => <a key={comment.id} href={`/teams/meetings/${comment.meetingId}#comment-${comment.id}`} className="block rounded-sm py-3 first:pt-0 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><b className="text-slate-100">{comment.author}</b><time className="text-slate-400">{formatTimestamp(comment.createdAt)}</time></div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{comment.body}</p>
        <p className="mt-2 text-xs text-slate-400">{comment.meetingTitle} →</p>
      </a>)}
      {!comments.length && !error && !loading ? <p className="py-5 text-sm text-slate-400">아직 댓글이 없습니다.</p> : null}
    </div>
  </div>;
}
