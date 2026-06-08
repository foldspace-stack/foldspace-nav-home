import { routeAuthRequest } from './auth';
import { routeBootstrapRequest } from './bootstrap';
import { routeCategoryRequest } from './categories';
import { routeUserRequest } from './users';
import { routeSiteRequest } from './sites';
import { routeSettingsRequest } from './settings';
import { routeProxyRequest } from './proxy';
import type { Env } from '../env';

export async function handleApiRequest(request: Request, env: Env, _ctx: ExecutionContext) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/auth')) return routeAuthRequest(request, env);
  if (url.pathname.startsWith('/api/bootstrap')) return routeBootstrapRequest(request, env);
  if (url.pathname.startsWith('/api/users')) return routeUserRequest(request, env);
  if (url.pathname.startsWith('/api/sites')) return routeSiteRequest(request, env);
  if (url.pathname.startsWith('/api/categories')) return routeCategoryRequest(request, env);
  if (url.pathname.startsWith('/api/settings')) return routeSettingsRequest(request, env);
  if (url.pathname.startsWith('/api/proxy')) return routeProxyRequest(request, env);

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
