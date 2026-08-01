import { json, readJson, requireAccess, requireMethod } from '../lib/http.js';
import { getJob, updateJob } from '../lib/store.js';
import { generateProject } from '../lib/gemini.js';
import { createTargetSupabase, finishTargetSupabase } from '../lib/supabase-management.js';
import { publishRepository } from '../lib/github.js';
import { checkDeployment, createVercelProject } from '../lib/vercel.js';

function injectPublicConfig(files, target) {
  if (!target?.url) return files;
  return files.map((file) => ({
    ...file,
    content: file.content
      .replaceAll('SUPABASE_URL', target.url)
      .replaceAll('SUPABASE_PUBLISHABLE_KEY', target.publishableKey || '')
  }));
}

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST') || !requireAccess(req, res)) return;
  let jobId;
  try {
    ({ jobId } = await readJson(req));
    if (!jobId) throw new Error('jobId is required');
    const job = await getJob(jobId);
    if (job.status === 'completed' || job.status === 'failed') return json(res, 200, job);

    if (job.current_step === 'generate') {
      const generated = await generateProject(job);
      const next = job.use_supabase && generated.databaseSql ? 'supabase_create' : 'github';
      const updated = await updateJob(jobId, { generated_project: generated, current_step: next });
      return json(res, 200, updated);
    }

    if (job.current_step === 'supabase_create') {
      const target = await createTargetSupabase(job);
      const updated = await updateJob(jobId, { target_supabase: target, current_step: 'supabase_finish' });
      return json(res, 200, updated);
    }

    if (job.current_step === 'supabase_finish') {
      const target = await finishTargetSupabase(job.target_supabase, job.generated_project.databaseSql);
      const updated = await updateJob(jobId, {
        target_supabase: target,
        current_step: target.pending ? 'supabase_finish' : 'github'
      });
      return json(res, 200, updated);
    }

    if (job.current_step === 'github') {
      const files = injectPublicConfig(job.generated_project.files, job.target_supabase);
      const github = await publishRepository(job, files);
      const updated = await updateJob(jobId, { github_result: github, current_step: 'vercel' });
      return json(res, 200, updated);
    }

    if (job.current_step === 'vercel') {
      const vercel = await createVercelProject(job, job.github_result, job.target_supabase);
      const updated = await updateJob(jobId, { vercel_result: vercel, current_step: 'deploy_check' });
      return json(res, 200, updated);
    }

    if (job.current_step === 'deploy_check') {
      const vercel = await checkDeployment(job.vercel_result);
      const failed = ['ERROR', 'CANCELED'].includes(vercel.state);
      const ready = vercel.state === 'READY';
      const updated = await updateJob(jobId, {
        vercel_result: vercel,
        status: failed ? 'failed' : ready ? 'completed' : 'running',
        current_step: failed ? 'failed' : ready ? 'completed' : 'deploy_check',
        error_message: failed ? `Vercel deployment state: ${vercel.state}` : null
      });
      return json(res, 200, updated);
    }

    throw new Error(`Unknown step: ${job.current_step}`);
  } catch (error) {
    if (jobId) {
      try { await updateJob(jobId, { status: 'failed', current_step: 'failed', error_message: error.message }); } catch {}
    }
    return json(res, 500, { error: error.message, jobId });
  }
}
