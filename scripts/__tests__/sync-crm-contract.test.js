import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  sha256Buffer,
  extractContractVersion,
  classifyC01Files,
  syncContractFromGit
} from '../sync-crm-contract.mjs';

function initTempGitRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-c01-test-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });

  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
  return dir;
}

describe('sync-crm-contract', () => {
  it('returns BLOCKED and preserves existing contracts.lock when C01 is not published', () => {
    const backendDir = initTempGitRepo({ 'README.md': '# backend\n' });
    const docsUiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-docs-ui-'));
    const lockPath = path.join(docsUiDir, 'contracts.lock');
    fs.writeFileSync(lockPath, '{"status":"PENDING_C01"}\n', 'utf8');

    const result = syncContractFromGit({ backendDir, ref: 'HEAD', docsUiDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toMatch(/C01 not published/);
    expect(fs.readFileSync(lockPath, 'utf8')).toBe('{"status":"PENDING_C01"}\n');
  });

  it('syncs C01 contract + synthetic fixtures with SHA-256 checksums and full commit SHA', () => {
    const openapi = JSON.stringify({ openapi: '3.1.0', info: { title: 'TOZON CRM', version: '1.0.0-c01' } });
    const fixture = JSON.stringify({ leads: [{ id: 'lead-1', stage: 'NEW' }] });
    const backendDir = initTempGitRepo({
      'docs/crm-sales/HANDOFF_C01.md': '# HANDOFF_C01\nversion: 1.0.0-c01\n',
      'docs/crm-sales/contract/openapi.json': openapi,
      'docs/crm-sales/fixtures/leads.json': fixture
    });
    const docsUiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tozon-docs-ui-'));

    const result = syncContractFromGit({
      backendDir,
      ref: 'HEAD',
      docsUiDir,
      frontendBranch: 'a00',
      frontendBaseSha: '6dc514e2f729bd82804cdea242d772bfab825737'
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('LOCKED_C01');
    expect(result.contractVersion).toBe('1.0.0-c01');
    expect(result.backendSha).toMatch(/^[0-9a-f]{40}$/);
    expect(result.filesCount).toBe(2);

    const lock = JSON.parse(fs.readFileSync(path.join(docsUiDir, 'contracts.lock'), 'utf8'));
    expect(lock.status).toBe('LOCKED_C01');
    expect(lock.backend.contract_sha).toBe(result.backendSha);
    expect(lock.fixtures.mode).toBe('SYNTHETIC_C01_LOCKED');
    expect(lock.files.find((f) => f.kind === 'contract').sha256).toBe(sha256Buffer(Buffer.from(openapi)));
    expect(lock.files.find((f) => f.kind === 'fixture').sha256).toBe(sha256Buffer(Buffer.from(fixture)));
    expect(fs.existsSync(path.join(docsUiDir, 'contract', 'openapi.json'))).toBe(true);
    expect(fs.existsSync(path.join(docsUiDir, 'fixtures', 'leads.json'))).toBe(true);
  });

  it('classifies C01 files and extracts versions cleanly', () => {
    const classified = classifyC01Files([
      'docs/crm-sales/HANDOFF_C01.md',
      'docs/crm-sales/openapi.yaml',
      'docs/crm-sales/fixtures/inbox.json'
    ]);
    expect(classified.handoff).toBe('docs/crm-sales/HANDOFF_C01.md');
    expect(classified.contractFiles).toEqual(['docs/crm-sales/openapi.yaml']);
    expect(classified.fixtureFiles).toEqual(['docs/crm-sales/fixtures/inbox.json']);
    expect(extractContractVersion('', 'info:\n  version: 2.1.0\n')).toBe('2.1.0');
  });
});
