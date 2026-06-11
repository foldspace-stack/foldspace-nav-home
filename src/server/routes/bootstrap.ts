import { getSettingsMap } from '../repositories/settings';
import { listCategories } from '../repositories/categories';
import { listSites } from '../repositories/sites';
import type { Env } from '../env';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sanitizeCategoryForClient<T extends Record<string, unknown>>(category: T) {
  const { accessPasswordHash, ...rest } = category;
  return rest;
}

export async function routeBootstrapRequest(request: Request, env: Env) {
  if (request.method !== 'GET') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  const [sites, categories, config] = await Promise.all([
    listSites(env.DB),
    listCategories(env.DB),
    getSettingsMap(env.DB),
  ]);

  return json({
    sites,
    links: sites,
    categories: categories.map(category => sanitizeCategoryForClient(category as Record<string, unknown>)),
    config,
  });
}
