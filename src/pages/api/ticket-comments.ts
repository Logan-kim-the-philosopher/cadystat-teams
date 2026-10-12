import { readBody, route } from '../../lib/server/http';

export const GET = route(({ url }, store) => store.getTicketComments(url.searchParams.get('ticket_id')));
export const POST = route(async ({ request }, store) => store.addTicketComment(await readBody(request)), 201);
