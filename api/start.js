import crypto from 'node:crypto';
import { createJob } from '../lib/store.js';
import { json, readJson, requireAccess, requireMethod } from '../lib/http.js';
import { slug, startSchema } from '../lib/validate.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST') || !requireAccess(req, res)) return;
  try {
    const input = startSchema.parse(await readJson(req));
    const id = crypto.randomUUID();
    await createJob({
      id,
      project_name: slug(input.projectName),
      description: input.description,
      framework: input.framework,
      model: input.model,
      use_supabase: input.useSupabase,
      private_repo: input.privateRepo,
      status: 'running',
      current_step: 'generate'
    });
    return json(res, 201, { jobId: id, status: 'running', currentStep: 'generate' });
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
}
