import { formatBytes } from './format-bytes';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const SOFT_WARN_BYTES = 5 * 1024 * 1024;
/**
 * Text formats the editor can hold. Beyond JSON this covers the sources the
 * reverse converters read (CSV/TSV, YAML, XML) — every one of them is plain
 * text, so the allowlist only exists to catch obvious mistakes like dropping a
 * PDF or an image on the editor.
 */
const ALLOWED_MIME = new Set([
  'application/json', 'text/json', 'text/plain', '',
  'text/csv', 'text/tab-separated-values',
  'text/yaml', 'application/yaml', 'application/x-yaml',
  'application/xml', 'text/xml',
]);
const ALLOWED_EXT = /\.(json|jsonc|ndjson|txt|csv|tsv|yaml|yml|xml)$/i;

export interface UploadResult {
  ok: true;
  name: string;
  text: string;
  bytes: number;
}
export interface UploadFailure {
  ok: false;
  reason: 'too-large' | 'bad-type' | 'read-error' | 'empty';
  message: string;
}

export async function readTextFile(file: File): Promise<UploadResult | UploadFailure> {
  if (file.size === 0) return { ok: false, reason: 'empty', message: 'File is empty.' };
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: 'too-large',
      message: `File exceeds the 50 MB limit (${formatBytes(file.size)}).`,
    };
  }
  const typeOk = ALLOWED_MIME.has(file.type) || ALLOWED_EXT.test(file.name);
  if (!typeOk) {
    return {
      ok: false,
      reason: 'bad-type',
      message: `Unsupported file type: ${file.type || 'unknown'}. Use a text file (.json, .csv, .yaml, .xml, .txt).`,
    };
  }
  try {
    const text = await file.text();
    return { ok: true, name: file.name, text, bytes: file.size };
  } catch {
    return { ok: false, reason: 'read-error', message: 'Could not read the file.' };
  }
}
