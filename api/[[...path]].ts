/**
 * Vercel serverless catch-all for /api/*. All API requests are handled by the
 * shared Express app (api-only, no static/Vite). Static SPA is served by Vercel from dist/public.
 */
import serverless from "serverless-http";
import { createApp } from "../server/index";

let handler: ReturnType<typeof serverless> | null = null;

async function getHandler() {
  if (!handler) {
    const { app } = await createApp({ apiOnly: true });
    handler = serverless(app);
  }
  return handler;
}

export default async function vercelHandler(
  req: import("http").IncomingMessage,
  res: import("http").ServerResponse
) {
  const h = await getHandler();
  return h(req, res);
}
