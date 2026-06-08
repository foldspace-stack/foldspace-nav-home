import { handleApiRequest } from './routes/index';
import type { Env } from './env';

export async function handleRequest(request: Request, env: Env, _ctx: ExecutionContext) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request, env, _ctx);
  }

  return env.ASSETS.fetch(request);
}
