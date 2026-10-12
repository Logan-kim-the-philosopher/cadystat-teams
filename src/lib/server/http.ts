import type { APIContext, APIRoute } from 'astro';
import { DataError, getRepository, inputObject, type Repository } from './repository.ts';

export async function readBody(request: Request) {
  try { return inputObject(await request.json()); }
  catch (error) {
    if (error instanceof DataError) throw error;
    throw new DataError('올바른 JSON 요청이 필요합니다.');
  }
}

export function route(handler: (context: APIContext, store: Repository) => unknown | Promise<unknown>, status = 200): APIRoute {
  return async (context) => {
    try {
      const result = await handler(context, getRepository());
      return status === 204 ? new Response(null, { status }) : Response.json(result, { status });
    } catch (error) {
      if (error instanceof DataError) return Response.json({ error: error.message }, { status: error.status });
      console.error('[database]', error);
      return Response.json({ error: '데이터 처리에 실패했습니다.' }, { status: 500 });
    }
  };
}
