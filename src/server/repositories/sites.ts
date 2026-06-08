import { allResults, firstOrNull, now, randomId } from '../db';

export interface SiteRecord {
  id: string;
  title: string;
  url: string;
  description: string;
  icon: string;
  category_id: string;
  pinned: number;
  pinned_order: number | null;
  sort_order: number;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

export interface SiteInput {
  title: string;
  url: string;
  description?: string;
  icon?: string;
  categoryId: string;
  pinned?: boolean;
  pinnedOrder?: number | null;
  sortOrder?: number;
  createdBy?: string | null;
}

export function toSiteItem(site: SiteRecord) {
  return {
    id: site.id,
    title: site.title,
    url: site.url,
    description: site.description,
    icon: site.icon,
    categoryId: site.category_id,
    pinned: site.pinned === 1,
    pinnedOrder: site.pinned_order,
    sortOrder: site.sort_order,
    createdBy: site.created_by,
    createdAt: site.created_at,
    updatedAt: site.updated_at,
  };
}

export async function listSites(db: D1Database) {
  const rows = await allResults<SiteRecord>(
    db.prepare(
      `SELECT id, title, url, description, icon, category_id, pinned, pinned_order, sort_order, created_by, created_at, updated_at
       FROM sites
       ORDER BY pinned DESC, pinned_order ASC, sort_order ASC, created_at DESC`
    )
  );
  return rows.map(toSiteItem);
}

export async function getSiteById(db: D1Database, id: string) {
  const row = await firstOrNull<SiteRecord>(
    db.prepare(
      `SELECT id, title, url, description, icon, category_id, pinned, pinned_order, sort_order, created_by, created_at, updated_at
       FROM sites
       WHERE id = ?`
    ).bind(id)
  );
  return row ? toSiteItem(row) : null;
}

export async function createSite(db: D1Database, input: SiteInput & { id?: string }) {
  const timestamp = now();
  const site: SiteRecord = {
    id: input.id ?? randomId(),
    title: input.title,
    url: input.url,
    description: input.description ?? '',
    icon: input.icon ?? '',
    category_id: input.categoryId,
    pinned: input.pinned ? 1 : 0,
    pinned_order: input.pinnedOrder ?? null,
    sort_order: input.sortOrder ?? 0,
    created_by: input.createdBy ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db.prepare(
    `INSERT INTO sites (id, title, url, description, icon, category_id, pinned, pinned_order, sort_order, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    site.id,
    site.title,
    site.url,
    site.description,
    site.icon,
    site.category_id,
    site.pinned,
    site.pinned_order,
    site.sort_order,
    site.created_by,
    site.created_at,
    site.updated_at,
  ).run();

  return toSiteItem(site);
}

export async function updateSite(
  db: D1Database,
  id: string,
  input: Partial<SiteInput>,
) {
  const existing = await getSiteById(db, id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...input,
    updatedAt: now(),
  };

  await db.prepare(
    `UPDATE sites
     SET title = ?, url = ?, description = ?, icon = ?, category_id = ?, pinned = ?, pinned_order = ?, sort_order = ?, created_by = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    updated.title,
    updated.url,
    updated.description ?? '',
    updated.icon ?? '',
    updated.categoryId,
    updated.pinned ? 1 : 0,
    updated.pinnedOrder ?? null,
    updated.sortOrder ?? 0,
    updated.createdBy ?? null,
    updated.updatedAt,
    id,
  ).run();

  return updated;
}

export async function deleteSite(db: D1Database, id: string) {
  await db.prepare(`DELETE FROM sites WHERE id = ?`).bind(id).run();
}

export async function listSitesByCategory(db: D1Database, categoryId: string) {
  const rows = await allResults<SiteRecord>(
    db.prepare(
      `SELECT id, title, url, description, icon, category_id, pinned, pinned_order, sort_order, created_by, created_at, updated_at
       FROM sites
       WHERE category_id = ?
       ORDER BY pinned DESC, pinned_order ASC, sort_order ASC, created_at DESC`
    ).bind(categoryId)
  );
  return rows.map(toSiteItem);
}

export async function moveSitesToCategory(db: D1Database, fromCategoryId: string, toCategoryId: string) {
  await db.prepare(
    `UPDATE sites SET category_id = ?, updated_at = ? WHERE category_id = ?`
  ).bind(toCategoryId, now(), fromCategoryId).run();
}

export async function replaceSites(db: D1Database, inputs: Array<SiteInput & { id?: string }>) {
  const existing = await listSites(db);
  const existingIds = new Set(existing.map(site => site.id));
  const incomingIds = new Set<string>();

  await db.prepare(`DELETE FROM sites`).run();

  for (const input of inputs) {
    const site = await createSite(db, {
      ...input,
      id: input.id ?? randomId(),
    });
    incomingIds.add(site.id);
  }

  for (const site of existing) {
    if (!incomingIds.has(site.id) && existingIds.has(site.id)) {
      await deleteSite(db, site.id);
    }
  }

  return listSites(db);
}
