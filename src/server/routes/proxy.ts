import type { Env } from '../env';

function responseWithHeaders(body: BodyInit | null, status: number, headers: HeadersInit) {
  return new Response(body, {
    status,
    headers,
  });
}

function corsHeaders(origin: string | null, contentType = 'application/json') {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return headers;
}

function isSafeUrl(target: URL) {
  return target.protocol === 'http:' || target.protocol === 'https:';
}

export async function routeProxyRequest(request: Request, _env: Env) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (request.method === 'OPTIONS') {
    return responseWithHeaders(null, 204, corsHeaders(request.headers.get('Origin')));
  }

  if (!targetUrl) {
    return responseWithHeaders(JSON.stringify({ error: 'Missing url parameter' }), 400, corsHeaders(request.headers.get('Origin')));
  }

  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    return responseWithHeaders(JSON.stringify({ error: 'Invalid url parameter' }), 400, corsHeaders(request.headers.get('Origin')));
  }

  if (!isSafeUrl(target)) {
    return responseWithHeaders(JSON.stringify({ error: 'Unsupported url protocol' }), 400, corsHeaders(request.headers.get('Origin')));
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CloudNav/1.0)',
      'Accept': 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  if (!upstream.ok) {
    return responseWithHeaders(JSON.stringify({ error: `Upstream request failed: ${upstream.status}` }), upstream.status, corsHeaders(request.headers.get('Origin')));
  }

  const headers = new Headers(upstream.headers);
  headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
  headers.set('Vary', 'Origin');
  headers.set('Cache-Control', 'public, max-age=86400');

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
