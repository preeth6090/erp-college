import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Saves an uploaded file under public/uploads/<dir> and returns its public URL path. */
export async function saveUpload(file: FormDataEntryValue | null, dir: string, maxBytes = 2 * 1024 * 1024): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (file.size > maxBytes) throw new Error(`File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8);
  const name = `${randomUUID()}${ext}`;
  const folder = path.join(process.cwd(), 'public', 'uploads', dir);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${dir}/${name}`;
}
