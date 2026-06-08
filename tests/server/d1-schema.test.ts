import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('d1 schema', () => {
  it('creates users, sessions, categories, sites, and settings tables', async () => {
    const sql = await readFile('migrations/0001_init.sql', 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sessions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS categories');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sites');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS settings');
  });
});
