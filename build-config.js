const fs = require('node:fs');
const path = require('node:path');

const editorPath = __dirname;
const parentPath = path.resolve(editorPath, '..');

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envContents = fs.readFileSync(filePath, 'utf8');

  for (const line of envContents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

[
  path.join(parentPath, '.env'),
  path.join(parentPath, '.env.local'),
  path.join(editorPath, '.env'),
  path.join(editorPath, '.env.local'),
].forEach(readEnvFile);

const firstEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return '';
};

const publicConfig = {
  supabaseUrl: firstEnv('BLOG_EDITOR_SUPABASE_URL', 'SUPABASE_URL'),
  supabaseAnonKey: firstEnv('BLOG_EDITOR_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'),
  publicSiteUrl: firstEnv('BLOG_EDITOR_PUBLIC_SITE_URL', 'PUBLIC_SITE_URL', 'TRACKS_PUBLIC_SITE_URL'),
};

const looksLikeSupabaseBrowserKey = (key) =>
  key.startsWith('sb_publishable_') ||
  (key.startsWith('eyJ') && key.split('.').length === 3);

const hasMissingConfig =
  !publicConfig.supabaseUrl ||
  !publicConfig.supabaseAnonKey ||
  publicConfig.supabaseUrl.includes('YOUR-PROJECT-REF') ||
  publicConfig.supabaseAnonKey.includes('YOUR_SUPABASE');

const hasInvalidUrl =
  publicConfig.supabaseUrl &&
  !publicConfig.supabaseUrl.startsWith('https://');

const hasInvalidKey =
  publicConfig.supabaseAnonKey &&
  !publicConfig.supabaseAnonKey.includes('YOUR_SUPABASE') &&
  !looksLikeSupabaseBrowserKey(publicConfig.supabaseAnonKey);

if ((hasMissingConfig || hasInvalidUrl || hasInvalidKey) && process.env.NETLIFY) {
  throw new Error(
    'Invalid Tracks Blog Editor config. Add SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment variables, then redeploy.',
  );
}

const output = `window.TRACKS_BLOG_EDITOR_ENV = ${JSON.stringify(publicConfig, null, 2)};\n`;
const outputPath = path.join(editorPath, 'config.js');

fs.writeFileSync(outputPath, output, 'utf8');

console.log(
  `Generated blog-editor/config.js (${hasMissingConfig ? 'missing values' : hasInvalidUrl ? 'invalid URL' : hasInvalidKey ? 'invalid key' : 'configured'}).`,
);
