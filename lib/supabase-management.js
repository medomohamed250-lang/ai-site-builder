import crypto from 'node:crypto';

const API = 'https://api.supabase.com/v1';

async function request(path, options = {}) {
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN;
  if (!token) throw new Error('SUPABASE_MANAGEMENT_TOKEN is missing');
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Supabase API ${response.status}`);
  return data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createTargetSupabase(job) {
  const organizationId = process.env.SUPABASE_ORGANIZATION_ID;
  const region = process.env.SUPABASE_DEFAULT_REGION;
  if (!organizationId || !region) throw new Error('Supabase organization or region is missing');
  const password = crypto.randomBytes(24).toString('base64url');
  const project = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({ name: job.project_name, organization_id: organizationId, region, db_pass: password })
  });
  return { ref: project.ref || project.id, status: project.status || 'CREATING' };
}

export async function finishTargetSupabase(target, sql) {
  const ref = target.ref;
  let project;
  for (let i = 0; i < 12; i += 1) {
    project = await request(`/projects/${encodeURIComponent(ref)}`);
    if (['ACTIVE_HEALTHY', 'ACTIVE'].includes(project.status)) break;
    await sleep(3000);
  }
  if (!project || !['ACTIVE_HEALTHY', 'ACTIVE'].includes(project.status)) {
    return { ...target, status: project?.status || 'CREATING', pending: true };
  }
  if (sql) {
    await request(`/projects/${encodeURIComponent(ref)}/database/query`, {
      method: 'POST',
      body: JSON.stringify({ query: sql, read_only: false })
    });
  }
  const keys = await request(`/projects/${encodeURIComponent(ref)}/api-keys?reveal=true`);
  const publicKey = keys.find((key) => ['anon', 'publishable'].includes(String(key.name || key.type).toLowerCase()));
  return {
    ref,
    status: project.status,
    url: `https://${ref}.supabase.co`,
    publishableKey: publicKey?.api_key || publicKey?.value || '',
    pending: false
  };
}
