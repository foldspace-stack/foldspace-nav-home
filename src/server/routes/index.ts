import { routeAuthRequest } from './auth';
import { routeBootstrapRequest } from './bootstrap';
import { routeCategoryRequest } from './categories';
import { routeUserRequest } from './users';
import { routeSiteRequest } from './sites';
import { routeSettingsRequest } from './settings';
import { routeProxyRequest } from './proxy';
import type { Env } from '../env';

function jsonError(
  status: number,
  error: string,
  details?: string,
  requestId?: string,
) {
  return new Response(JSON.stringify({
    error,
    details,
    requestId,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-Id': requestId } : {}),
    },
  });
}

export async function handleApiRequest(request: Request, env: Env, _ctx: ExecutionContext) {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();

  try {
    if (url.pathname.startsWith('/api/auth')) return await routeAuthRequest(request, env);
    if (url.pathname.startsWith('/api/bootstrap')) return await routeBootstrapRequest(request, env);
    if (url.pathname.startsWith('/api/users')) return await routeUserRequest(request, env);
    if (url.pathname.startsWith('/api/sites')) return await routeSiteRequest(request, env);
    if (url.pathname.startsWith('/api/categories')) return await routeCategoryRequest(request, env);
    if (url.pathname.startsWith('/api/settings')) return await routeSettingsRequest(request, env);
    if (url.pathname.startsWith('/api/proxy')) return await routeProxyRequest(request, env);

    return jsonError(404, 'Not Found', undefined, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] API error`, {
      path: url.pathname,
      method: request.method,
      error,
    });
    return jsonError(
      500,
      'Internal Server Error',
      message,
      requestId,
    );
  }
}
