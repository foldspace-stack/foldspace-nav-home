import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

function stripJsonc(input: string) {
  return input
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('wrangler config', () => {
  it('declares a Worker entry, asset binding, and D1 binding', async () => {
    const raw = await readFile('wrangler.jsonc', 'utf8');
    const config = JSON.parse(stripJsonc(raw));

    expect(config.main).toBe('src/worker.ts');
    expect(config.assets.binding).toBe('ASSETS');
    expect(config.d1_databases[0].binding).toBe('DB');
  });
});
