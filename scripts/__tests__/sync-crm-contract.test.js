import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  sha256Buffer,
  extractContractVersion,
  parseHandoffMetadata,
  classifyC01Files,
  syncContractFromGit
} from '../sync-crm-contract.mjs';

function initTempGitRepo(files, branchName = 'feature/c01-contract') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-c01-test-'));
  execFileSync('git', ['init', '-b', branchName], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });

  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
  return { dir, sha };
}

describe('sync-crm-contract', () => {
  it('returns BLOCKED and preserves existing contracts.lock when C01 is not published', () => {
    const { dir: backendDir, sha } = initTempGitRepo({ 'README.md': '# backend\n' });
    const docsUiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-docs-ui-'));
    const lockPath = path.join(docsUiDir, 'contracts.lock');
    fs.writeFileSync(lockPath, '{"status":"PENDING_C01"}\n', 'utf8');

    const result = syncContractFromGit({ backendDir, branch: 'feature/c01-contract', sha, docsUiDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toMatch(/C01 not published/);
    expect(fs.readFileSync(lockPath, 'utf8')).toBe('{"status":"PENDING_C01"}\n');
  });

  it('rejects non-40-hex commit SHA without touching contracts.lock', () => {
    const { dir: backendDir } = initTempGitRepo({ 'README.md': '# backend\n' });
    const docsUiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-docs-ui-'));
    const lockPath = path.join(docsUiDir, 'contracts.lock');
    fs.writeFileSync(lockPath, '{"status":"PENDING_C01"}\n', 'utf8');

    const result = syncContractFromGit({ backendDir, branch: 'feature/c01-contract', sha: 'deadbeef', docsUiDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.reason).toMatch(/40-character commit SHA/);
    expect(fs.readFileSync(lockPath, 'utf8')).toBe('{"status":"PENDING_C01"}\n');
  });

  it('syncs C01 contract + fixtures by immutable commit SHA and branch, verifying SHA-256 and version', () => {
    const openapi = JSON.stringify({ openapi: '3.1.0', info: { title: 'TOZON CRM', version: '1.0.0-c01' } });
    const fixture = JSON.stringify({ leads: [{ id: 'lead-1', stage: 'NEW' }] });
    const openapiHash = sha256Buffer(Buffer.from(openapi));
    const fixtureHash = sha256Buffer(Buffer.from(fixture));

    const { dir: backendDir, sha } = initTempGitRepo({
      'docs/crm-sales/HANDOFF_C01.md': [
        '# HANDOFF_C01',
        'version: 1.0.0-c01',
        `- docs/crm-sales/contract/openapi.json | sha256: \`${openapiHash}\``,
        `- docs/crm-sales/fixtures/leads.json | sha256: \`${fixtureHash}\``
      ].join('\n'),
      'docs/crm-sales/contract/openapi.json': openapi,
      'docs/crm-sales/fixtures/leads.json': fixture
    }, 'feat/c01-sales-contract');

    const docsUiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-docs-ui-'));

    const result = syncContractFromGit({
      backendDir,
      branch: 'feat/c01-sales-contract',
      sha,
      expectedVersion: '1.0.0-c01',
      docsUiDir,
      frontendBranch: 'a00',
      frontendBaseSha: '627d6f8b45656eb0ba5552b8274c13f1c67ff1d3'
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('LOCKED_C01');
    expect(result.branch).toBe('feat/c01-sales-contract');
    expect(result.backendSha).toBe(sha);
    expect(result.contractVersion).toBe('1.0.0-c01');
    expect(result.filesCount).toBe(2);

    const lock = JSON.parse(fs.readFileSync(path.join(docsUiDir, 'contracts.lock'), 'utf8'));
    expect(lock.status).toBe('LOCKED_C01');
    expect(lock.backend.branch).toBe('feat/c01-sales-contract');
    expect(lock.backend.contract_sha).toBe(sha);
    expect(lock.files.find((f) => f.kind === 'contract').sha256).toBe(openapiHash);
    expect(lock.files.find((f) => f.kind === 'fixture').sha256).toBe(fixtureHash);
  });

  it('aborts without modifying contracts.lock when HANDOFF_C01.md SHA-256 checksum mismatches', () => {
    const openapi = JSON.stringify({ openapi: '3.1.0', info: { title: 'TOZON CRM', version: '1.0.0-c01' } });
    const badHash = '0'.repeat(64);

    const { dir: backendDir, sha } = initTempGitRepo({
      'docs/crm-sales/HANDOFF_C01.md': `# HANDOFF_C01\nversion: 1.0.0-c01\n- docs/crm-sales/contract/openapi.json: ${badHash}\n`,
      'docs/crm-sales/contract/openapi.json': openapi
    }, 'feat/c01-sales-contract');

    const docsUiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-docs-ui-'));
    const lockPath = path.join(docsUiDir, 'contracts.lock');
    fs.writeFileSync(lockPath, '{"status":"PENDING_C01"}\n', 'utf8');

    const result = syncContractFromGit({ backendDir, branch: 'feat/c01-sales-contract', sha, docsUiDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.reason).toMatch(/SHA-256 mismatch/);
    expect(fs.readFileSync(lockPath, 'utf8')).toBe('{"status":"PENDING_C01"}\n');
    expect(fs.existsSync(path.join(docsUiDir, 'contract', 'openapi.json'))).toBe(false);
  });

  it('aborts without modifying contracts.lock when commit SHA is not in the specified branch', () => {
    const openapi = JSON.stringify({ openapi: '3.1.0', info: { version: '1.0.0-c01' } });
    const { dir: backendDir, sha: c01Sha } = initTempGitRepo({
      'docs/crm-sales/HANDOFF_C01.md': '# HANDOFF_C01\nversion: 1.0.0-c01\n',
      'docs/crm-sales/contract/openapi.json': openapi
    }, 'feat/c01-sales-contract');

    execFileSync('git', ['checkout', '--orphan', 'other-branch'], { cwd: backendDir });
    fs.writeFileSync(path.join(backendDir, 'README.md'), '# other\n', 'utf8');
    execFileSync('git', ['add', 'README.md'], { cwd: backendDir });
    execFileSync('git', ['commit', '-m', 'other'], { cwd: backendDir });

    const docsUiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-docs-ui-'));
    const lockPath = path.join(docsUiDir, 'contracts.lock');
    fs.writeFileSync(lockPath, '{"status":"PENDING_C01"}\n', 'utf8');

    const result = syncContractFromGit({ backendDir, branch: 'other-branch', sha: c01Sha, docsUiDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.reason).toMatch(/not an ancestor of branch/);
    expect(fs.readFileSync(lockPath, 'utf8')).toBe('{"status":"PENDING_C01"}\n');
  });

  it('classifies C01 files and parses handoff metadata cleanly', () => {
    const classified = classifyC01Files([
      'docs/crm-sales/HANDOFF_C01.md',
      'docs/crm-sales/openapi.yaml',
      'docs/crm-sales/fixtures/inbox.json'
    ]);
    expect(classified.handoff).toBe('docs/crm-sales/HANDOFF_C01.md');
    expect(classified.contractFiles).toEqual(['docs/crm-sales/openapi.yaml']);
    expect(classified.fixtureFiles).toEqual(['docs/crm-sales/fixtures/inbox.json']);
    expect(extractContractVersion('', 'info:\n  version: 2.1.0\n')).toBe('2.1.0');

    const meta = parseHandoffMetadata(`version: 1.2.0\ncommit: ${'a'.repeat(40)}\n`);
    expect(meta.version).toBe('1.2.0');
    expect(meta.commitSha).toBe('a'.repeat(40));
  });
});
