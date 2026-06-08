import { createSite, deleteSite, getSiteById, listSites, updateSite } from '../repositories/sites';
import { getCategoryById } from '../repositories/categories';
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

export async function routeSiteRequest(request: Request, env: Env) {
  if (request.method === 'GET') {
    const sites = await listSites(env.DB);
    return json({ sites, links: sites });
  }

  const editor = await requireEditor(request, env);
  if (!editor) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const idMatch = url.pathname.match(/^\/api\/sites\/([^/]+)$/);

  if (request.method === 'POST' && url.pathname === '/api/sites') {
    const body = await readJsonBody<{
      title: string;
      url: string;
      description?: string;
      icon?: string;
      categoryId: string;
      pinned?: boolean;
      pinnedOrder?: number | null;
      sortOrder?: number;
    }>(request);

    if (!body.title || !body.url || !body.categoryId) {
      return json({ error: 'title, url, and categoryId are required' }, 400);
    }

    const category = await getCategoryById(env.DB, body.categoryId);
    if (!category) {
      return json({ error: 'Invalid categoryId' }, 400);
    }

    const site = await createSite(env.DB, {
      title: body.title.trim(),
      url: body.url.trim(),
      description: body.description || '',
      icon: body.icon || '',
      categoryId: body.categoryId,
      pinned: body.pinned ?? false,
      pinnedOrder: body.pinnedOrder ?? null,
      sortOrder: body.sortOrder ?? 0,
      createdBy: editor.id,
    });

    return json({ success: true, site }, 201);
  }

  if (request.method === 'PUT' && url.pathname === '/api/sites') {
    const body = await readJsonBody<{
      sites?: Array<{
        id?: string;
        title: string;
        url: string;
        description?: string;
        icon?: string;
        categoryId: string;
        pinned?: boolean;
        pinnedOrder?: number | null;
        sortOrder?: number;
        order?: number;
        weight?: number;
      }>;
      links?: Array<{
        id?: string;
        title: string;
        url: string;
        description?: string;
        icon?: string;
        categoryId: string;
        pinned?: boolean;
        pinnedOrder?: number | null;
        order?: number;
        weight?: number;
      }>;
    }>(request);

    const incoming = body.sites || body.links || [];
    const existing = await listSites(env.DB);
    const existingById = new Map(existing.map(site => [site.id, site]));
    const incomingIds = new Set<string>();

    for (const item of incoming) {
      const category = await getCategoryById(env.DB, item.categoryId);
      if (!category) {
        return json({ error: `Invalid categoryId: ${item.categoryId}` }, 400);
      }
    }

    for (const item of incoming) {
      const sortOrder = item.sortOrder ?? item.order ?? item.weight ?? 0;
      if (item.id && existingById.has(item.id)) {
        const updated = await updateSite(env.DB, item.id, {
          title: item.title.trim(),
          url: item.url.trim(),
          description: item.description || '',
          icon: item.icon || '',
          categoryId: item.categoryId,
          pinned: item.pinned ?? false,
          pinnedOrder: item.pinnedOrder ?? null,
          sortOrder,
          createdBy: existingById.get(item.id)?.createdBy ?? editor.id,
        });
        if (updated) incomingIds.add(updated.id);
        continue;
      }

      const site = await createSite(env.DB, {
        id: item.id,
        title: item.title.trim(),
        url: item.url.trim(),
        description: item.description || '',
        icon: item.icon || '',
        categoryId: item.categoryId,
        pinned: item.pinned ?? false,
        pinnedOrder: item.pinnedOrder ?? null,
        sortOrder,
        createdBy: editor.id,
      });
      incomingIds.add(site.id);
    }

    for (const site of existing) {
      if (!incomingIds.has(site.id)) {
        await deleteSite(env.DB, site.id);
      }
    }

    const sites = await listSites(env.DB);
    return json({ success: true, sites, links: sites });
  }

  if (!idMatch) {
    return json({ error: 'Not Found' }, 404);
  }

  const siteId = idMatch[1];
  if (!siteId) {
    return json({ error: 'Not Found' }, 404);
  }

  if (request.method === 'PATCH') {
    const body = await readJsonBody<{
      title?: string;
      url?: string;
      description?: string;
      icon?: string;
      categoryId?: string;
      pinned?: boolean;
      pinnedOrder?: number | null;
      sortOrder?: number;
    }>(request);

    const existing = await getSiteById(env.DB, siteId);
    if (!existing) {
      return json({ error: 'Not Found' }, 404);
    }

    const nextCategoryId = body.categoryId || existing.categoryId;
    const category = await getCategoryById(env.DB, nextCategoryId);
    if (!category) {
      return json({ error: 'Invalid categoryId' }, 400);
    }

    const updated = await updateSite(env.DB, siteId, {
      title: body.title?.trim() || existing.title,
      url: body.url?.trim() || existing.url,
      description: body.description ?? existing.description,
      icon: body.icon ?? existing.icon,
      categoryId: nextCategoryId,
      pinned: body.pinned ?? existing.pinned,
      pinnedOrder: body.pinnedOrder ?? existing.pinnedOrder ?? null,
      sortOrder: body.sortOrder ?? existing.sortOrder,
      createdBy: existing.createdBy ?? editor.id,
    });

    return json({ success: true, site: updated });
  }

  if (request.method === 'DELETE') {
    await deleteSite(env.DB, siteId);
    return json({ success: true });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}
