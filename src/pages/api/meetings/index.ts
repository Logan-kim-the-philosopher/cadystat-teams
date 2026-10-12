import { readBody, route } from '../../../lib/server/http';

export const GET = route((_context, store) => store.getMeetings());
export const POST = route(async ({ request }, store) => store.createMeeting(await readBody(request)), 201);
