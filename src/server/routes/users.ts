import { createUser, getUserByUsername, getUserRecordById, listUsers, updateUserPassword, updateUserProfile, updateUserRole, updateUserStatus, toUserItem } from '../repositories/users';
import { hashPassword, verifyPassword } from '../auth/password';
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
  const url = new URL(request.url);

  if (request.method === 'PATCH' && url.pathname === '/api/users/me') {
    const currentUser = await getAuthenticatedUser(request, env);
    if (!currentUser) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await readJsonBody<{
      username?: string;
      displayName?: string;
      currentPassword?: string;
      newPassword?: string;
    }>(request);

    const newUsername = body.username?.trim();
    const newDisplayName = body.displayName?.trim();
    const currentPassword = body.currentPassword?.trim();
    const newPassword = body.newPassword?.trim();

    if (!currentPassword) {
      return json({ error: 'currentPassword is required' }, 400);
    }

    const record = await getUserRecordById(env.DB, currentUser.id);
    if (!record) {
      return json({ error: 'User not found' }, 404);
    }

    const verified = await verifyPassword(currentPassword, record.password_hash);
    if (!verified) {
      return json({ error: 'Invalid current password' }, 401);
    }

    if ((newUsername && newUsername !== record.username) || (newDisplayName && newDisplayName !== record.display_name)) {
      const targetUsername = newUsername || record.username;
      if (newUsername) {
        const exists = await getUserByUsername(env.DB, newUsername);
        if (exists && exists.id !== record.id) {
          return json({ error: 'Username already exists' }, 409);
        }
      }
      await updateUserProfile(env.DB, record.id, {
        username: newUsername,
        displayName: newDisplayName ?? targetUsername,
      });
    }

    if (newPassword) {
      await updateUserPassword(env.DB, record.id, await hashPassword(newPassword));
    }

    const updated = await getUserRecordById(env.DB, record.id);
    return json({ success: true, user: updated ? toUserItem(updated) : null });
  }

  const admin = await requireAdmin(request, env);
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

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
