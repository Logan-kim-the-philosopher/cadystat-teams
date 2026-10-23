export type TeamsSurface = 'page' | 'api' | null;

/** Match complete URL segments; decoding also covers encoded slash attempts. */
export function teamsSurface(pathname: string): TeamsSurface {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (path === '/api/teams' || path.startsWith('/api/teams/')) return 'api';
  if (path === '/teams' || path.startsWith('/teams/')) return 'page';
  return null;
}

export function isCrossOriginTeamsMutation(request: Request): boolean {
  const url = new URL(request.url);
  if (teamsSurface(url.pathname) !== 'api' || ['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return false;
  const origin = request.headers.get('origin');
  return origin !== null && origin !== url.origin;
}
