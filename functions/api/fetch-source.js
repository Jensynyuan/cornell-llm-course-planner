const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function clientError(message, status = 400) {
  return json({ error: message }, status);
}

function isPrivateIpv4(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) || parts[0] >= 224;
}

function validatePublicSourceUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("数据源地址无效"); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!/^https?:$/.test(url.protocol)) throw new Error("只支持 HTTP 或 HTTPS 数据源");
  if (url.username || url.password) throw new Error("数据源地址不能包含用户名或密码");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "::1" || host.startsWith("fe80:") || isPrivateIpv4(host)) {
    throw new Error("不允许读取本机、内网或保留地址");
  }
  return url;
}

function safeRequestHeaders(input) {
  const headers = new Headers({ Accept: "application/json, text/plain;q=0.9, text/csv;q=0.8, */*;q=0.2" });
  for (const [key, value] of Object.entries(input || {})) {
    if (!/^(authorization|x-api-key|accept)$/i.test(key)) continue;
    if (typeof value !== "string" || value.length > 4096 || /[\r\n]/.test(value)) throw new Error(`请求头 ${key} 无效`);
    headers.set(key, value);
  }
  return headers;
}

async function fetchSource(url, headers, signal) {
  let target = validatePublicSourceUrl(url);
  const originalHost = target.host;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(target.toString(), { method: "GET", headers, redirect: "manual", signal });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("数据源重定向时未提供地址");
    target = validatePublicSourceUrl(new URL(location, target).toString());
    // Do not forward user-supplied credentials to another host.
    if (target.host !== originalHost && (headers.has("authorization") || headers.has("x-api-key"))) {
      throw new Error("携带 API 凭据的数据源不能重定向到其他域名");
    }
  }
  throw new Error("数据源重定向次数过多");
}

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) return clientError("请求内容过大", 413);
    const body = await request.json();
    const sourceUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!sourceUrl) return clientError("请填写 API 地址");
    const headers = safeRequestHeaders(body?.headers);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    let response;
    try { response = await fetchSource(sourceUrl, headers, controller.signal); }
    finally { clearTimeout(timer); }
    if (!response.ok) return clientError(`远程数据源返回 ${response.status}`, 502);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) return clientError("远程响应超过 15 MB", 413);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_RESPONSE_BYTES) return clientError("远程响应超过 15 MB", 413);
    return json({ ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), contentType: response.headers.get("content-type") || "" });
  } catch (error) {
    const message = error?.name === "AbortError" ? "远程数据源读取超时" : (error?.message || "API 读取失败");
    return clientError(message, 400);
  }
}

export function onRequest() {
  return clientError("仅支持 POST", 405);
}
