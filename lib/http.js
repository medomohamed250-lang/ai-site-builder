export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

export function requireMethod(req, res, method) {
  if (req.method !== method) {
    res.setHeader('Allow', method);
    json(res, 405, { error: 'Method not allowed' });
    return false;
  }
  return true;
}

export function requireAccess(req, res) {
  const expected = process.env.BUILDER_ACCESS_KEY;
  if (!expected) return true;
  const received = req.headers['x-builder-key'];
  if (received !== expected) {
    json(res, 401, { error: 'Invalid builder access key' });
    return false;
  }
  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}
