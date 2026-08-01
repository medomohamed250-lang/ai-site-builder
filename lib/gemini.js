import { validateFiles, validateSql } from './validate.js';

const schema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    files: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { path: { type: 'STRING' }, content: { type: 'STRING' } },
        required: ['path', 'content']
      }
    },
    databaseSql: { type: 'STRING' },
    environmentVariables: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { key: { type: 'STRING' }, kind: { type: 'STRING' } },
        required: ['key', 'kind']
      }
    }
  },
  required: ['summary', 'files', 'databaseSql', 'environmentVariables']
};

export async function generateProject(job) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is missing');
  const model = job.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const prompt = `Build a complete deployable static website from this request:\n${job.description}\n\nProject slug: ${job.project_name}.\nRules:\n- Output a vanilla HTML/CSS/JS project.\n- index.html must work as the entry point.\n- The website may use Supabase in browser only through placeholders SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.\n- Never include private keys.\n- If database is useful, provide idempotent PostgreSQL SQL with RLS enabled and ownership policies.\n- Keep dependencies at zero unless absolutely necessary.\n- Include README.md for the generated website.\n- Return only schema-compliant JSON.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are a coordinated team of planner, UI engineer, backend architect, database architect, security reviewer, and deployment reviewer. Produce internally consistent production-minded files.' }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Gemini API ${response.status}`);
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('Gemini returned invalid JSON'); }
  return {
    summary: String(parsed.summary || ''),
    files: validateFiles(parsed.files),
    databaseSql: validateSql(parsed.databaseSql),
    environmentVariables: Array.isArray(parsed.environmentVariables) ? parsed.environmentVariables : []
  };
}
