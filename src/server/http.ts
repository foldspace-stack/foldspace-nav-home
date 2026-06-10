import { handleApiRequest } from './routes/index';
import type { Env } from './env';

export async function handleRequest(request: Request, env: Env, _ctx: ExecutionContext) {
  const url = new URL(request.url);

  try {
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request, env, _ctx);
    }

    return await env.ASSETS.fetch(request);
  } catch (error) {
    const requestId = crypto.randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Request failed`, {
      path: url.pathname,
      method: request.method,
      error,
    });

    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: message,
      requestId,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
    });
  }
}
