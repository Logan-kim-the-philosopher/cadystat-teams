import { TicketInputError } from '../domain/tickets';
import { ServerConfigurationError } from '../../../lib/server/env';
import { TicketRepositoryError } from './ticket-repository';

export async function readTicketJson(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new TicketInputError('JSON 요청만 지원합니다.');
  try {
    return await request.json();
  } catch {
    throw new TicketInputError('JSON 본문을 읽을 수 없습니다.');
  }
}

export function ticketErrorResponse(error: unknown) {
  if (error instanceof ServerConfigurationError) return Response.json({ error: '개발 데이터 연결 설정이 준비되지 않았습니다.' }, { status: 503 });
  if (error instanceof TicketInputError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof TicketRepositoryError) {
    const notFound = error.code === 'NOT_FOUND' || error.message.startsWith('티켓을 찾을 수 없습니다');
    const conflict = error.code === '23505' || ['배정 후', '상태에서는', '상태에는', '다시 열'].some((text) => error.message.includes(text));
    const invalidReference = ['티켓 유형을 찾을 수 없습니다', '담당 팀을 찾을 수 없습니다', '담당자는 담당 팀'].some((text) => error.message.includes(text));
    return Response.json({ error: error.message }, { status: notFound ? 404 : conflict ? 409 : invalidReference ? 400 : 503 });
  }
  console.error('[teams/tickets] unexpected error', error);
  return Response.json({ error: '티켓 요청을 처리하지 못했습니다.' }, { status: 500 });
}
