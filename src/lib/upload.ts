export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const SOFT_WARN_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/json', 'text/plain', 'text/json', '']);
const ALLOWED_EXT = /\.(json|txt|jsonc|ndjson)$/i;

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
      message: `File exceeds the 50 MB limit (${(file.size / 1_000_000).toFixed(1)} MB).`,
    };
  }
  const typeOk = ALLOWED_MIME.has(file.type) || ALLOWED_EXT.test(file.name);
  if (!typeOk) {
    return {
      ok: false,
      reason: 'bad-type',
      message: `Unsupported file type: ${file.type || 'unknown'}. Use .json or .txt.`,
    };
  }
  try {
    const text = await file.text();
    return { ok: true, name: file.name, text, bytes: file.size };
  } catch {
    return { ok: false, reason: 'read-error', message: 'Could not read the file.' };
  }
}
