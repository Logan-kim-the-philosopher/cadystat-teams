import type { APIRoute } from 'astro';
import { ServerConfigurationError } from '../../../../lib/server/env';
import {
  OrganizationInputError,
  parseCreateOrganizationTeamInput,
  parseOrganizationId,
  parseUpdateOrganizationTeamInput
} from '../../../../features/teams/domain/organization';
import {
  createOrganizationTeam,
  deleteOrganizationTeam,
  getOrganizationTeam,
  listOrganization,
  OrganizationRepositoryError,
  updateOrganizationTeam
} from '../../../../features/teams/server/organization-repository';

export const prerender = false;

async function jsonBody(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new OrganizationInputError('JSON 요청만 지원합니다.');
  try {
    return await request.json();
  } catch {
    throw new OrganizationInputError('JSON 본문을 읽을 수 없습니다.');
  }
}

function errorResponse(error: unknown) {
  if (error instanceof ServerConfigurationError) return Response.json({ error: '개발 데이터 연결 설정이 준비되지 않았습니다.' }, { status: 503 });
  if (error instanceof OrganizationInputError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof OrganizationRepositoryError) {
    const conflict = error.code === '23505' || error.message.includes('하위 팀') || error.message.includes('이미 존재');
    const notFound = error.message.includes('찾을 수 없습니다');
    return Response.json({ error: error.message }, { status: conflict ? 409 : notFound ? 404 : 503 });
  }
  console.error('[teams/organization] unexpected error', error);
  return Response.json({ error: '조직 요청을 처리하지 못했습니다.' }, { status: 500 });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const rawId = url.searchParams.get('id');
    if (!rawId) return Response.json(await listOrganization());
    const team = await getOrganizationTeam(parseOrganizationId(rawId));
    return team ? Response.json({ team }) : Response.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const team = await createOrganizationTeam(parseCreateOrganizationTeamInput(await jsonBody(request)));
    return Response.json({ team }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const team = await updateOrganizationTeam(parseUpdateOrganizationTeamInput(await jsonBody(request)));
    return Response.json({ team });
  } catch (error) {
    return errorResponse(error);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    await deleteOrganizationTeam(parseOrganizationId(url.searchParams.get('id')));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
};
