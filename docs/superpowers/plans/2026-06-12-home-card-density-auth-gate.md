# 首页卡片紧凑化与登录门禁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页链接卡片的内边距和整体展示区更紧凑，并且未登录时不能直接进入首页内容。

**Architecture:** 通过收紧 `LinkCard`、`CategorySection`、`PinnedSection` 和首页内容容器的 Tailwind 间距类来降低视觉密度；再在 `AppLayout` 中新增一个未登录前屏，利用现有 `AuthContext` 的登录状态拦截主内容区渲染。登录成功后恢复原首页，不改动后端鉴权协议。

**Tech Stack:** React, TypeScript, Tailwind CSS, existing auth context and modal components.

---

### Task 1: Tighten card and homepage spacing

**Files:**
- Modify: `src/components/link/LinkCard.tsx`
- Modify: `src/components/category/CategorySection.tsx`
- Modify: `src/components/link/PinnedSection.tsx`
- Modify: `src/components/layout/MainContent.tsx`
- Modify: `src/components/layout/ContentSkeleton.tsx`

- [ ] **Step 1: Reduce padding and grid gaps**

```tsx
// Example target changes:
// - detailed card padding from `p-4` to `p-3`
// - compact card padding from `p-3` to `p-2.5`
// - section grid gap from `gap-3` to `gap-2`
// - main container padding from `p-4 lg:p-8` to `p-3 lg:p-5`
```

- [ ] **Step 2: Verify the homepage still renders with existing layouts**

Run: `pnpm test`
Expected: pass, with only the spacing classes changed.

- [ ] **Step 3: Commit**

```bash
git add src/components/link/LinkCard.tsx src/components/category/CategorySection.tsx src/components/link/PinnedSection.tsx src/components/layout/MainContent.tsx src/components/layout/ContentSkeleton.tsx
git commit -m "style: tighten homepage card spacing"
```

### Task 2: Gate homepage behind login

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add a pre-login gate for the main layout**

```tsx
// Pseudocode target:
// if not authenticated and auth is required, render a centered login screen
// that reuses AuthModal and blocks the sidebar/main content until login succeeds.
```

- [ ] **Step 2: Make sure authenticated users still see the normal app shell**

Run: `pnpm test`
Expected: pass, with login gate covered by the existing auth flow.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: require login before entering home"
```

### Self-Review

**Spec coverage**
- Card padding tightened: covered by Task 1.
- Homepage card section tightened: covered by Task 1.
- Homepage requires login: covered by Task 2.

**Placeholder scan**
- No placeholders remain in task descriptions.

**Type consistency**
- Uses existing `AuthContext` state and `AuthModal` props only, so no new cross-file API needs to be invented.
