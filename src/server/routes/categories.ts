import { createCategory, deleteCategory, getCategoryById, listCategories, updateCategory } from '../repositories/categories';
import { moveSitesToCategory } from '../repositories/sites';
import { getAuthenticatedUser } from './auth';
import type { Env } from '../env';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function requireEditor(request: Request, env: Env) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'editor') return null;
  return user;
}

async function readJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

export async function routeCategoryRequest(request: Request, env: Env) {
  if (request.method === 'GET') {
    const categories = await listCategories(env.DB);
    return json({ categories });
  }

  const editor = await requireEditor(request, env);
  if (!editor) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const idMatch = url.pathname.match(/^\/api\/categories\/([^/]+)$/);

  if (request.method === 'POST' && url.pathname === '/api/categories') {
    const body = await readJsonBody<{
      name: string;
      icon: string;
      parentId?: string | null;
      isSubcategory?: boolean;
      weight?: number;
    }>(request);

    if (!body.name || !body.icon) {
      return json({ error: 'name and icon are required' }, 400);
    }

    if (body.parentId) {
      const parent = await getCategoryById(env.DB, body.parentId);
      if (!parent) return json({ error: 'Invalid parentId' }, 400);
    }

    const category = await createCategory(env.DB, {
      name: body.name.trim(),
      icon: body.icon,
      parentId: body.parentId || null,
      isSubcategory: body.isSubcategory ?? Boolean(body.parentId),
      weight: body.weight ?? 0,
    });

    return json({ success: true, category }, 201);
  }

  if (request.method === 'PUT' && url.pathname === '/api/categories') {
    const body = await readJsonBody<{
      categories?: Array<{
        id?: string;
        name: string;
        icon: string;
        parentId?: string | null;
        isSubcategory?: boolean;
        weight?: number;
      }>;
    }>(request);

    const incoming = body.categories || [];
    const normalized = incoming.some(category => category.id === 'common')
      ? incoming
      : [{ id: 'common', name: '常用推荐', icon: 'Star', weight: -1000 }, ...incoming];

    const existing = await listCategories(env.DB);
    const existingById = new Map(existing.map(category => [category.id, category]));
    const incomingIds = new Set<string>();

    for (const item of normalized) {
      if (item.parentId) {
        const parentExists = item.parentId === 'common'
          ? true
          : normalized.some(category => category.id === item.parentId) || Boolean(await getCategoryById(env.DB, item.parentId));
        if (!parentExists) {
          return json({ error: `Invalid parentId: ${item.parentId}` }, 400);
        }
      }
    }

    for (const item of normalized) {
      const payload = {
        name: item.name.trim(),
        icon: item.icon,
        parentId: item.parentId || null,
        isSubcategory: item.isSubcategory ?? Boolean(item.parentId),
        weight: item.weight ?? 0,
        id: item.id,
      };

      if (item.id && existingById.has(item.id)) {
        const updated = await updateCategory(env.DB, item.id, payload);
        if (updated) incomingIds.add(updated.id);
        continue;
      }

      const created = await createCategory(env.DB, payload);
      incomingIds.add(created.id);
    }

    for (const category of existing) {
      if (!incomingIds.has(category.id)) {
        await moveSitesToCategory(env.DB, category.id, 'common');
        await deleteCategory(env.DB, category.id);
      }
    }

    const categories = await listCategories(env.DB);
    return json({ success: true, categories });
  }

  if (!idMatch) {
    return json({ error: 'Not Found' }, 404);
  }

  const categoryId = idMatch[1];
  if (!categoryId) {
    return json({ error: 'Not Found' }, 404);
  }

  if (request.method === 'PATCH') {
    const body = await readJsonBody<{
      name?: string;
      icon?: string;
      parentId?: string | null;
      isSubcategory?: boolean;
      weight?: number;
    }>(request);

    const existing = await getCategoryById(env.DB, categoryId);
    if (!existing) {
      return json({ error: 'Not Found' }, 404);
    }

    if (body.parentId) {
      const parent = await getCategoryById(env.DB, body.parentId);
      if (!parent) return json({ error: 'Invalid parentId' }, 400);
    }

    const updated = await updateCategory(env.DB, categoryId, {
      name: body.name?.trim() || existing.name,
      icon: body.icon || existing.icon,
      parentId: body.parentId ?? existing.parentId ?? null,
      isSubcategory: body.isSubcategory ?? existing.isSubcategory,
      weight: body.weight ?? existing.weight,
    });

    return json({ success: true, category: updated });
  }

  if (request.method === 'DELETE') {
    await moveSitesToCategory(env.DB, categoryId, 'common');
    await deleteCategory(env.DB, categoryId);
    return json({ success: true });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}
