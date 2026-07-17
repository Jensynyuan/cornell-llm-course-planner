const MAX_ZIP_BYTES = 15 * 1024 * 1024;
const MAX_UNZIPPED_BYTES = 30 * 1024 * 1024;
const MAX_ENTRIES = 200;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function findEndOfCentralDirectory(bytes) {
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true) === 0x06054b50) return offset;
  }
  throw new Error("未找到 ZIP 目录；请上传标准 .zip 文件");
}

function assertBounds(bytes, start, length, name = "ZIP 条目") {
  if (start < 0 || length < 0 || start + length > bytes.length) throw new Error(`${name} 损坏`);
}

function allowedEntryName(name) {
  const normalized = name.replace(/\\/g, "/");
  return /\.(?:json|csv)$/i.test(normalized) && !/(^|\/)(?:__MACOSX|\.|\.\.)(?:\/|$)/.test(normalized) && !normalized.includes("../");
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== "function") throw new Error("当前部署运行环境不支持 ZIP 解压，请上传 JSON 或 CSV 文件");
  const decompressed = new Response(bytes).body.pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}

async function zipEntries(bytes) {
  const eocd = findEndOfCentralDirectory(bytes);
  const end = new DataView(bytes.buffer, bytes.byteOffset + eocd, bytes.length - eocd);
  if (end.getUint16(4, true) !== 0 || end.getUint16(6, true) !== 0) throw new Error("不支持多磁盘 ZIP 文件");
  const entryCount = end.getUint16(10, true);
  const directoryOffset = end.getUint32(16, true);
  if (entryCount === 0xffff || directoryOffset === 0xffffffff) throw new Error("不支持 ZIP64 文件；请重新创建普通 ZIP");
  if (entryCount > MAX_ENTRIES) throw new Error(`压缩包条目超过 ${MAX_ENTRIES} 个`);
  let cursor = directoryOffset;
  let totalUnzipped = 0;
  const textDecoder = new TextDecoder("utf-8", { fatal: true });
  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    assertBounds(bytes, cursor, 46);
    const directory = new DataView(bytes.buffer, bytes.byteOffset + cursor, 46);
    if (directory.getUint32(0, true) !== 0x02014b50) throw new Error("ZIP 目录损坏");
    const flags = directory.getUint16(8, true);
    const method = directory.getUint16(10, true);
    const compressedSize = directory.getUint32(20, true);
    const uncompressedSize = directory.getUint32(24, true);
    const nameLength = directory.getUint16(28, true);
    const extraLength = directory.getUint16(30, true);
    const commentLength = directory.getUint16(32, true);
    const localOffset = directory.getUint32(42, true);
    assertBounds(bytes, cursor + 46, nameLength + extraLength + commentLength);
    const name = textDecoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!allowedEntryName(name)) continue;
    if (flags & 1) throw new Error(`不支持加密 ZIP 条目：${name}`);
    if (![0, 8].includes(method)) continue;
    totalUnzipped += uncompressedSize;
    if (totalUnzipped > MAX_UNZIPPED_BYTES) throw new Error("压缩包解压后超过 30 MB");
    assertBounds(bytes, localOffset, 30, `ZIP 条目 ${name}`);
    const local = new DataView(bytes.buffer, bytes.byteOffset + localOffset, 30);
    if (local.getUint32(0, true) !== 0x04034b50) throw new Error(`ZIP 条目损坏：${name}`);
    const localNameLength = local.getUint16(26, true);
    const localExtraLength = local.getUint16(28, true);
    const compressedStart = localOffset + 30 + localNameLength + localExtraLength;
    assertBounds(bytes, compressedStart, compressedSize, `ZIP 条目 ${name}`);
    const packed = bytes.subarray(compressedStart, compressedStart + compressedSize);
    const unpacked = method === 0 ? packed : await inflateRaw(packed);
    if (unpacked.byteLength !== uncompressedSize) throw new Error(`ZIP 条目长度不匹配：${name}`);
    entries.push({ name, text: textDecoder.decode(unpacked) });
  }
  if (!entries.length) throw new Error("压缩包中未找到 JSON 或 CSV 课程文件");
  return entries;
}

export async function onRequestPost(context) {
  try {
    const contentLength = Number(context.request.headers.get("content-length") || 0);
    if (contentLength > MAX_ZIP_BYTES) return json({ error: "压缩包超过 15 MB" }, 413);
    const bytes = new Uint8Array(await context.request.arrayBuffer());
    if (bytes.byteLength > MAX_ZIP_BYTES) return json({ error: "压缩包超过 15 MB" }, 413);
    return json({ ok: true, entries: await zipEntries(bytes) });
  } catch (error) {
    return json({ error: error?.message || "压缩包读取失败" }, 400);
  }
}

export function onRequest() {
  return json({ error: "仅支持 POST" }, 405);
}
