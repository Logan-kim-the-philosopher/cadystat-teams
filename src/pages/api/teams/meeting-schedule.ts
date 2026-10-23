import type { APIRoute } from 'astro';
import { MeetingInputError, meetingScheduleInput } from '../../../features/teams/domain/meetings';
import { getNextMeetingSchedule, MeetingRepositoryError, saveNextMeetingSchedule } from '../../../features/teams/server/meeting-repository';

export const prerender = false;

function failure(error: unknown) {
  if (error instanceof MeetingInputError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof MeetingRepositoryError) return Response.json({ error: error.message }, { status: error.message.includes('찾을 수 없습니다') ? 404 : 503 });
  console.error('[teams/meeting-schedule]', error);
  return Response.json({ error: '일정 요청을 처리하지 못했습니다.' }, { status: 503 });
}

export const GET: APIRoute = async () => {
  try {
    return Response.json({ starts_at: await getNextMeetingSchedule() });
  } catch (error) {
    return failure(error);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) throw new MeetingInputError('JSON 요청만 지원합니다.');
    let body: unknown;
    try { body = await request.json(); } catch { throw new MeetingInputError('JSON 본문이 올바르지 않습니다.'); }
    const startsAt = meetingScheduleInput(body);
    return Response.json({ starts_at: await saveNextMeetingSchedule(startsAt) });
  } catch (error) {
    return failure(error);
  }
};
