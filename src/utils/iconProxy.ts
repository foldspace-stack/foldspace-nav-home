export function proxyIconUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/')) return url;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}
