import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_BACKEND_DIR = path.resolve(CLIENT_ROOT, '..', 'server');
const DEFAULT_DOCS_UI_DIR = path.join(CLIENT_ROOT, 'docs', 'crm-sales-ui');

export function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function extractContractVersion(handoffContent, schemaContent) {
  if (schemaContent) {
    try {
      const parsed = JSON.parse(schemaContent);
      if (parsed?.info?.version) return String(parsed.info.version);
      if (parsed?.version) return String(parsed.version);
    } catch {
      // Ignore non-JSON schemas (e.g. YAML OpenAPI) and fall back to regex.
    }
    const yamlMatch = schemaContent.match(/^\s*version\s*:\s*['"]?([0-9]+\.[0-9]+(?:\.[0-9]+)?[^'"\s]*)['"]?/m);
    if (yamlMatch) return yamlMatch[1];
  }
  if (handoffContent) {
    const mdMatch = handoffContent.match(/version[:\s`*]+([0-9]+\.[0-9]+(?:\.[0-9]+)?[^\s`]*)/i);
    if (mdMatch) return mdMatch[1];
  }
  return null;
}

export function classifyC01Files(filePaths) {
  const handoff = filePaths.find((p) => p === 'docs/crm-sales/HANDOFF_C01.md') || null;
  const contractFiles = [];
  const fixtureFiles = [];

  for (const filePath of filePaths) {
    const rel = filePath.replace(/^docs\/crm-sales\//, '');
    if (rel === 'HANDOFF_C01.md') continue;
    if (rel.startsWith('fixtures/') || rel.includes('fixture')) {
      fixtureFiles.push(filePath);
    } else if (
      rel.startsWith('contract/') ||
      /\.(json|ya?ml)$/i.test(rel) ||
      rel.toLowerCase().includes('openapi') ||
      rel.toLowerCase().includes('schema')
    ) {
      contractFiles.push(filePath);
    }
  }

  return { handoff, contractFiles, fixtureFiles };
}

function runGit(backendDir, args) {
  return execFileSync('git', ['-C', backendDir, ...args], { encoding: 'utf8' }).trim();
}

function readGitBlob(backendDir, ref, filePath) {
  return execFileSync('git', ['-C', backendDir, 'show', `${ref}:${filePath}`]);
}

export function syncContractFromGit({
  backendDir = DEFAULT_BACKEND_DIR,
  ref = 'origin/main',
  docsUiDir = DEFAULT_DOCS_UI_DIR,
  frontendBranch = 'a00',
  frontendBaseSha = null
} = {}) {
  if (!fs.existsSync(backendDir)) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: `Backend repository not found at ${backendDir}`
    };
  }

  const commitSha = runGit(backendDir, ['rev-parse', ref]);
  if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: `Invalid backend commit SHA resolved for ${ref}: ${commitSha}`
    };
  }

  const listed = runGit(backendDir, ['ls-tree', '-r', '--name-only', commitSha, 'docs/crm-sales/']);
  const files = listed ? listed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
  const { handoff, contractFiles, fixtureFiles } = classifyC01Files(files);

  if (!handoff || contractFiles.length === 0) {
    return {
      ok: false,
      status: 'BLOCKED',
      backendSha: commitSha,
      reason: `C01 not published at ${ref} (${commitSha}): missing docs/crm-sales/HANDOFF_C01.md or contract schema files`
    };
  }

  const contractOutDir = path.join(docsUiDir, 'contract');
  const fixturesOutDir = path.join(docsUiDir, 'fixtures');
  fs.mkdirSync(contractOutDir, { recursive: true });
  fs.mkdirSync(fixturesOutDir, { recursive: true });

  const lockedFiles = [];
  let primarySchemaText = null;
  const handoffText = readGitBlob(backendDir, commitSha, handoff).toString('utf8');

  for (const srcPath of [...contractFiles, ...fixtureFiles]) {
    const isFixture = fixtureFiles.includes(srcPath);
    const buf = readGitBlob(backendDir, commitSha, srcPath);
    const hash = sha256Buffer(buf);
    const relName = srcPath
      .replace(/^docs\/crm-sales\/(contract\/|fixtures\/)?/, '');
    const destPath = path.join(isFixture ? fixturesOutDir : contractOutDir, relName);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);

    if (!isFixture && primarySchemaText === null) {
      primarySchemaText = buf.toString('utf8');
    }

    lockedFiles.push({
      kind: isFixture ? 'fixture' : 'contract',
      source_path: srcPath,
      local_path: path.relative(docsUiDir, destPath).replace(/\\/g, '/'),
      sha256: hash,
      bytes: buf.length
    });
  }

  const bundleHash = sha256Buffer(
    Buffer.from(lockedFiles.map((f) => `${f.source_path}:${f.sha256}`).sort().join('\n'), 'utf8')
  );
  const contractVersion = extractContractVersion(handoffText, primarySchemaText);

  const lockPayload = {
    status: 'LOCKED_C01',
    synced_at: new Date().toISOString(),
    frontend: {
      repo: 'alik7500-wq/tozon-crm',
      branch: frontendBranch,
      base_sha: frontendBaseSha
    },
    backend: {
      repo: 'alik7500-wq/tozon-backend',
      ref,
      contract_sha: commitSha,
      contract_version: contractVersion,
      handoff_path: handoff,
      bundle_sha256: bundleHash
    },
    files: lockedFiles,
    fixtures: {
      mode: 'SYNTHETIC_C01_LOCKED',
      note: 'Synthetic fixtures are for UI development/tests only and never prove real API readiness.'
    }
  };

  fs.writeFileSync(path.join(docsUiDir, 'contracts.lock'), JSON.stringify(lockPayload, null, 2) + '\n', 'utf8');

  return {
    ok: true,
    status: 'LOCKED_C01',
    backendSha: commitSha,
    contractVersion,
    bundleSha256: bundleHash,
    filesCount: lockedFiles.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  const getArg = (flag, fallback) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };
  const backendDir = getArg('--backend-dir', DEFAULT_BACKEND_DIR);
  const ref = getArg('--ref', 'origin/main');
  const docsUiDir = getArg('--docs-ui-dir', DEFAULT_DOCS_UI_DIR);

  const result = syncContractFromGit({ backendDir, ref, docsUiDir });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}
