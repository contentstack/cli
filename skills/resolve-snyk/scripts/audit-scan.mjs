#!/usr/bin/env node
/**
 * audit-scan.mjs
 *
 * Runs npm audit + snyk test + snyk code test in JSON mode, parses all three,
 * and outputs a single structured JSON summary ready for the LLM to present.
 *
 * Usage:
 *   node audit-scan.mjs <repo-dir>
 *   node audit-scan.mjs <repo-dir> --baseline <baseline-output.json>
 *
 * When --baseline is provided, also computes a before/after diff for re-audit.
 *
 * Output: JSON to stdout. Errors to stderr.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function detectPkgManager(repoDir) {
  if (existsSync(resolve(repoDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(resolve(repoDir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node audit-scan.mjs <repo-dir> [--baseline <file>]');
  process.exit(1);
}

const repoDir = resolve(args[0]);
const baselineIndex = args.indexOf('--baseline');
const baselineFile = baselineIndex !== -1 ? args[baselineIndex + 1] : null;

function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    // npm audit / snyk exit non-zero when findings exist — that's expected
    return e.stdout || '';
  }
}

function semverCompare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function classifyFix(currentVer, fixVer) {
  if (!fixVer) return 'none';
  const [cMaj, cMin] = currentVer.replace(/[^0-9.]/g, '').split('.').map(Number);
  const [fMaj, fMin] = fixVer.replace(/[^0-9.]/g, '').split('.').map(Number);
  if (fMaj > cMaj) return 'major';
  if (fMin > cMin) return 'minor';
  return 'patch';
}

// ── npm/pnpm audit ───────────────────────────────────────────────────────────

function parseNpmAudit(repoDir) {
  const pkgManager = detectPkgManager(repoDir);
  // pnpm audit --json uses the same JSON schema as npm audit --json
  // yarn audit --json uses a different JSONL format; fall back to npm audit for yarn repos
  const auditCmd = pkgManager === 'pnpm' ? 'pnpm audit --json' : 'npm audit --json';
  const raw = run(auditCmd, repoDir);
  let data;
  try { data = JSON.parse(raw); } catch { return { error: 'Failed to parse npm audit JSON', raw }; }

  const directDeps = new Set(
    Object.keys({
      ...(JSON.parse(readFileSync(resolve(repoDir, 'package.json'), 'utf8')).dependencies || {}),
      ...(JSON.parse(readFileSync(resolve(repoDir, 'package.json'), 'utf8')).devDependencies || {}),
      ...(JSON.parse(readFileSync(resolve(repoDir, 'package.json'), 'utf8')).optionalDependencies || {}),
    })
  );

  const severityCounts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  const directPatch = [], directMinor = [], directMajor = [], transitiveOnly = [], noFix = [];

  const vulns = data.vulnerabilities || {};
  for (const [name, vuln] of Object.entries(vulns)) {
    const severity = vuln.severity || 'unknown';
    if (severityCounts[severity] !== undefined) severityCounts[severity]++;

    const isDirect = directDeps.has(name);
    const fixAvailable = vuln.fixAvailable;
    let fixVersion = null;
    let fixType = 'none';
    let requiresForce = false;

    if (fixAvailable === true) {
      fixType = 'patch'; // npm says it can fix without breaking changes
    } else if (fixAvailable && typeof fixAvailable === 'object') {
      fixVersion = fixAvailable.version || null;
      requiresForce = fixAvailable.isSemVerMajor || false;
      fixType = requiresForce ? 'major' : classifyFix(vuln.range || '', fixVersion || '');
    }

    const entry = {
      package: name,
      severity,
      title: (vuln.via || []).map(v => typeof v === 'string' ? v : v.title).filter(Boolean).join('; '),
      currentRange: vuln.range || '',
      fixVersion,
      requiresForce,
      introducedVia: isDirect ? null : Object.keys(vulns).filter(k =>
        (vulns[k].nodes || []).some(n => n.includes(`node_modules/${name}`)) && k !== name
      ).slice(0, 2),
    };

    if (!fixAvailable) {
      noFix.push(entry);
    } else if (!isDirect) {
      transitiveOnly.push({ ...entry, fixType });
    } else if (fixType === 'patch' || fixType === 'minor') {
      (fixType === 'patch' ? directPatch : directMinor).push(entry);
    } else {
      directMajor.push(entry);
    }
  }

  return { severityCounts, directPatch, directMinor, directMajor, transitiveOnly, noFix };
}

// ── snyk test ────────────────────────────────────────────────────────────────

function parseSnykTest(repoDir) {
  const raw = run('snyk test --json', repoDir);
  let data;
  try { data = JSON.parse(raw); } catch { return { error: 'Failed to parse snyk test JSON', raw }; }

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const vulns = [];
  const licenseIssues = [];

  for (const vuln of (data.vulnerabilities || [])) {
    const sev = vuln.severity || 'low';
    if (severityCounts[sev] !== undefined) severityCounts[sev]++;

    const entry = {
      package: vuln.packageName,
      version: vuln.version,
      severity: sev,
      title: vuln.title,
      id: vuln.id,
      fixedIn: (vuln.fixedIn || []).join(', ') || null,
      isLicense: vuln.type === 'license',
    };

    if (vuln.type === 'license') licenseIssues.push(entry);
    else vulns.push(entry);
  }

  return { severityCounts, vulns, licenseIssues };
}

// ── snyk code test ───────────────────────────────────────────────────────────

function parseSnykCode(repoDir) {
  const raw = run('snyk code test --json', repoDir);
  let data;
  try { data = JSON.parse(raw); } catch { return { error: 'Failed to parse snyk code JSON', raw }; }

  const severityCounts = { high: 0, medium: 0, low: 0 };
  const findings = [];

  for (const run_ of (data.runs || [])) {
    for (const result of (run_.results || [])) {
      const sev = (result.level || 'note') === 'error' ? 'high'
                : (result.level === 'warning') ? 'medium' : 'low';
      if (severityCounts[sev] !== undefined) severityCounts[sev]++;

      const loc = (result.locations || [])[0];
      const region = loc?.physicalLocation?.region || {};
      findings.push({
        file: loc?.physicalLocation?.artifactLocation?.uri || 'unknown',
        line: region.startLine || null,
        severity: sev,
        title: result.message?.text || '',
        cwe: (result.taxa || []).map(t => t.id).join(', ') || null,
      });
    }
  }

  return { severityCounts, findings };
}

// ── diff (for re-audit) ──────────────────────────────────────────────────────

function computeDiff(baseline, current) {
  const diff = {};
  for (const scanner of ['npmAudit', 'snykTest']) {
    const bCounts = baseline[scanner]?.severityCounts || {};
    const cCounts = current[scanner]?.severityCounts || {};
    diff[scanner] = {};
    for (const sev of Object.keys(bCounts)) {
      diff[scanner][sev] = { before: bCounts[sev] || 0, after: cCounts[sev] || 0, fixed: (bCounts[sev] || 0) - (cCounts[sev] || 0) };
    }
  }
  return diff;
}

// ── main ─────────────────────────────────────────────────────────────────────

const result = {
  repoDir,
  scannedAt: new Date().toISOString(),
  npmAudit: parseNpmAudit(repoDir),
  snykTest: parseSnykTest(repoDir),
  snykCode: parseSnykCode(repoDir),
};

if (baselineFile && existsSync(baselineFile)) {
  const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
  result.diff = computeDiff(baseline, result);
}

process.stdout.write(JSON.stringify(result, null, 2));
