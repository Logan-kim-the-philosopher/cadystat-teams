import type { APIRoute } from 'astro';
import { MeetingInputError, meetingId, meetingInput, meetingText } from '../../../../features/teams/domain/meetings';
import { addMeetingComment, deleteMeetingComment, recentMeetingComments, deleteMeeting, getMeeting, listMeetings, MeetingRepositoryError, saveMeeting } from '../../../../features/teams/server/meeting-repository';
export const prerender = false;
async function body(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new MeetingInputError('JSON 요청만 지원합니다.');
  try { return await request.json(); } catch { throw new MeetingInputError('JSON 본문이 올바르지 않습니다.'); }
}
function failure(error: unknown) {
  if (error instanceof MeetingInputError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof MeetingRepositoryError) return Response.json({ error: error.message }, { status: error.message.includes('찾을 수 없습니다') ? 404 : 503 });
  console.error('[teams/meetings]', error);
  return Response.json({ error: '회의 요청을 처리하지 못했습니다.' }, { status: 503 });
}
export const GET: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (url.searchParams.get('action') === 'recent-comments') return Response.json({ comments: await recentMeetingComments() });
    if (!id) return Response.json(await listMeetings());
    const note = await getMeeting(meetingId(id));
    return note ? Response.json({ note }) : Response.json({ error: '회의록을 찾을 수 없습니다.' }, { status: 404 });
  } catch (error) { return failure(error); }
};
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const input = await body(request);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new MeetingInputError('JSON 객체가 필요합니다.');
    const id = url.searchParams.get('id');
    if (url.searchParams.get('action') === 'comment') {
      if (!id) throw new MeetingInputError('회의록 ID가 필요합니다.');
      return Response.json({ comments: await addMeetingComment(meetingId(id), meetingText(input.body, '댓글', 2000), input.author ? meetingText(input.author, '작성자', 80) : undefined) }, { status: 201 });
    }
    return Response.json({ note: await saveMeeting(meetingInput(input), id ? meetingId(id) : undefined) }, { status: id ? 200 : 201 });
  } catch (error) { return failure(error); }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = meetingId(url.searchParams.get('id'));
    const action = url.searchParams.get('action');
    if (action === 'comment') await deleteMeetingComment(id, meetingId(url.searchParams.get('commentId')));
    else if (action) throw new MeetingInputError('지원하지 않는 삭제 작업입니다.');
    else await deleteMeeting(id);
    return new Response(null, { status: 204 });
  } catch (error) { return failure(error); }
};
