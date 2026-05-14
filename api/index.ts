import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "../dist/server/server.js");

let serverEntry: { fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response } | undefined;

async function getServerEntry() {
  if (!serverEntry) {
    const module = await import(serverPath);
    serverEntry = module.default;
  }
  return serverEntry;
}

function nodeHeadersToFetchHeaders(nodeHeaders: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

export default async function handler(req: any, res: any) {
  try {
    // Get the full URL from Vercel's request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;

    const request = new Request(url, {
      method: req.method,
      headers: nodeHeadersToFetchHeaders(req.headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
    });

    const server = await getServerEntry();
    if (!server) {
      throw new Error('Server entry not found');
    }
    const response = await server.fetch(request, {}, {});

    const headers: Record<string, string | string[]> = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        const existing = headers["Set-Cookie"];
        headers["Set-Cookie"] = existing
          ? Array.isArray(existing)
            ? [...existing, value]
            : [existing, value]
          : value;
      } else {
        headers[key] = value;
      }
    });

    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, headers);
    res.end(body);
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}