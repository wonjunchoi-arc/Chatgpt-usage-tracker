import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const candidateEnvFiles = [
  path.join(repoRoot, '.env.shared'),
  path.join(repoRoot, 'dashboard', '.env.local'),
];

function parseEnvFile(content) {
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function loadSharedEnv() {
  for (const envFile of candidateEnvFiles) {
    if (!existsSync(envFile)) continue;
    const parsed = parseEnvFile(readFileSync(envFile, 'utf8'));
    if (parsed.NEXT_PUBLIC_SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        source: envFile,
        values: {
          supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
      };
    }
  }

  throw new Error(
    'Could not find NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.shared or dashboard/.env.local'
  );
}

const { source, values } = loadSharedEnv();
const extensionConfigPath = path.join(repoRoot, 'chatgpt-usage-tracker', 'config.js');

mkdirSync(path.dirname(extensionConfigPath), { recursive: true });
writeFileSync(
  extensionConfigPath,
  `globalThis.__SUPABASE_CONFIG__ = ${JSON.stringify(values, null, 2)};\n`,
  'utf8'
);

console.log(`Synced extension config from ${path.relative(repoRoot, source)} -> chatgpt-usage-tracker/config.js`);
