const API = 'https://api.vercel.com';

function url(path) {
  const teamId = process.env.VERCEL_TEAM_ID;
  return `${API}${path}${teamId ? `${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}` : ''}`;
}

async function request(path, options = {}) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN is missing');
  const response = await fetch(url(path), {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.message || `Vercel API ${response.status}`);
  return data;
}

export async function createVercelProject(job, github, targetSupabase) {
  let project;
  try {
    project = await request('/v10/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: job.project_name,
        framework: null,
        gitRepository: { type: 'github', repo: `${github.owner}/${github.repo}` }
      })
    });
  } catch (error) {
    if (!String(error.message).toLowerCase().includes('already')) throw error;
    project = await request(`/v9/projects/${encodeURIComponent(job.project_name)}`);
  }

  const variables = [];
  if (targetSupabase?.url) variables.push({ key: 'SUPABASE_URL', value: targetSupabase.url, type: 'encrypted', target: ['production', 'preview', 'development'] });
  if (targetSupabase?.publishableKey) variables.push({ key: 'SUPABASE_PUBLISHABLE_KEY', value: targetSupabase.publishableKey, type: 'encrypted', target: ['production', 'preview', 'development'] });
  if (variables.length) {
    await request(`/v10/projects/${encodeURIComponent(project.id || project.name)}/env`, {
      method: 'POST',
      body: JSON.stringify(variables)
    });
  }
  const deployment = await request('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: job.project_name,
      project: project.id || project.name,
      target: 'production',
      gitSource: { type: 'github', org: github.owner, repo: github.repo, ref: 'main' }
    })
  });
  return { projectId: project.id || project.name, deploymentId: deployment.id, url: deployment.url ? `https://${deployment.url}` : '', state: deployment.readyState || 'QUEUED' };
}

export async function checkDeployment(result) {
  const deployment = await request(`/v13/deployments/${encodeURIComponent(result.deploymentId)}`);
  return { ...result, url: deployment.url ? `https://${deployment.url}` : result.url, state: deployment.readyState || deployment.state };
}
