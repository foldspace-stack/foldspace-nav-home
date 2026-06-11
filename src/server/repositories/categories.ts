import { allResults, firstOrNull, now, randomId } from '../db';

export interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  is_subcategory: number;
  weight: number;
  access_password_hash: string | null;
  created_at: number;
  updated_at: number;
}

export interface CategoryInput {
  name: string;
  icon: string;
  parentId?: string | null;
  isSubcategory?: boolean;
  weight?: number;
  accessPasswordHash?: string | null;
  id?: string;
}

export function toCategoryItem(category: CategoryRecord) {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    parentId: category.parent_id,
    isSubcategory: category.is_subcategory === 1,
    weight: category.weight,
    hasPassword: Boolean(category.access_password_hash),
    accessPasswordHash: category.access_password_hash ?? undefined,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  };
}

export async function listCategories(db: D1Database) {
  const rows = await allResults<CategoryRecord>(
    db.prepare(
      `SELECT id, name, icon, parent_id, is_subcategory, weight, access_password_hash, created_at, updated_at
       FROM categories
       ORDER BY weight ASC, created_at ASC`
    )
  );
  return rows.map(toCategoryItem);
}

export async function getCategoryById(db: D1Database, id: string) {
  const row = await firstOrNull<CategoryRecord>(
    db.prepare(
      `SELECT id, name, icon, parent_id, is_subcategory, weight, access_password_hash, created_at, updated_at
       FROM categories
       WHERE id = ?`
    ).bind(id)
  );
  return row ? toCategoryItem(row) : null;
}

export async function createCategory(db: D1Database, input: CategoryInput) {
  const timestamp = now();
  const category: CategoryRecord = {
    id: input.id ?? randomId(),
    name: input.name,
    icon: input.icon,
    parent_id: input.parentId ?? null,
    is_subcategory: input.isSubcategory ? 1 : 0,
    weight: input.weight ?? 0,
    access_password_hash: input.accessPasswordHash ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db.prepare(
    `INSERT INTO categories (id, name, icon, parent_id, is_subcategory, weight, access_password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    category.id,
    category.name,
    category.icon,
    category.parent_id,
    category.is_subcategory,
    category.weight,
    category.access_password_hash,
    category.created_at,
    category.updated_at,
  ).run();

  return toCategoryItem(category);
}

export async function updateCategory(
  db: D1Database,
  id: string,
  patch: Partial<CategoryInput>,
) {
  const timestamp = now();
  const existing = await getCategoryById(db, id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...patch,
    updatedAt: timestamp,
  };

  await db.prepare(
    `UPDATE categories
     SET name = ?, icon = ?, parent_id = ?, is_subcategory = ?, weight = ?, access_password_hash = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    updated.name,
    updated.icon,
    updated.parentId ?? null,
    updated.isSubcategory ? 1 : 0,
    updated.weight ?? 0,
    updated.accessPasswordHash ?? null,
    timestamp,
    id,
  ).run();

  return updated;
}

export async function deleteCategory(db: D1Database, id: string) {
  await db.prepare(`DELETE FROM categories WHERE id = ?`).bind(id).run();
}
