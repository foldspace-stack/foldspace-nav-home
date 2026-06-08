import { useCallback, useRef } from 'react';
import { LinkItem, Category, DEFAULT_CATEGORIES, INITIAL_LINKS } from '../../types';
import { STORAGE_KEYS, API_ENDPOINTS } from '../constants';
import { useLinksContext } from '../contexts/LinksContext';
import { useCategoriesContext } from '../contexts/CategoriesContext';
import { useConfigContext } from '../contexts/ConfigContext';

/**
 * 数据同步 Hook：管理 localStorage ↔ 云端 D1 的加载和同步
 */
export function useDataSync() {
  const { links = [], initLinks, setLinksAndSync } = useLinksContext();
  const { categories = [], initCategories } = useCategoriesContext();
  const { initConfig } = useConfigContext();
  const initialized = useRef(false);

  // 从 localStorage 加载
  const loadFromLocal = useCallback((): { links: LinkItem[]; categories: Category[] } => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        let cats: Category[] = parsed.categories || DEFAULT_CATEGORIES;

        // 确保 common 分类存在且排第一
        if (!cats.some((c: Category) => c.id === 'common')) {
          cats = [{ id: 'common', name: '常用推荐', icon: 'Star' }, ...cats];
        } else {
          const idx = cats.findIndex((c: Category) => c.id === 'common');
          if (idx > 0) {
            const common = cats[idx];
            cats = [common, ...cats.slice(0, idx), ...cats.slice(idx + 1)];
          }
        }

        // 修复无效 categoryId
        const validIds = new Set(cats.map((c: Category) => c.id));
        let lnks: LinkItem[] = (parsed.links || INITIAL_LINKS).map((l: LinkItem) =>
          validIds.has(l.categoryId) ? l : { ...l, categoryId: 'common' }
        );

        return { links: lnks, categories: cats };
      }
    } catch (e) {
      console.error('Load from local failed:', e);
    }
    return { links: INITIAL_LINKS, categories: DEFAULT_CATEGORIES };
  }, []);

  // 从云端加载链接、分类和配置
  const loadFromCloud = useCallback(async (): Promise<{ links: LinkItem[]; categories: Category[]; config: Partial<Record<string, unknown>> } | null> => {
    try {
      const res = await fetch(API_ENDPOINTS.BOOTSTRAP);
      if (!res.ok) return null;
      const data = await res.json();
      const linksFromServer = Array.isArray(data.links) ? data.links : [];
      const categoriesFromServer = Array.isArray(data.categories) ? data.categories : [];
      const configFromServer = data.config && typeof data.config === 'object' ? data.config : {};
      if (linksFromServer.length > 0 || categoriesFromServer.length > 0 || Object.keys(configFromServer).length > 0) {
        return { links: linksFromServer, categories: categoriesFromServer, config: configFromServer };
      }
      return null;
    } catch (e) {
      console.error('Load from cloud failed:', e);
      return null;
    }
  }, []);

  // 初始化数据
  const initData = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;

    // 1. 先从本地加载（快速展示）
    const local = loadFromLocal();
    initLinks(local.links);
    initCategories(local.categories);

    // 2. 从云端获取最新数据
    const cloud = await loadFromCloud();

    if (cloud) {
      // 配置始终可以覆盖本地，但链接和分类仅在云端有内容时覆盖
      const appConfig = (cloud.config as Record<string, any>).config || cloud.config;
      if (appConfig && typeof appConfig === 'object') {
        initConfig({
          ai: appConfig.ai,
          website: appConfig.website,
          webdav: appConfig.webdav,
          search: appConfig.search,
          icon: appConfig.icon,
          ticker: appConfig.ticker || appConfig.mastodon,
          weather: appConfig.weather,
          viewMode: appConfig.view?.defaultMode,
          showPinnedWebsites: appConfig.ui?.showPinnedWebsites,
          darkMode: appConfig.ui?.darkMode,
        });
      }

      if (cloud.links?.length || cloud.categories?.length) {
        let cats = cloud.categories || [];
        if (cats.length > 0 && !cats.some((c: Category) => c.id === 'common')) {
          cats = [{ id: 'common', name: '常用推荐', icon: 'Star' }, ...cats];
        }
        initLinks(cloud.links || []);
        initCategories(cats);
        localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_KEY, JSON.stringify({
          links: cloud.links || [],
          categories: cats,
        }));
      }
    }
  }, [loadFromLocal, loadFromCloud, initLinks, initCategories, initConfig]);

  // 同步到云端
  const syncToCloud = useCallback(async () => {
    if (!links.length && !categories.length) return;
    setLinksAndSync(links, categories);
  }, [links, categories, setLinksAndSync]);

  return { initData, loadFromLocal, loadFromCloud, syncToCloud };
}
