#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const supabaseUrl = String(process.env.SUPABASE_API_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "media";
const directory = (process.env.SUPABASE_DIRECTORY || "uploads").replace(/^\/+|\/+$/g, "");
const backupDir = resolve(process.env.MEDIA_BACKUP_DIR || "../referenced-chatgpt-conversation-this-is-an/outputs/suremandarin-strapi/public/uploads");

if (!supabaseUrl || !serviceKey) {
  console.error("请先设置 SUPABASE_API_URL 和 SUPABASE_API_KEY（service_role 密钥）。");
  process.exit(1);
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
const filesResponse = await fetch(`${supabaseUrl}/rest/v1/files?select=id,name,url,hash,formats&provider=eq.strapi-provider-upload-supabase-bucket`, { headers });
if (!filesResponse.ok) throw new Error(`读取媒体记录失败：${filesResponse.status} ${await filesResponse.text()}`);
const files = await filesResponse.json();
const backupNames = new Set(await readdir(backupDir));
let uploaded = 0;
let skipped = 0;

for (const file of files) {
  // Strapi's original display name uses hyphens while the generated upload
  // filename in `url` uses underscores plus the hash. Match either form.
  const urlName = String(file.url || '').split('/').pop() || '';
  const normalized = file.name.replaceAll('-', '_');
  const candidates = [file.name, urlName, normalized];
  const localName = candidates.find((candidate) => backupNames.has(candidate));
  if (!localName) {
    console.warn(`跳过（本地备份中不存在）：${file.name}；已检查 ${candidates.join(', ')}`);
    skipped += 1;
    continue;
  }
  const localPath = join(backupDir, localName);
  const fileStat = await stat(localPath);
  const bytes = await readFile(localPath);
const objectPath = `${directory}/${localName}`;
  const contentType = localName.endsWith(".webp") ? "image/webp" : localName.endsWith(".png") ? "image/png" : localName.endsWith(".jpg") || localName.endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream";
  const upload = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!upload.ok) throw new Error(`上传失败 ${file.name}：${upload.status} ${await upload.text()}`);

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  const update = await fetch(`${supabaseUrl}/rest/v1/files?id=eq.${file.id}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ url: publicUrl, provider: "strapi-provider-upload-supabase-bucket", size: fileStat.size }),
  });
  if (!update.ok) throw new Error(`更新媒体记录失败 ${file.name}：${update.status} ${await update.text()}`);

  // Migrate Strapi's generated thumbnails as well. The admin Media Library
  // usually renders `formats.thumbnail` first, so leaving those URLs local
  // makes the library appear empty even when the original file is present.
  const formats = file.formats && typeof file.formats === 'object' ? file.formats : {};
  const updatedFormats = {};
  for (const [formatName, format] of Object.entries(formats)) {
    if (!format || typeof format !== 'object' || !format.url) continue;
    const formatUrlName = String(format.url).split('/').pop() || '';
    const formatCandidates = [formatUrlName, String(format.hash || '') + String(format.ext || '')];
    const formatLocalName = formatCandidates.find((candidate) => backupNames.has(candidate));
    if (!formatLocalName) {
      console.warn(`跳过缩略图（本地备份中不存在）：${formatUrlName}`);
      updatedFormats[formatName] = { ...format, url: publicUrl };
      continue;
    }
    const formatBytes = await readFile(join(backupDir, formatLocalName));
    const formatPath = `${directory}/${formatLocalName}`;
    const formatUpload = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${formatPath}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
      body: formatBytes,
    });
    if (!formatUpload.ok) throw new Error(`缩略图上传失败 ${formatLocalName}：${formatUpload.status} ${await formatUpload.text()}`);
    updatedFormats[formatName] = { ...format, url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${formatPath}` };
  }
  if (Object.keys(updatedFormats).length) {
    const formatUpdate = await fetch(`${supabaseUrl}/rest/v1/files?id=eq.${file.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ formats: updatedFormats }),
    });
    if (!formatUpdate.ok) throw new Error(`更新缩略图记录失败 ${file.name}：${formatUpdate.status} ${await formatUpdate.text()}`);
  }
  uploaded += 1;
  console.log(`已恢复 ${uploaded}/${files.length}：${file.name} ← ${localName}`);
}

console.log(`恢复完成：${uploaded} 条，跳过 ${skipped} 条。`);
