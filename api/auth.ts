// Vercel 认证接口
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getKV, getCorsHeaders, generateSecureToken, calcExpiryTtl } from './_kvHelper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsHeaders = getCorsHeaders();

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const kv = getKV();
    const { password } = req.body;

    if (!process.env.PASSWORD) {
      return res.status(500).json({ error: '服务器未配置管理员密码' });
    }

    if (password !== process.env.PASSWORD) {
      return res.status(401).json({ error: '密码错误' });
    }

    const token = generateSecureToken();

    let expirationTtl = 24 * 60 * 60;
    try {
      const configStr = await kv.get('config');
      if (configStr) {
        const config = JSON.parse(configStr);
        const expiry = config.website?.passwordExpiry;
        if (expiry) {
          expirationTtl = calcExpiryTtl(expiry);
        }
      }
    } catch (e) {
      console.warn('Failed to read expiry config:', e);
    }

    await kv.set('last_auth_time', Date.now().toString());
    if (expirationTtl) {
      await kv.set(`auth_token:${token}`, 'valid', { ex: expirationTtl });
    } else {
      await kv.set(`auth_token:${token}`, 'valid');
    }

    return res.status(200).json({ success: true, token, message: '认证成功' });

  } catch (err) {
    console.error('Auth API error:', err);
    return res.status(500).json({ error: '认证请求失败' });
  }
}
