import { defineMiddleware } from 'astro:middleware';
import { isCrossOriginTeamsMutation } from './lib/server/teams-access';

function secureHeaders(response: Response) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Today's release intentionally permits anonymous Teams reads and writes.
  if (isCrossOriginTeamsMutation(context.request)) {
    return secureHeaders(Response.json({ error: '다른 사이트에서 보낸 변경 요청은 허용하지 않습니다.' }, { status: 403 }));
  }
  return secureHeaders(await next());
});
