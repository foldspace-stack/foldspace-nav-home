export function now() {
  return Date.now();
}

export function randomId() {
  return crypto.randomUUID();
}

export async function firstOrNull<T>(stmt: D1PreparedStatement) {
  const row = await stmt.first<T>();
  return row ?? null;
}

export async function allResults<T>(stmt: D1PreparedStatement) {
  const { results } = await stmt.all<T>();
  return results;
}
