import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const baseUrl = import.meta.env.PLANE_BASE_URL;
  const workspaceSlug = import.meta.env.PLANE_WORKSPACE_SLUG;
  const apiKey = import.meta.env.PLANE_API_KEY;

  if (!baseUrl || !workspaceSlug || !apiKey) {
    return new Response(JSON.stringify({ error: 'Plane API is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/api/v1/workspaces/${workspaceSlug}/projects/`,
    { headers: { 'X-API-Key': apiKey } },
  );

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
  });
};
