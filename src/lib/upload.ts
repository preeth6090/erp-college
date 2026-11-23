import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';

/**
 * Saves an uploaded file and returns its public URL.
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production); otherwise saves under public/uploads (local dev).
 */
export async function saveUpload(file: FormDataEntryValue | null, dir: string, maxBytes = 2 * 1024 * 1024): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (file.size > maxBytes) throw new Error(`File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8);
  const name = `${randomUUID()}${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${dir}/${name}`, file, { access: 'public', addRandomSuffix: false });
    return blob.url;
  }
  const folder = path.join(process.cwd(), 'public', 'uploads', dir);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${dir}/${name}`;
}
