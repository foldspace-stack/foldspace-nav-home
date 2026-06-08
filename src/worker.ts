import { handleRequest } from './server/http';
import type { Env } from './server/env';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    return handleRequest(request, env, _ctx);
  },
};
