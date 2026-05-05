// 统一存储接口
// 支持 EdgeOne Pages / Cloudflare Workers
// 支持按分类拆分链接存储

import { getKV, getCorsHeaders, verifyAuth, jsonResponse } from './_kvAdapter.js';

const STORAGE_KEYS = {
  CONFIG_KEY: 'config',
  CATEGORIES_CONFIG_KEY: 'cate_config',
};

// 生成分类链接 key
function categoryLinksKey(categoryId) {
  return `links:${categoryId}`;
}

// 读取所有分类链接
async function readAllCategoryLinks(kv) {
  // 1. 获取所有分类
  const categoriesStr = await kv.get(STORAGE_KEYS.CATEGORIES_CONFIG_KEY);
  const categories = categoriesStr ? JSON.parse(categoriesStr) : [];

  if (categories.length === 0) return [];

  // 2. 并行读取每个分类的链接
  const linkPromises = categories.map(async (cat) => {
    const data = await kv.get(categoryLinksKey(cat.id));
    return data ? JSON.parse(data) : [];
  });

  const linkArrays = await Promise.all(linkPromises);

  // 3. 合并所有链接
  return linkArrays.flat();
}

// 保存链接到对应的分类 key
async function saveCategoryLinks(kv, links) {
  // 按 categoryId 分组
  const grouped = {};
  for (const link of links) {
    const catId = link.categoryId || 'common';
    if (!grouped[catId]) grouped[catId] = [];
    grouped[catId].push(link);
  }

  // 并行写入每个分类
  const writes = Object.entries(grouped).map(([catId, catLinks]) =>
    kv.put(categoryLinksKey(catId), JSON.stringify(catLinks))
  );

  await Promise.all(writes);
}

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(env);
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const kv = getKV(env);

    // ==================== GET ====================
    if (request.method === 'GET') {
      const checkAuth = url.searchParams.get('checkAuth');
      const getConfig = url.searchParams.get('getConfig');
      const key = url.searchParams.get('key');
      const readOnly = url.searchParams.get('readOnly');
      const category = url.searchParams.get('category');

      // 检查认证需求
      if (checkAuth === 'true') {
        return jsonResponse({
          hasPassword: !!env.PASSWORD,
          requiresAuth: !!env.PASSWORD,
          readOnlyAccess: true,
        }, 200, corsHeaders);
      }

      // 获取子配置
      if (['ai', 'website', 'search', 'mastodon', 'weather', 'icon', 'view', 'ui'].includes(getConfig)) {
        const configStr = await kv.get('config');
        const config = configStr ? JSON.parse(configStr) : {};
        const defaults = {
          website: { passwordExpiry: { value: 1, unit: 'week' } },
        };
        return jsonResponse(config[getConfig] || defaults[getConfig] || {}, 200, corsHeaders);
      }

      // 获取 Favicon 缓存
      if (getConfig === 'favicon') {
        const domain = url.searchParams.get('domain');
        if (!domain) {
          return jsonResponse({ error: 'Domain parameter is required' }, 400, corsHeaders);
        }
        const cachedIcon = await kv.get(`favicon:${domain}`);
        return jsonResponse({ icon: cachedIcon || null, cached: !!cachedIcon }, 200, corsHeaders);
      }

      // 获取分类（密码脱敏）
      if (getConfig === 'categories') {
        const data = await kv.get(STORAGE_KEYS.CATEGORIES_CONFIG_KEY);
        const categories = data ? JSON.parse(data) : [];
        const sanitized = categories.map(({ password, ...rest }) => rest);
        return jsonResponse(sanitized, 200, corsHeaders);
      }

      // 获取链接
      if (getConfig === 'links') {
        // 按分类读取
        if (category) {
          const data = await kv.get(categoryLinksKey(category));
          return new Response(data || '[]', {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // 读取所有分类链接
        const links = await readAllCategoryLinks(kv);

        return jsonResponse(links, 200, corsHeaders);
      }

      // 按 Key 读取
      if (key) {
        const value = await kv.get(key);
        return jsonResponse({ key, value }, 200, corsHeaders);
      }

      // 获取全部数据
      if (getConfig === 'true') {
        const categoriesData = await kv.get(STORAGE_KEYS.CATEGORIES_CONFIG_KEY);
        const categories = categoriesData ? JSON.parse(categoriesData) : [];

        // 只读模式下分类密码脱敏
        const sanitizedCategories = readOnly
          ? categories.map(({ password, ...rest }) => rest)
          : categories;

        // 读取所有分类链接
        const links = await readAllCategoryLinks(kv);

        return jsonResponse({
          links,
          categories: sanitizedCategories,
        }, 200, corsHeaders);
      }

      return jsonResponse({ links: [], categories: [] }, 200, corsHeaders);
    }

    // ==================== POST ====================
    if (request.method === 'POST') {
      const body = await request.json();
      const readOnlyOperations = ['favicon'];

      // 无需认证的操作
      if (readOnlyOperations.includes(body.operation) || body.saveConfig === 'favicon') {
        if (body.saveConfig === 'favicon') {
          const { domain, icon } = body;
          if (!domain || !icon) {
            return jsonResponse({ error: 'Domain and icon are required' }, 400, corsHeaders);
          }
          await kv.put(`favicon:${domain}`, icon, { expirationTtl: 30 * 24 * 60 * 60 });
          return jsonResponse({ success: true }, 200, corsHeaders);
        }
      }

      // 认证检查
      const providedPassword = request.headers.get('x-auth-password');
      const isAuthenticated = await verifyAuth({
        providedPassword,
        serverPassword: env.PASSWORD,
        kv,
      });

      if (!isAuthenticated) {
        return jsonResponse({ error: '管理操作需要密码验证' }, 401, corsHeaders);
      }

      // 仅验证密码
      if (body.authOnly) {
        await kv.put('last_auth_time', Date.now().toString());
        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // 保存子配置
      if (['search', 'ai', 'website', 'mastodon', 'weather', 'icon', 'view', 'ui'].includes(body.saveConfig)) {
        const configStr = await kv.get('config');
        const config = configStr ? JSON.parse(configStr) : {};
        config[body.saveConfig] = body.config;
        await kv.put('config', JSON.stringify(config));
        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // 保存分类
      if (body.saveConfig === 'categories') {
        await kv.put(STORAGE_KEYS.CATEGORIES_CONFIG_KEY, JSON.stringify(body.categories));
        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // 保存链接（按分类拆分存储）
      if (body.saveConfig === 'links') {
        // 如果指定了分类，只保存该分类的链接
        if (body.categoryId) {
          await kv.put(categoryLinksKey(body.categoryId), JSON.stringify(body.links));
        } else {
          // 保存所有链接（按 categoryId 拆分）
          await saveCategoryLinks(kv, body.links);
        }
        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // 同步统一配置
      if (body.key === STORAGE_KEYS.CONFIG_KEY && body.value) {
        await kv.put('config', body.value);
        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // 写入任意 key（用于设置等独立 KV 项）
      if (body.key && body.value && body.key !== STORAGE_KEYS.CONFIG_KEY) {
        await kv.put(body.key, body.value);
        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // 同时保存链接和分类
      if (body.links && body.categories) {
        await saveCategoryLinks(kv, body.links);
        await kv.put(STORAGE_KEYS.CATEGORIES_CONFIG_KEY, JSON.stringify(body.categories));
        return jsonResponse({ success: true }, 200, corsHeaders);
      } else if (body.links) {
        await saveCategoryLinks(kv, body.links);
        return jsonResponse({ success: true }, 200, corsHeaders);
      } else if (body.categories) {
        await kv.put(STORAGE_KEYS.CATEGORIES_CONFIG_KEY, JSON.stringify(body.categories));
        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      return jsonResponse({ error: 'Invalid data format' }, 400, corsHeaders);
    }

    return jsonResponse({ error: 'Method Not Allowed' }, 405, corsHeaders);

  } catch (err) {
    console.error('Storage API error:', err);
    return jsonResponse({ error: 'Failed to fetch data', details: err.message }, 500, corsHeaders);
  }
}
