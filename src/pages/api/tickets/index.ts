import { readBody, route } from '../../../lib/server/http';

export const GET = route((_context, store) => store.getTickets());
export const POST = route(async ({ request }, store) => store.createTicket(await readBody(request)), 201);
export const PATCH = route(async ({ request, url }, store) => store.updateTicket(url.searchParams.get('id'), await readBody(request)));
export const DELETE = route(({ url }, store) => store.deleteTicket(url.searchParams.get('id')));
