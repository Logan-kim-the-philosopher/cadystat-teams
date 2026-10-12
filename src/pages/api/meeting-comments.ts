import { readBody, route } from '../../lib/server/http';

export const GET = route(({ url }, store) => store.getMeetingComments(url.searchParams.get('slug')));
export const POST = route(async ({ request }, store) => store.addMeetingComment(await readBody(request)), 201);
