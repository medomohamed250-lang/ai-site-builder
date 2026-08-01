import { json, requireMethod } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  const names = [
    'GEMINI_API_KEY', 'BUILDER_SUPABASE_URL', 'BUILDER_SUPABASE_SERVICE_ROLE_KEY',
    'GITHUB_TOKEN', 'GITHUB_OWNER', 'VERCEL_TOKEN'
  ];
  const optional = ['SUPABASE_MANAGEMENT_TOKEN', 'SUPABASE_ORGANIZATION_ID', 'SUPABASE_DEFAULT_REGION'];
  return json(res, 200, {
    ok: names.every((name) => Boolean(process.env[name])),
    configured: Object.fromEntries(names.map((name) => [name, Boolean(process.env[name])])),
    targetSupabaseConfigured: optional.every((name) => Boolean(process.env[name]))
  });
}
