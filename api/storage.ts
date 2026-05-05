// Vercel 存储接口
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getKV, getCorsHeaders, verifyAuth } from './_kvHelper';

const STORAGE_KEYS = {
  CONFIG_KEY: 'config',
  CATEGORIES_CONFIG_KEY: 'cate_config',
  LINKS_CONFIG_KEY: 'links_config',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsHeaders = getCorsHeaders();
  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const kv = getKV();

    // ==================== GET ====================
    if (req.method === 'GET') {
      const { checkAuth, getConfig, key, readOnly } = req.query;

      if (checkAuth === 'true') {
        return res.status(200).json({
          hasPassword: !!process.env.PASSWORD,
          requiresAuth: !!process.env.PASSWORD,
          readOnlyAccess: true,
        });
      }

      if (['ai', 'website', 'search', 'mastodon', 'weather', 'icon', 'view', 'ui'].includes(getConfig as string)) {
        const configStr = await kv.get('config');
        const config = configStr ? JSON.parse(configStr as string) : {};
        const defaults: Record<string, any> = {
          website: { passwordExpiry: { value: 1, unit: 'week' } },
        };
        return res.status(200).json(config[getConfig as string] || defaults[getConfig as string] || {});
      }

      if (getConfig === 'favicon') {
        const domain = req.query.domain as string;
        if (!domain) return res.status(400).json({ error: 'Domain required' });
        const cachedIcon = await kv.get(`favicon:${domain}`);
        return res.status(200).json({ icon: cachedIcon || null, cached: !!cachedIcon });
      }

      if (getConfig === 'categories') {
        const data = await kv.get(STORAGE_KEYS.CATEGORIES_CONFIG_KEY);
        const categories = data ? JSON.parse(data as string) : [];
        const sanitized = categories.map(({ password, ...rest }: any) => rest);
        return res.status(200).json(sanitized);
      }

      if (getConfig === 'links') {
        const data = await kv.get(STORAGE_KEYS.LINKS_CONFIG_KEY);
        return res.status(200).json(data ? JSON.parse(data as string) : []);
      }

      if (key) {
        const value = await kv.get(key as string);
        return res.status(200).json({ key, value });
      }

      if (getConfig === 'true') {
        const linksData = await kv.get(STORAGE_KEYS.LINKS_CONFIG_KEY);
        const categoriesData = await kv.get(STORAGE_KEYS.CATEGORIES_CONFIG_KEY);
        const categories = categoriesData ? JSON.parse(categoriesData as string) : [];
        const sanitizedCategories = readOnly
          ? categories.map(({ password, ...rest }: any) => rest)
          : categories;
        return res.status(200).json({
          links: linksData ? JSON.parse(linksData as string) : [],
          categories: sanitizedCategories,
        });
      }

      return res.status(200).json({ links: [], categories: [] });
    }

    // ==================== POST ====================
    if (req.method === 'POST') {
      const body = req.body;

      if (body.saveConfig === 'favicon') {
        const { domain, icon } = body;
        if (!domain || !icon) return res.status(400).json({ error: 'Domain and icon required' });
        await kv.set(`favicon:${domain}`, icon, { ex: 30 * 24 * 60 * 60 });
        return res.status(200).json({ success: true });
      }

      const providedPassword = req.headers['x-auth-password'] as string;
      const isAuthenticated = await verifyAuth(providedPassword);

      if (!isAuthenticated) {
        return res.status(401).json({ error: '管理操作需要密码验证' });
      }

      if (body.authOnly) {
        await kv.set('last_auth_time', Date.now().toString());
        return res.status(200).json({ success: true });
      }

      if (['search', 'ai', 'website', 'mastodon', 'weather', 'icon', 'view', 'ui'].includes(body.saveConfig)) {
        const configStr = await kv.get('config');
        const config = configStr ? JSON.parse(configStr as string) : {};
        config[body.saveConfig] = body.config;
        await kv.set('config', JSON.stringify(config));
        return res.status(200).json({ success: true });
      }

      if (body.saveConfig === 'categories') {
        await kv.set(STORAGE_KEYS.CATEGORIES_CONFIG_KEY, JSON.stringify(body.categories));
        return res.status(200).json({ success: true });
      }

      if (body.saveConfig === 'links') {
        await kv.set(STORAGE_KEYS.LINKS_CONFIG_KEY, JSON.stringify(body.links));
        return res.status(200).json({ success: true });
      }

      if (body.key === STORAGE_KEYS.CONFIG_KEY && body.value) {
        await kv.set('config', body.value);
        return res.status(200).json({ success: true });
      }

      if (body.links && body.categories) {
        await kv.set(STORAGE_KEYS.LINKS_CONFIG_KEY, JSON.stringify(body.links));
        await kv.set(STORAGE_KEYS.CATEGORIES_CONFIG_KEY, JSON.stringify(body.categories));
        return res.status(200).json({ success: true });
      } else if (body.links) {
        await kv.set(STORAGE_KEYS.LINKS_CONFIG_KEY, JSON.stringify(body.links));
        return res.status(200).json({ success: true });
      } else if (body.categories) {
        await kv.set(STORAGE_KEYS.CATEGORIES_CONFIG_KEY, JSON.stringify(body.categories));
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid data format' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (err: any) {
    console.error('Storage API error:', err);
    return res.status(500).json({ error: 'Failed to fetch data', details: err.message });
  }
}
