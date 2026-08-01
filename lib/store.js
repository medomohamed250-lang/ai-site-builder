import { createClient } from '@supabase/supabase-js';

function client() {
  const url = process.env.BUILDER_SUPABASE_URL;
  const key = process.env.BUILDER_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Builder Supabase environment variables are missing');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createJob(job) {
  const { error } = await client().from('build_jobs').insert(job);
  if (error) throw new Error(error.message);
}

export async function getJob(id) {
  const { data, error } = await client().from('build_jobs').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateJob(id, patch) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  const { data, error } = await client().from('build_jobs').update(clean).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}
