import { readBody, route } from '../../../lib/server/http';

export const GET = route((_context, store) => store.getOrganization());
export const POST = route(async ({ request }, store) => store.createTeam(await readBody(request)), 201);
export const PATCH = route(async ({ request }, store) => store.updateTeam(await readBody(request)));
export const DELETE = route(({ url }, store) => store.deleteTeam(url.searchParams.get('id')), 204);
