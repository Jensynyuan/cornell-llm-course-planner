import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY = 2_000_000;
const MAX_REMOTE = 15_000_000;
const MAX_ZIP = 15_000_000;
const MAX_UNZIPPED = 30_000_000;
const mime = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".md":"text/markdown; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png"
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error("请求内容过大")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new Error("请求不是有效 JSON")); }
    });
    req.on("error", reject);
  });
}

function readBinaryBody(req, limit = MAX_ZIP) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", chunk => { size += chunk.length; if (size > limit) { reject(new Error("压缩包超过 15 MB")); req.destroy(); return; } chunks.push(chunk); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function zipEntries(buffer) {
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) if (buffer.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  if (eocd < 0) throw new Error("未找到 ZIP 目录；请上传标准 .zip 文件");
  const count = buffer.readUInt16LE(eocd + 10), directoryOffset = buffer.readUInt32LE(eocd + 16);
  let cursor = directoryOffset, total = 0; const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("ZIP 目录损坏");
    const method = buffer.readUInt16LE(cursor + 10), compressedSize = buffer.readUInt32LE(cursor + 20), uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32), localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!/\.(?:json|csv)$/i.test(name) || /(^|\/)(?:__MACOSX|\.)/.test(name)) continue;
    total += uncompressedSize; if (total > MAX_UNZIPPED) throw new Error("压缩包解压后超过 30 MB");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`ZIP 条目损坏：${name}`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26), localExtraLength = buffer.readUInt16LE(localOffset + 28), start = localOffset + 30 + localNameLength + localExtraLength;
    const bytes = buffer.subarray(start, start + compressedSize);
    const body = method === 0 ? bytes : method === 8 ? inflateRawSync(bytes) : null;
    if (!body) continue;
    entries.push({ name, text:body.toString("utf8") });
  }
  if (!entries.length) throw new Error("压缩包中未找到 JSON 或 CSV 课程文件");
  return entries;
}

async function fetchExternalText(url, { headers = {}, accept = "application/json,text/plain;q=0.9,*/*;q=0.5", timeout = 25_000 } = {}) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("地址无效"); }
  if (!["http:","https:"].includes(parsed.protocol)) throw new Error("只支持 HTTP/HTTPS 数据源");
  const safeHeaders = {};
  for (const [key,value] of Object.entries(headers || {})) {
    if (/^(authorization|x-api-key|accept)$/i.test(key)) safeHeaders[key] = String(value);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(parsed, {
      headers:{ Accept:accept, "User-Agent":"Cornell-LLM-Course-Planner-v5.20", ...safeHeaders },
      signal:controller.signal,
      redirect:"follow"
    });
    if (!response.ok) throw new Error(`远程数据源返回 ${response.status}`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_REMOTE) throw new Error("远程响应超过 15 MB");
    const text = await response.text();
    if (Buffer.byteLength(text,"utf8") > MAX_REMOTE) throw new Error("远程响应超过 15 MB");
    return { text, contentType:response.headers.get("content-type") || "" };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("远程数据源读取超时");
    throw error;
  } finally { clearTimeout(timer); }
}

async function fetchExternalSource({ url, headers = {} }) {
  return fetchExternalText(url, { headers });
}

function decodeHtmlEntities(value) {
  const named = { amp:"&", lt:"<", gt:">", quot:'"', apos:"'", nbsp:" ", ndash:"–", mdash:"—" };
  return String(value || "")
    .replace(/&#(\d+);/g, (_,n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_,n) => String.fromCodePoint(parseInt(n,16)))
    .replace(/&([a-z]+);/gi, (all,name) => named[name.toLowerCase()] ?? all);
}

function htmlToRosterLines(html) {
  const text = String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/section|\/article|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(text)
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g," ").trim())
    .filter(Boolean);
}

const ROOM_PATTERNS = [
  /((?:Myron Taylor|Anabel Taylor|Goldwin Smith|Sage|Uris|Rockefeller|Morrill|McGraw|Ives|Olin|Gates|Malott|Statler|Hughes|Kennedy|Klarman|Bloomberg|Tata Innovation|Breazzano Family|Hollis E\. Cornell)[A-Za-z0-9 .&'()/-]{0,55}?(?:Hall|Center|Building|Auditorium|Library|House|Commons|Complex)\s+(?:[A-Z]?\d{1,4}[A-Za-z]?|G\d{1,3}|B\d{1,3}))/i,
  /([A-Z][A-Za-z0-9 .&'()/-]{2,65}\b(?:Hall|Center|Building|Auditorium|Library|House|Commons|Complex)\s+(?:[A-Z]?\d{1,4}[A-Za-z]?|G\d{1,3}|B\d{1,3}))/,
  /((?:Myron Taylor|Anabel Taylor|Goldwin Smith|Sage|Uris|Rockefeller|Morrill|McGraw|Ives|Olin|Gates|Malott|Statler|Hughes|Kennedy|Klarman|Bloomberg|Tata Innovation)[A-Za-z0-9 .&'()/-]{0,55}\b(?:Hall|Center|Building|Auditorium|Library|House|Commons|Complex))/i
];

function extractRoomFromLine(line) {
  const clean = String(line || "").replace(/\s+/g," ").trim();
  if (!clean || /(?:to be determined|room tba|location tba)/i.test(clean)) return "";
  for (const pattern of ROOM_PATTERNS) {
    const match = clean.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g," ").trim();
  }
  return "";
}

function extractRoomsFromRosterHtml(html, requestedSections) {
  const lines = htmlToRosterLines(html);
  const rooms = {};
  const knownNumbers = new Set(requestedSections.map(item => String(item.classNumber || "")).filter(Boolean));
  for (const item of requestedSections) {
    const number = String(item.classNumber || "");
    if (!number) continue;
    const exact = new RegExp(`(?:^|\\s)${number}(?:\\s|$)`);
    const start = lines.findIndex(line => exact.test(line) && (line.includes("LAW") || line === number || line.startsWith(`${number} `)));
    if (start < 0) continue;
    const window = [];
    for (let i = start; i < Math.min(lines.length, start + 28); i += 1) {
      if (i > start && [...knownNumbers].some(other => other !== number && new RegExp(`(?:^|\\s)${other}(?:\\s|$)`).test(lines[i]) && lines[i].includes("LAW"))) break;
      window.push(lines[i]);
    }
    for (const line of window) {
      const room = extractRoomFromLine(line);
      if (room) { rooms[number] = room; break; }
    }
  }
  return rooms;
}

const server = http.createServer(async (req,res) => {
  try {
    if (req.method === "POST" && req.url === "/api/fetch-source") {
      const body = await readJsonBody(req);
      const result = await fetchExternalSource(body);
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({ok:true,...result}));
      return;
    }
    if (req.method === "POST" && req.url === "/api/inspect-import-zip") {
      const entries = zipEntries(await readBinaryBody(req));
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
      res.end(JSON.stringify({ok:true, entries}));
      return;
    }
    const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//,"");
    const file = normalize(join(ROOT,rel));
    if (!file.startsWith(ROOT)) throw new Error("Invalid path");
    await stat(file);
    const body = await readFile(file);
    res.writeHead(200,{"Content-Type":mime[extname(file)] || "application/octet-stream","Cache-Control":"no-cache"});
    res.end(body);
  } catch (error) {
    const isApi = req.url?.startsWith("/api/");
    res.writeHead(isApi ? 500 : 404,{"Content-Type":isApi ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"});
    res.end(isApi ? JSON.stringify({error:error.message}) : "Not found");
  }
});
server.listen(PORT,"127.0.0.1",()=>console.log(`Cornell LL.M. Course Planner v5.20: http://127.0.0.1:${PORT}`));
