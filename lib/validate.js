import path from 'node:path';
import { z } from 'zod';

export const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash'
];

export const startSchema = z.object({
  projectName: z.string().min(3).max(50),
  description: z.string().min(20).max(7000),
  framework: z.enum(['vanilla']).default('vanilla'),
  model: z.enum(GEMINI_MODELS).default('gemini-3.5-flash-lite'),
  useSupabase: z.boolean().default(true),
  privateRepo: z.boolean().default(true)
});

export function slug(value) {
  const result = String(value).toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (result.length < 3 || result.length > 50) throw new Error('Project name must become a 3-50 character slug');
  return result;
}

const forbiddenPathParts = ['..', '.env', '.git/', 'node_modules/'];
const secretPatterns = [
  /GEMINI_API_KEY\s*=/i,
  /GITHUB_TOKEN\s*=/i,
  /VERCEL_TOKEN\s*=/i,
  /SERVICE_ROLE/i,
  /sbp_[a-z0-9_-]{20,}/i
];

export function validateFiles(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 60) throw new Error('Generated files count is invalid');
  const seen = new Set();
  return files.map((file) => {
    const normalized = path.posix.normalize(String(file.path || ''));
    if (!normalized || normalized.startsWith('/') || forbiddenPathParts.some((x) => normalized.includes(x))) throw new Error(`Unsafe path: ${normalized}`);
    if (seen.has(normalized)) throw new Error(`Duplicate path: ${normalized}`);
    if (Buffer.byteLength(String(file.content || ''), 'utf8') > 180000) throw new Error(`File too large: ${normalized}`);
    if (secretPatterns.some((pattern) => pattern.test(String(file.content || '')))) throw new Error(`Possible secret in ${normalized}`);
    seen.add(normalized);
    return { path: normalized, content: String(file.content || '') };
  });
}

export function validateSql(sql) {
  const text = String(sql || '').trim();
  if (!text) return '';
  const blocked = [/drop\s+database/i, /drop\s+role/i, /alter\s+role/i, /grant\s+.*\s+to\s+public/i, /disable\s+row\s+level\s+security/i, /security\s+definer/i];
  if (blocked.some((pattern) => pattern.test(text))) throw new Error('Generated SQL contains a blocked statement');
  return text;
}
