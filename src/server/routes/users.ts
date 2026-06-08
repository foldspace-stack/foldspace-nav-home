import { createUser, listUsers, updateUserPassword, updateUserRole, updateUserStatus } from '../repositories/users';
import { hashPassword } from '../auth/password';
import { getAuthenticatedUser } from './auth';
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

export async function routeUserRequest(request: Request, env: Env) {
  const admin = await requireAdmin(request, env);
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/api/users') {
    const users = await listUsers(env.DB);
    return json({ users });
  }

  if (request.method === 'POST' && url.pathname === '/api/users') {
    const body = await readJsonBody<{
      username: string;
      displayName?: string;
      password: string;
      role?: 'admin' | 'editor' | 'user';
    }>(request);

    if (!body.username || !body.password) {
      return json({ error: 'username and password are required' }, 400);
    }

    const user = await createUser(env.DB, {
      username: body.username.trim(),
      displayName: body.displayName?.trim() || body.username.trim(),
      passwordHash: await hashPassword(body.password),
      role: body.role || 'user',
    });

    return json({ success: true, user }, 201);
  }

  const match = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (!match) {
    return json({ error: 'Not Found' }, 404);
  }

  const userId = match[1];
  if (!userId) {
    return json({ error: 'Not Found' }, 404);
  }

  if (request.method === 'PATCH') {
    const body = await readJsonBody<{
      role?: 'admin' | 'editor' | 'user';
      status?: 'active' | 'disabled';
      password?: string;
    }>(request);

    if (body.role) {
      await updateUserRole(env.DB, userId, body.role);
    }
    if (body.status) {
      await updateUserStatus(env.DB, userId, body.status);
    }
    if (body.password) {
      await updateUserPassword(env.DB, userId, await hashPassword(body.password));
    }

    return json({ success: true });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}
