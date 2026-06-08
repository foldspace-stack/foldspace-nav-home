import { countUsers, createUser, getUserByUsername, setLastLoginAt } from '../repositories/users';
import { createSession, getSessionByTokenHash, revokeSession } from '../repositories/sessions';
import { hashPassword, verifyPassword, generateToken, hashToken } from '../auth/password';
import type { Env } from '../env';

const DEFAULT_COOKIE_NAME = 'foldspace_session';
const DEFAULT_SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function getCookieName(env: Env) {
  return env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

function getCookieHeader(request: Request, name: string) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function getAuthenticatedUser(request: Request, env: Env) {
  const token = getCookieHeader(request, getCookieName(env));
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const session = await getSessionByTokenHash(env.DB, tokenHash);
  if (!session || session.revoked_at) return null;
  if (session.expires_at <= Date.now()) return null;

  const userRow = await env.DB.prepare(
    `SELECT id, username, display_name, password_hash, role, status, created_at, updated_at, last_login_at
     FROM users WHERE id = ?`
  ).bind(session.user_id).first<{
    id: string;
    username: string;
    display_name: string;
    password_hash: string;
    role: 'admin' | 'editor' | 'user';
    status: 'active' | 'disabled';
    created_at: number;
    updated_at: number;
    last_login_at: number | null;
  }>();

  return userRow
    ? {
        id: userRow.id,
        username: userRow.username,
        displayName: userRow.display_name,
        role: userRow.role,
        status: userRow.status,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
        lastLoginAt: userRow.last_login_at,
      }
    : null;
}

async function readJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

function buildCookie(name: string, token: string, expiresAt: number) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name: string) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function routeAuthRequest(request: Request, env: Env) {
  const url = new URL(request.url);
  const cookieName = getCookieName(env);

  if (request.method === 'GET' && url.pathname === '/api/auth/me') {
    const userCount = await countUsers(env.DB);
    if (userCount === 0) {
      return json({ user: null, requiresAuth: false, hasBootstrap: true });
    }

    const user = await getAuthenticatedUser(request, env);
    return json({ user, requiresAuth: true, hasBootstrap: false });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/bootstrap') {
    const userCount = await countUsers(env.DB);
    if (userCount > 0) {
      return json({ error: 'Bootstrap is only available when no users exist' }, 409);
    }

    const body = await readJsonBody<{ username: string; password: string; displayName?: string }>(request);
    if (!body.username || !body.password) {
      return json({ error: 'username and password are required' }, 400);
    }

    const passwordHash = await hashPassword(body.password);
    const user = await createUser(env.DB, {
      username: body.username.trim(),
      displayName: body.displayName?.trim() || body.username.trim(),
      passwordHash,
      role: 'admin',
    });

    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = Date.now() + DEFAULT_SESSION_TTL;
    await createSession(env.DB, user.id, tokenHash, expiresAt);

    return json(
      {
        success: true,
        user,
      },
      201,
      { 'Set-Cookie': buildCookie(cookieName, token, expiresAt) }
    );
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJsonBody<{ username: string; password: string }>(request);
    if (!body.username || !body.password) {
      return json({ error: 'username and password are required' }, 400);
    }

    const user = await getUserByUsername(env.DB, body.username.trim());
    if (!user || user.status !== 'active') {
      return json({ error: 'Invalid credentials' }, 401);
    }

    const verified = await verifyPassword(body.password, user.password_hash);
    if (!verified) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = Date.now() + DEFAULT_SESSION_TTL;
    await createSession(env.DB, user.id, tokenHash, expiresAt);
    await setLastLoginAt(env.DB, user.id);

    const responseUser = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: Date.now(),
    };

    return json(
      { success: true, user: responseUser },
      200,
      { 'Set-Cookie': buildCookie(cookieName, token, expiresAt) }
    );
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    const token = getCookieHeader(request, cookieName);
    if (token) {
      const tokenHash = await hashToken(token);
      const session = await getSessionByTokenHash(env.DB, tokenHash);
      if (session) {
        await revokeSession(env.DB, session.id);
      }
    }

    return json({ success: true }, 200, {
      'Set-Cookie': clearCookie(cookieName),
    });
  }

  return json({ error: 'Not Found' }, 404);
}
