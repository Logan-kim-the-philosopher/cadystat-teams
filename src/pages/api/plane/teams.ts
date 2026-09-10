import type { APIRoute } from 'astro';

type PlaneProject = { id: string; name: string; identifier?: string; slug?: string; description?: string };

export const GET: APIRoute = async () => {
  const baseUrl = import.meta.env.PLANE_BASE_URL;
  const workspaceSlug = import.meta.env.PLANE_WORKSPACE_SLUG;
  const apiKey = import.meta.env.PLANE_API_KEY;
  const executiveSlug = import.meta.env.PLANE_EXECUTIVE_PROJECT_SLUG ?? 'executive';

  if (!baseUrl || !workspaceSlug || !apiKey) {
    return new Response(JSON.stringify({ error: 'Plane API is not configured' }), { status: 503 });
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/api/v1/workspaces/${workspaceSlug}/projects/`,
    { headers: { 'X-API-Key': apiKey } },
  );

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Plane projects' }), { status: response.status });
  }

  const payload = (await response.json()) as { results?: PlaneProject[] };
  const projects = payload.results ?? [];
  const projectKey = (project: PlaneProject) => (project.slug ?? project.identifier ?? '').toLowerCase();
  const executive = projects.find((project) => {
    const key = projectKey(project);
    return key === executiveSlug.toLowerCase()
      || key === 'exec'
      || project.name === '운영진';
  });
  const teamSlugByName: Record<string, string> = {
    '마케팅팀': 'product',
    '마케팅지원팀': 'product',
    '개발팀': 'engineering',
    '경영지원팀': 'operations',
  };
  const teamSlugByIdentifier: Record<string, string> = {
    mkt: 'product',
    dev: 'engineering',
    ops: 'operations',
  };

  return Response.json({
    executive: executive ? { id: executive.id, name: executive.name, slug: 'executive' } : null,
    teams: projects
      .filter((project) => project.id !== executive?.id && project.name !== '조직도')
      .map((project) => ({
        id: project.id,
        name: project.name,
        slug: teamSlugByName[project.name] ?? teamSlugByIdentifier[projectKey(project)] ?? projectKey(project),
        parentSlug: 'executive',
      })),
  });
};
