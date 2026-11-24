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

const FULL_SHA_RE = /^[0-9a-f]{40}$/i;

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

export function parseHandoffMetadata(handoffContent) {
  const versionMatch = handoffContent.match(/(?:contract[_\s-]*version|version)\s*[:=]\s*`?([0-9]+\.[0-9]+(?:\.[0-9]+)?[^\s`*]*)`?/i);
  const shaMatch = handoffContent.match(/(?:commit|contract[_\s-]*sha|sha)\s*[:=]\s*`?([0-9a-f]{40})`?/i);

  // Match lines mentioning a file path under docs/crm-sales/ or contract/ or fixtures/ together with a 64-hex sha256.
  const fileChecksums = new Map();
  for (const line of handoffContent.split(/\r?\n/)) {
    const hashMatch = line.match(/\b([0-9a-f]{64})\b/i);
    if (!hashMatch) continue;
    const pathMatch = line.match(/(?:docs\/crm-sales\/)?((?:contract|fixtures)\/[^\s|`'",;:]+|[A-Za-z0-9_.-]+\.(?:json|ya?ml))/i);
    if (pathMatch) {
      const normalized = pathMatch[1].replace(/^docs\/crm-sales\//, '');
      fileChecksums.set(normalized, hashMatch[1].toLowerCase());
    }
  }

  return {
    version: versionMatch ? versionMatch[1] : null,
    commitSha: shaMatch ? shaMatch[1].toLowerCase() : null,
    fileChecksums
  };
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

function readGitBlob(backendDir, sha, filePath) {
  return execFileSync('git', ['-C', backendDir, 'show', `${sha}:${filePath}`]);
}

function verifyCommitExists(backendDir, sha) {
  try {
    return runGit(backendDir, ['cat-file', '-t', sha]) === 'commit';
  } catch {
    return false;
  }
}

function verifyCommitInBranch(backendDir, sha, branch) {
  try {
    execFileSync('git', ['-C', backendDir, 'merge-base', '--is-ancestor', sha, branch], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function syncContractFromGit({
  backendDir = DEFAULT_BACKEND_DIR,
  branch = null,
  sha = null,
  fetch = false,
  expectedVersion = null,
  expectedBundleSha256 = null,
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

  if (fetch) {
    try {
      runGit(backendDir, ['fetch', 'origin', '--prune']);
    } catch (err) {
      return {
        ok: false,
        status: 'BLOCKED',
        reason: `Failed to fetch origin in ${backendDir}: ${err.message}`
      };
    }
  }

  let targetSha = sha ? sha.trim().toLowerCase() : null;
  if (targetSha && !FULL_SHA_RE.test(targetSha)) {
    return {
      ok: false,
      status: 'FAILED',
      reason: `Invalid --sha "${sha}": expected full 40-character commit SHA`
    };
  }

  const targetBranch = branch ? branch.trim() : null;
  if (!targetSha) {
    const refToResolve = targetBranch || 'origin/main';
    try {
      targetSha = runGit(backendDir, ['rev-parse', `${refToResolve}^{commit}`]).toLowerCase();
    } catch {
      return {
        ok: false,
        status: 'BLOCKED',
        reason: `Cannot resolve branch/ref "${refToResolve}" in ${backendDir}`
      };
    }
  }

  if (!FULL_SHA_RE.test(targetSha) || !verifyCommitExists(backendDir, targetSha)) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: `Commit SHA ${targetSha} not found in ${backendDir}`
    };
  }

  if (targetBranch && !verifyCommitInBranch(backendDir, targetSha, targetBranch)) {
    return {
      ok: false,
      status: 'FAILED',
      backendSha: targetSha,
      reason: `Commit ${targetSha} is not an ancestor of branch "${targetBranch}"`
    };
  }

  const listed = runGit(backendDir, ['ls-tree', '-r', '--name-only', targetSha, 'docs/crm-sales/']);
  const files = listed ? listed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
  const { handoff, contractFiles, fixtureFiles } = classifyC01Files(files);

  if (!handoff || contractFiles.length === 0) {
    return {
      ok: false,
      status: 'BLOCKED',
      backendSha: targetSha,
      branch: targetBranch,
      reason: `C01 not published at commit ${targetSha}${targetBranch ? ` (branch ${targetBranch})` : ''}: missing docs/crm-sales/HANDOFF_C01.md or contract schema files`
    };
  }

  const handoffText = readGitBlob(backendDir, targetSha, handoff).toString('utf8');
  if (!handoffText.trim()) {
    return {
      ok: false,
      status: 'FAILED',
      backendSha: targetSha,
      reason: 'HANDOFF_C01.md is empty'
    };
  }

  const handoffMeta = parseHandoffMetadata(handoffText);
  if (handoffMeta.commitSha && handoffMeta.commitSha !== targetSha) {
    return {
      ok: false,
      status: 'FAILED',
      backendSha: targetSha,
      reason: `HANDOFF_C01.md commit SHA mismatch: expected ${targetSha}, found ${handoffMeta.commitSha}`
    };
  }

  const stagedFiles = [];
  let primarySchemaText = null;

  for (const srcPath of [...contractFiles, ...fixtureFiles]) {
    const isFixture = fixtureFiles.includes(srcPath);
    const buf = readGitBlob(backendDir, targetSha, srcPath);
    const hash = sha256Buffer(buf);
    const relFromCrmSales = srcPath.replace(/^docs\/crm-sales\//, '');
    const relOut = srcPath.replace(/^docs\/crm-sales\/(contract\/|fixtures\/)?/, '');

    const expectedFileHash =
      handoffMeta.fileChecksums.get(relFromCrmSales) ||
      handoffMeta.fileChecksums.get(relOut) ||
      null;

    if (expectedFileHash && expectedFileHash !== hash) {
      return {
        ok: false,
        status: 'FAILED',
        backendSha: targetSha,
        reason: `SHA-256 mismatch for ${srcPath}: HANDOFF_C01.md expects ${expectedFileHash}, got ${hash}`
      };
    }

    if (!isFixture && primarySchemaText === null) {
      primarySchemaText = buf.toString('utf8');
    }

    stagedFiles.push({
      kind: isFixture ? 'fixture' : 'contract',
      source_path: srcPath,
      local_path: path.join(isFixture ? 'fixtures' : 'contract', relOut).replace(/\\/g, '/'),
      sha256: hash,
      bytes: buf.length,
      buffer: buf
    });
  }

  const schemaVersion = extractContractVersion(handoffText, primarySchemaText);
  if (handoffMeta.version && schemaVersion && handoffMeta.version !== schemaVersion) {
    return {
      ok: false,
      status: 'FAILED',
      backendSha: targetSha,
      reason: `Contract version mismatch: HANDOFF_C01.md says ${handoffMeta.version}, schema says ${schemaVersion}`
    };
  }

  const contractVersion = schemaVersion || handoffMeta.version || null;
  if (!contractVersion) {
    return {
      ok: false,
      status: 'FAILED',
      backendSha: targetSha,
      reason: 'Unable to determine contract version from schema or HANDOFF_C01.md'
    };
  }

  if (expectedVersion && contractVersion !== expectedVersion) {
    return {
      ok: false,
      status: 'FAILED',
      backendSha: targetSha,
      reason: `Expected contract version ${expectedVersion}, got ${contractVersion}`
    };
  }

  const bundleHash = sha256Buffer(
    Buffer.from(stagedFiles.map((f) => `${f.source_path}:${f.sha256}`).sort().join('\n'), 'utf8')
  );

  if (expectedBundleSha256 && bundleHash !== expectedBundleSha256.toLowerCase()) {
    return {
      ok: false,
      status: 'FAILED',
      backendSha: targetSha,
      reason: `Bundle SHA-256 mismatch: expected ${expectedBundleSha256}, got ${bundleHash}`
    };
  }

  // All verifications passed; write files and update contracts.lock atomically after checks.
  for (const file of stagedFiles) {
    const destPath = path.join(docsUiDir, file.local_path);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, file.buffer);
  }

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
      branch: targetBranch,
      contract_sha: targetSha,
      contract_version: contractVersion,
      handoff_path: handoff,
      bundle_sha256: bundleHash
    },
    files: stagedFiles.map(({ buffer: _buffer, ...meta }) => meta),
    fixtures: {
      mode: 'SYNTHETIC_C01_LOCKED',
      note: 'Synthetic fixtures are for UI development/tests only and never prove real API readiness.'
    }
  };

  fs.writeFileSync(path.join(docsUiDir, 'contracts.lock'), JSON.stringify(lockPayload, null, 2) + '\n', 'utf8');

  return {
    ok: true,
    status: 'LOCKED_C01',
    branch: targetBranch,
    backendSha: targetSha,
    contractVersion,
    bundleSha256: bundleHash,
    filesCount: stagedFiles.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  const getArg = (flag, fallback = null) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };
  const hasFlag = (flag) => args.includes(flag);

  const result = syncContractFromGit({
    backendDir: getArg('--backend-dir', DEFAULT_BACKEND_DIR),
    branch: getArg('--branch', null),
    sha: getArg('--sha', null),
    fetch: hasFlag('--fetch'),
    expectedVersion: getArg('--expected-version', null),
    expectedBundleSha256: getArg('--expected-bundle-sha256', null),
    docsUiDir: getArg('--docs-ui-dir', DEFAULT_DOCS_UI_DIR)
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}
