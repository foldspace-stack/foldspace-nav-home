# Cloudflare vinext + D1 后台管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前导航站改造成单一 Cloudflare Workers 应用，使用 D1 持久化网站、分类、用户和会话，实现后台添加网站、后台管理、简单用户创建与登录，并可直接通过 Cloudflare Workers 构建和部署。

**Architecture:** 保留现有 React 前端作为访客页和后台 UI，但把所有可写状态从 KV/localStorage 统一迁移到 D1。Worker 负责静态资源兜底、认证、权限校验和 REST API，前端通过统一 API 层与后端通信，避免组件直接写存储。这里把 `vinext` 视为 Cloudflare/Workers 的项目骨架与部署入口，而不是把整套 UI 改写成 Next.js 风格页面。所有新增后台页面、弹窗和表单都必须沿用当前项目已有的布局、交互和视觉逻辑，不引入新的设计语言。迁移完成并验证稳定后，再做旧实现清理。

**Tech Stack:** React 19, TypeScript, Vite, Cloudflare Workers, D1, Wrangler, vinext, Web Crypto, Vitest, `@cloudflare/vitest-pool-workers`

---

### Task 1: Cloudflare Worker 基线和项目骨架

**Files:**
- Create: `wrangler.jsonc`
- Create: `src/worker.ts`
- Create: `src/server/env.ts`
- Create: `src/server/http.ts`
- Create: `src/server/routes/index.ts`
- Modify: `package.json`
- Modify: `README.md`
- Test: `tests/worker/wrangler-config.test.ts`

- [ ] **Step 1: 写一个会失败的配置测试**

```ts
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
```

- [ ] **Step 2: 运行测试确认它失败**

Run: `pnpm vitest tests/worker/wrangler-config.test.ts -v`

Expected: fail because `wrangler.jsonc` does not exist yet.

- [ ] **Step 3: 落地 Worker 入口和部署配置**

`wrangler.jsonc`:

```jsonc
{
  "name": "foldspace-nav-home",
  "main": "src/worker.ts",
  "compatibility_date": "2026-06-08",
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "foldspace-nav-home"
    }
  ],
  "vars": {
    "APP_NAME": "foldspace 组织导航"
  }
}
```

`src/worker.ts`:

```ts
import { handleRequest } from './server/http';
import type { Env } from './server/env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleRequest(request, env, ctx);
  },
};
```

`src/server/http.ts`:

```ts
import { handleApiRequest } from './routes/index';
import type { Env } from './env';

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request, env, ctx);
  }

  return env.ASSETS.fetch(request);
}
```

`src/server/env.ts`:

```ts
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_NAME: string;
  SESSION_COOKIE_NAME?: string;
}
```

`src/server/routes/index.ts`:

```ts
export async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext) {
  return new Response(JSON.stringify({ error: 'API not wired yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:worker": "wrangler dev",
    "build": "vite build",
    "deploy": "wrangler deploy",
    "d1:migrate": "wrangler d1 migrations apply foldspace-nav-home",
    "d1:migrate:local": "wrangler d1 migrations apply foldspace-nav-home --local",
    "types:worker": "wrangler types"
  }
}
```

- [ ] **Step 4: 重新跑一次测试和打包检查**

Run:

```bash
pnpm vitest tests/worker/wrangler-config.test.ts -v
pnpm build
pnpm wrangler deploy --dry-run
```

Expected:
- `wrangler-config.test.ts` passes.
- `pnpm build` produces `dist/`.
- `wrangler deploy --dry-run` shows the Worker bundle and `DB` binding, without touching production.

- [ ] **Step 5: 提交这一层骨架**

```bash
git add wrangler.jsonc src/worker.ts src/server/http.ts src/server/env.ts src/server/routes/index.ts package.json README.md tests/worker/wrangler-config.test.ts
git commit -m "chore: add cloudflare worker baseline"
```

---

### Task 2: D1 数据模型、迁移和仓储层

**Files:**
- Create: `migrations/0001_init.sql`
- Create: `src/server/db.ts`
- Create: `src/server/repositories/users.ts`
- Create: `src/server/repositories/sessions.ts`
- Create: `src/server/repositories/categories.ts`
- Create: `src/server/repositories/sites.ts`
- Create: `src/server/repositories/settings.ts`
- Modify: `types.ts`
- Test: `tests/server/d1-schema.test.ts`

- [ ] **Step 1: 写一个会失败的 schema 测试**

```ts
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
```

- [ ] **Step 2: 运行测试确认它失败**

Run: `pnpm vitest tests/server/d1-schema.test.ts -v`

Expected: fail because migration file does not exist yet.

- [ ] **Step 3: 写 D1 迁移和仓储封装**

`migrations/0001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  parent_id TEXT,
  is_subcategory INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0,
  access_password_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  pinned INTEGER NOT NULL DEFAULT 0,
  pinned_order INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_category_sort ON sites(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
```

`src/server/db.ts`:

```ts
export function now() {
  return Date.now();
}

export async function getJson<T>(stmt: D1PreparedStatement): Promise<T | null> {
  const row = await stmt.first<{ value: string }>();
  if (!row?.value) return null;
  return JSON.parse(row.value) as T;
}
```

`src/server/repositories/sites.ts`:

```ts
export async function listSites(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT id, title, url, description, icon, category_id, pinned, pinned_order, sort_order, created_by, created_at, updated_at
       FROM sites
       ORDER BY pinned DESC, pinned_order ASC, sort_order ASC, created_at DESC`
    )
    .all();
  return results;
}
```

`src/server/repositories/users.ts`:

```ts
export async function listUsers(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT id, username, display_name, role, status, created_at, updated_at, last_login_at
       FROM users
       ORDER BY created_at ASC`
    )
    .all();
  return results;
}
```

`types.ts` adds worker-facing entities without breaking the existing link/category UI:

```ts
export interface UserItem {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'disabled';
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number | null;
}

export interface SessionItem {
  id: string;
  userId: string;
  expiresAt: number;
}
```

- [ ] **Step 4: 跑迁移和 schema 测试**

Run:

```bash
pnpm wrangler d1 migrations apply foldspace-nav-home --local
pnpm vitest tests/server/d1-schema.test.ts -v
```

Expected:
- D1 本地库能成功创建表。
- schema 测试通过。

- [ ] **Step 5: 提交数据层**

```bash
git add migrations/0001_init.sql src/server/db.ts src/server/repositories types.ts tests/server/d1-schema.test.ts
git commit -m "feat: add d1 schema and repositories"
```

---

### Task 3: 认证、会话和用户管理

**Files:**
- Create: `src/server/auth/password.ts`
- Create: `src/server/routes/auth.ts`
- Create: `src/server/routes/users.ts`
- Modify: `src/server/routes/index.ts`
- Create: `components/UserManagerModal.tsx`
- Modify: `components/AuthModal.tsx`
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `components/SettingsModal.tsx`
- Test: `tests/server/auth.test.ts`

- [ ] **Step 1: 写一个会失败的认证测试**

```ts
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/server/auth/password';

describe('password hashing', () => {
  it('verifies the same password and rejects a different one', async () => {
    const hashed = await hashPassword('CorrectHorseBatteryStaple');
    await expect(verifyPassword('CorrectHorseBatteryStaple', hashed)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hashed)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认它失败**

Run: `pnpm vitest tests/server/auth.test.ts -v`

Expected: fail because `src/server/auth/password.ts` does not exist yet.

- [ ] **Step 3: 实现基于 Web Crypto 的密码和会话**

`src/server/auth/password.ts`:

```ts
const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(input: string) {
  return Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    key,
    256,
  );

  return `pbkdf2$120000$${toBase64(salt)}$${toBase64(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [, iterationsStr, saltB64, hashB64] = encoded.split('$');
  const iterations = Number(iterationsStr);
  const salt = fromBase64(saltB64);
  const expected = hashB64;

  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );

  return toBase64(new Uint8Array(derived)) === expected;
}
```

`src/server/routes/auth.ts` should expose:

```ts
POST /api/auth/bootstrap
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Behavior:
- `bootstrap` can create the first admin only when `users` is empty.
- `login` accepts `{ username, password }`, validates the password hash, creates a session row, and sets an `httpOnly` cookie.
- `me` reads the session cookie, loads the user, and returns `{ user }`.
- `logout` revokes the session and clears the cookie.

`src/contexts/AuthContext.tsx` changes state from `authToken` to `user`:

```ts
interface AuthState {
  user: UserItem | null;
  requiresAuth: boolean | null;
  isCheckingAuth: boolean;
}
```

And login should stop writing secrets into localStorage:

```ts
await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username, password }),
});
```

`components/AuthModal.tsx` should switch from password-only to username + password and handle the bootstrap path:

```tsx
<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
<input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" type="password" />
```

`components/UserManagerModal.tsx` should support:
- 创建用户
- 修改角色
- 禁用/启用
- 重置密码

`src/server/routes/index.ts` should be narrowed to auth and user routes at this stage:

```ts
import { routeAuthRequest } from './auth';
import { routeUserRequest } from './users';
import type { Env } from '../env';

export async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/auth')) return routeAuthRequest(request, env, ctx);
  if (url.pathname.startsWith('/api/users')) return routeUserRequest(request, env, ctx);

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 4: 跑认证测试和一次本地登录流**

Run:

```bash
pnpm vitest tests/server/auth.test.ts -v
pnpm wrangler dev
```

Expected:
- 密码哈希测试通过。
- `wrangler dev` 下可以先 bootstrap 第一个 admin，再登录进入后台。

- [ ] **Step 5: 提交认证和用户模块**

```bash
git add src/server/auth/password.ts src/server/routes/auth.ts src/server/routes/users.ts src/server/routes/index.ts components/AuthModal.tsx components/UserManagerModal.tsx src/contexts/AuthContext.tsx src/components/layout/AppLayout.tsx components/SettingsModal.tsx tests/server/auth.test.ts
git commit -m "feat: add session auth and user management"
```

---

### Task 4: 网站、分类和后台管理迁移到 D1

**Files:**
- Create: `src/server/routes/sites.ts`
- Create: `src/server/routes/categories.ts`
- Create: `src/server/routes/settings.ts`
- Modify: `src/server/routes/index.ts`
- Create: `components/AdminDashboard.tsx`
- Modify: `components/LinkModal.tsx`
- Modify: `components/CategoryManagerModal.tsx`
- Modify: `components/SettingsModal.tsx`
- Modify: `src/hooks/useDataSync.ts`
- Modify: `src/contexts/LinksContext.tsx`
- Modify: `src/contexts/CategoriesContext.tsx`
- Modify: `src/utils/configManager.ts`
- Test: `tests/server/sites.test.ts`

- [ ] **Step 1: 写一个会失败的网站 CRUD 测试**

```ts
import { describe, expect, it } from 'vitest';
import { createSite, listSites } from '../../src/server/repositories/sites';

function makeDbMock() {
  const rows: any[] = [];
  const calls: { sql: string; params: unknown[] }[] = [];

  return {
    calls,
    rows,
    prepare(sql: string) {
      const call = { sql, params: [] as unknown[] };
      calls.push(call);
      return {
        bind(...params: unknown[]) {
          call.params = params;
          return this;
        },
        async run() {
          rows.push({
            id: call.params[0],
            title: call.params[1],
            url: call.params[2],
            description: call.params[3],
            icon: call.params[4],
            category_id: call.params[5],
            pinned: call.params[6],
            pinned_order: call.params[7],
            sort_order: call.params[8],
            created_by: call.params[9],
            created_at: call.params[10],
            updated_at: call.params[11],
          });
          return { success: true };
        },
        async all() {
          return { results: rows };
        },
      };
    },
  } as unknown as D1Database & { calls: { sql: string; params: unknown[] }[] };
}

describe('site repository contract', () => {
  it('inserts and lists sites in the Worker data model', async () => {
    const db = makeDbMock();
    const created = await createSite(db, {
      id: 'site-1',
      title: 'Docs',
      url: 'https://example.com',
      description: 'Cloud docs',
      icon: '',
      categoryId: 'common',
      pinned: 0,
      pinnedOrder: null,
      sortOrder: 0,
      createdBy: null,
      createdAt: 1,
      updatedAt: 1,
    });

    const sites = await listSites(db);

    expect(db.calls[0].sql).toContain('INSERT INTO sites');
    expect(created.title).toBe('Docs');
    expect(sites).toHaveLength(1);
    expect(sites[0].title).toBe('Docs');
  });
});
```

- [ ] **Step 2: 运行测试确认它失败**

Run: `pnpm vitest tests/server/sites.test.ts -v`

Expected: fail.

- [ ] **Step 3: 实现网站和分类 API，并把前端同步层切换过去**

`src/server/routes/sites.ts` should provide:

```ts
GET    /api/sites
POST   /api/sites
PATCH  /api/sites/:id
DELETE /api/sites/:id
```

Rules:
- Admin/editor 可以新增、编辑、删除网站。
- 网站实体仍然映射到现有 `LinkItem` 结构，前端不用一次性推倒重写。
- `category_id` 必须存在。
- `pinned`、`pinned_order`、`sort_order` 保持现有排序行为。

`src/server/routes/categories.ts` should provide:

```ts
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

Rules:
- 删除分类时，把该分类下的网站移动到默认分类 `common`。
- 保持父子分类结构，和现有 `CategoryManagerModal` 的 UI 行为一致。

`src/server/routes/settings.ts` should replace the old KV `config` blob with typed D1 rows:

```ts
GET  /api/settings/:key
PUT  /api/settings/:key
```

Recommended keys:
- `ai`
- `website`
- `search`
- `mastodon`
- `weather`
- `icon`
- `view`
- `ui`

`src/hooks/useDataSync.ts` should now boot from the API:

```ts
const res = await fetch('/api/bootstrap', { credentials: 'include' });
const data = await res.json();
initLinks(data.links);
initCategories(data.categories);
initConfig(data.config);
```

`src/contexts/LinksContext.tsx` and `src/contexts/CategoriesContext.tsx` should stop writing localStorage as the source of truth. Keep localStorage only as a read cache if needed, but every mutation must call the Worker API first, then refresh state from the response.

`components/AdminDashboard.tsx` should become the backend console:
- 网站管理
- 分类管理
- 用户管理
- 系统设置

It must reuse the current sidebar, header, modal, card, and button patterns. Reuse `LinkModal`, `CategoryManagerModal`, and `UserManagerModal` instead of creating duplicate form logic, and keep spacing, dark mode behavior, and action placement consistent with the existing UI.

`src/server/routes/index.ts` should expand to the full API surface now:

```ts
import { routeAuthRequest } from './auth';
import { routeUserRequest } from './users';
import { routeSiteRequest } from './sites';
import { routeCategoryRequest } from './categories';
import { routeSettingsRequest } from './settings';
import type { Env } from '../env';

export async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/auth')) return routeAuthRequest(request, env, ctx);
  if (url.pathname.startsWith('/api/users')) return routeUserRequest(request, env, ctx);
  if (url.pathname.startsWith('/api/sites')) return routeSiteRequest(request, env, ctx);
  if (url.pathname.startsWith('/api/categories')) return routeCategoryRequest(request, env, ctx);
  if (url.pathname.startsWith('/api/settings')) return routeSettingsRequest(request, env, ctx);

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 4: 跑网站 CRUD 测试和本地联调**

Run:

```bash
pnpm vitest tests/server/sites.test.ts -v
pnpm wrangler dev
```

Expected:
- 网站新增、编辑、删除能落到 D1。
- 前端刷新后仍能从 `/api/bootstrap` 重新拉回完整数据。

- [ ] **Step 5: 提交管理后台迁移**

```bash
git add src/server/routes/sites.ts src/server/routes/categories.ts src/server/routes/settings.ts src/server/routes/index.ts components/AdminDashboard.tsx components/LinkModal.tsx components/CategoryManagerModal.tsx components/SettingsModal.tsx src/hooks/useDataSync.ts src/contexts/LinksContext.tsx src/contexts/CategoriesContext.tsx src/utils/configManager.ts tests/server/sites.test.ts
git commit -m "feat: move site and category management to d1"
```

---

### Task 5: 清理过时实现和无关入口

**Dependency:** 只有在 Task 1 到 Task 4 的 D1 迁移、认证、后台管理和同步路径都完成并验证后，才能开始这一任务。清理阶段不接受任何“边迁移边删”的做法。

**Files:**
- Delete: `api/_kvHelper.ts`
- Delete: `api/auth.ts`
- Delete: `api/storage.ts`
- Delete: `api/link.ts`
- Delete: `functions/api/_kvAdapter.js`
- Delete: `functions/api/auth.js`
- Delete: `functions/api/storage.js`
- Delete: `functions/api/link.js`
- Delete: `functions/api/debug.js`
- Delete: `functions/api/webdav.js`
- Delete: `edgeone.json`
- Delete: `vercel.json`
- Delete: `src/utils/kvMock.ts`
- Modify: `src/constants/index.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/LinksContext.tsx`
- Modify: `src/contexts/CategoriesContext.tsx`
- Modify: `src/hooks/useDataSync.ts`
- Modify: `src/utils/configManager.ts`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `components/SettingsModal.tsx`
- Test: `tests/cleanup/legacy-paths.test.ts`

- [ ] **Step 1: 写一个会失败的遗留路径扫描测试**

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const files = [
  'src/constants/index.ts',
  'src/contexts/AuthContext.tsx',
  'src/contexts/LinksContext.tsx',
  'src/contexts/CategoriesContext.tsx',
  'src/hooks/useDataSync.ts',
  'src/utils/configManager.ts',
  'src/components/layout/AppLayout.tsx',
  'components/SettingsModal.tsx',
];

describe('legacy path cleanup', () => {
  it('removes KV token storage and old platform-specific API paths', async () => {
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      expect(text).not.toMatch(/x-auth-password|cloudnav_auth_token|auth_token:|CLOUDNAV_KV|vercel\.json|edgeone\.json|functions\/api|api\/storage|api\/link/);
    }
  });
});
```

- [ ] **Step 2: 运行测试确认它失败**

Run: `pnpm vitest tests/cleanup/legacy-paths.test.ts -v`

Expected: fail because the repository still contains legacy endpoint names, token storage, or platform-specific instructions.

- [ ] **Step 3: 删除旧实现并收窄剩余代码职责**

`src/constants/index.ts` should only expose the endpoints and keys still used by the Worker app:

```ts
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  SITES: '/api/sites',
  CATEGORIES: '/api/categories',
  SETTINGS: '/api/settings',
  BOOTSTRAP: '/api/bootstrap',
} as const;
```

`src/contexts/AuthContext.tsx` must stop persisting auth tokens in `localStorage`:

```ts
const login = useCallback(async (username: string, password: string): Promise<boolean> => {
  const res = await fetch(API_ENDPOINTS.AUTH + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  return res.ok;
}, []);
```

`src/utils/configManager.ts` should drop `syncToKV`, `syncFromKV`, and any `x-auth-password` header usage. Keep only pure config read/write helpers that talk to the new Worker API:

```ts
export async function loadConfig() {
  const res = await fetch(API_ENDPOINTS.SETTINGS + '/ui', { credentials: 'include' });
  return res.json();
}
```

`src/hooks/useDataSync.ts` should load from `/api/bootstrap` and stop reading legacy KV-shaped blobs from `localStorage`.

`src/components/layout/AppLayout.tsx` and `components/SettingsModal.tsx` should no longer reference old login token keys, old multi-platform sync flags, or the legacy password-sync flow.

Delete the old adapter and mock files outright:
- `api/*`
- `functions/api/*`
- `src/utils/kvMock.ts`
- `edgeone.json`
- `vercel.json`

- [ ] **Step 4: 运行清理后的扫描和构建检查**

Run:

```bash
pnpm vitest tests/cleanup/legacy-paths.test.ts -v
rg -n "x-auth-password|cloudnav_auth_token|auth_token:|CLOUDNAV_KV|functions/api|api/storage|api/link|edgeone.json|vercel.json" src components api functions . --glob '!node_modules'
pnpm build
```

Expected:
- `legacy-paths.test.ts` passes.
- `rg` returns no matches.
- `pnpm build` still succeeds after the cleanup.

- [ ] **Step 5: 提交清理收口**

```bash
git add src/constants/index.ts src/contexts/AuthContext.tsx src/contexts/LinksContext.tsx src/contexts/CategoriesContext.tsx src/hooks/useDataSync.ts src/utils/configManager.ts src/components/layout/AppLayout.tsx components/SettingsModal.tsx api functions edgeone.json vercel.json src/utils/kvMock.ts tests/cleanup/legacy-paths.test.ts
git commit -m "refactor: remove legacy kv and platform paths"
```

---

### Task 6: 完善部署文档和最终切换

**Dependency:** 只有在 Task 5 的旧实现清理通过测试、`rg` 扫描无残留、并且 `pnpm build` 成功之后，才能执行这一任务。Task 6 只负责文档和最终部署收口，不再引入新的业务代码。

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Test: `tests/e2e/admin-smoke.test.ts`

- [ ] **Step 1: 写一个最终切换的冒烟测试**

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('deployment contract', () => {
  it('documents the single Cloudflare Worker deployment path', async () => {
    const readme = await readFile('README.md', 'utf8');
    expect(readme).toContain('pnpm wrangler dev');
    expect(readme).toContain('pnpm wrangler deploy');
    expect(readme).toContain('D1');
  });
});
```

- [ ] **Step 2: 运行最终验证**

Run:

```bash
pnpm build
pnpm wrangler d1 migrations apply foldspace-nav-home --local
pnpm wrangler dev
pnpm wrangler deploy --dry-run
```

Expected:
- 静态资源构建成功。
- D1 迁移可重复执行。
- Worker 本地运行正常。
- Dry run 显示最终仅走 Cloudflare Workers + D1 路径。

- [ ] **Step 3: 更新 README 和部署说明**

`README.md` should now document only:
- Cloudflare Workers 本地开发: `pnpm wrangler dev`
- D1 本地迁移: `pnpm wrangler d1 migrations apply foldspace-nav-home --local`
- Cloudflare Dashboard 或 `wrangler deploy` 部署

It should remove or clearly mark the EdgeOne/Vercel instructions as legacy.

- [ ] **Step 4: 提交最终收口**

```bash
git add README.md package.json tests/e2e
git commit -m "chore: finalize cloudflare worker cutover"
```

---

## Coverage Check

- Cloudflare vinext / Worker 运行时: Task 1 and Task 5
- D1 数据库实现: Task 2
- 后台添加网站和后台管理: Task 4
- 简单用户添加和用户登录: Task 3
- 旧实现清理: Task 5
- Cloudflare Workers 构建和部署: Task 1 and Task 6

## Known Assumptions

- 我假设你要的是“单一 Cloudflare Workers 首发部署”的目标，而不是把整个前端路由体系重写成 Next.js App Router 风格。
- 我假设“网站”在业务上仍然等价于当前的 `LinkItem`，这样前端改动最小，迁移风险最低。
- 我假设第一版后台优先追求可用和可部署，而不是一次性把所有历史 KV 兼容逻辑都保留。
