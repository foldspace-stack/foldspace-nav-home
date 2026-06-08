import { getAuthenticatedUser } from './auth';
import { getSetting, setSetting, getSettingsMap } from '../repositories/settings';
import type { Env } from '../env';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function requireAdmin(request: Request, env: Env) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) return null;
  if (user.role !== 'admin') return null;
  return user;
}

async function readJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

export async function routeSettingsRequest(request: Request, env: Env) {
  const url = new URL(request.url);
  const keyMatch = url.pathname.match(/^\/api\/settings\/([^/]+)$/);

  if (request.method === 'GET' && url.pathname === '/api/settings') {
    const settings = await getSettingsMap(env.DB);
    return json({ settings });
  }

  if (!keyMatch) {
    return json({ error: 'Not Found' }, 404);
  }

  const key = keyMatch[1];
  if (!key) {
    return json({ error: 'Not Found' }, 404);
  }

  if (request.method === 'GET') {
    const setting = await getSetting(env.DB, key);
    if (!setting) return json({ key, value: null });
    try {
      return json({ key, value: JSON.parse(setting.value) });
    } catch {
      return json({ key, value: setting.value });
    }
  }

  const admin = await requireAdmin(request, env);
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (request.method === 'PUT') {
    const body = await readJsonBody<{ value: unknown }>(request);
    const saved = await setSetting(env.DB, key, body.value);
    return json({ success: true, setting: saved });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}
