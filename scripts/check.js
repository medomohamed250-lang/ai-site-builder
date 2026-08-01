import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiDir = path.join(root, 'api');
const apiFiles = fs.readdirSync(apiDir).filter((name) => name.endsWith('.js'));
if (apiFiles.length > 12) throw new Error(`Too many API files: ${apiFiles.length}`);
for (const required of ['index.html', 'package.json', 'vercel.json', '.env.example']) {
  if (!fs.existsSync(path.join(root, required))) throw new Error(`Missing ${required}`);
}
console.log(`OK: ${apiFiles.length} API files; required files exist.`);
