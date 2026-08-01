import { json, requireAccess, requireMethod } from '../lib/http.js';
import { getJob } from '../lib/store.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET') || !requireAccess(req, res)) return;
  try {
    const jobId = req.query.jobId;
    if (!jobId) throw new Error('jobId is required');
    const job = await getJob(jobId);
    return json(res, 200, {
      id: job.id,
      projectName: job.project_name,
      status: job.status,
      currentStep: job.current_step,
      error: job.error_message,
      repositoryUrl: job.github_result?.url || '',
      siteUrl: job.vercel_result?.url || '',
      supabaseRef: job.target_supabase?.ref || ''
    });
  } catch (error) {
    return json(res, 404, { error: error.message });
  }
}
