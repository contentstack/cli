#!/usr/bin/env node
/**
 * find-upgrades.mjs
 *
 * Reads package.json, detects exact pins vs range pins, finds the latest
 * patch and minor upgrade for each direct dep, and checks transitive-only
 * vulnerable deps for safe override versions (including deprecation checks).
 *
 * Usage:
 *   node find-upgrades.mjs <repo-dir> <audit-baseline.json>
 *
 * Output: JSON upgrade plan to stdout.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function detectPkgManager(repoDir) {
  if (existsSync(resolve(repoDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(resolve(repoDir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

const [, , repoDirArg, auditFile] = process.argv;
if (!repoDirArg || !auditFile) {
  console.error('Usage: node find-upgrades.mjs <repo-dir> <audit-baseline.json>');
  process.exit(1);
}

const repoDir = resolve(repoDirArg);
const pkg = JSON.parse(readFileSync(resolve(repoDir, 'package.json'), 'utf8'));
const audit = JSON.parse(readFileSync(resolve(auditFile), 'utf8'));

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || '';
  }
}

function semverParts(v) {
  return v.replace(/[^0-9.]/g, '').split('.').map(Number);
}

function semverCompare(a, b) {
  const pa = semverParts(a), pb = semverParts(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function getVersions(pkg) {
  const raw = run(`npm view ${pkg} versions --json`);
  try { return JSON.parse(raw); } catch { return []; }
}

function isDeprecated(pkg, version) {
  const raw = run(`npm view ${pkg}@${version} deprecated 2>/dev/null`);
  return raw.trim().length > 0;
}

function versionExists(pkg, version) {
  const raw = run(`npm view ${pkg}@${version} version 2>/dev/null`);
  return raw.trim() === version;
}

function findLatestPatch(versions, currentVer) {
  const bare = currentVer.replace(/[^^~>=<]/g, match => /[0-9.]/.test(match) ? match : '').trim();
  const [maj, min] = semverParts(bare);
  const patches = versions
    .filter(v => { const [vMaj, vMin] = semverParts(v); return vMaj === maj && vMin === min && semverCompare(v, bare) > 0; })
    .sort(semverCompare);
  return patches[patches.length - 1] || null;
}

function findLatestMinor(versions, currentVer) {
  const bare = currentVer.replace(/[^^~>=<]/g, match => /[0-9.]/.test(match) ? match : '').trim();
  const [maj, min] = semverParts(bare);
  const minors = versions
    .filter(v => { const [vMaj, vMin] = semverParts(v); return vMaj === maj && vMin > min; })
    .sort(semverCompare);
  return minors[minors.length - 1] || null;
}

function findLatestMajor(versions, currentVer) {
  const bare = currentVer.replace(/[^^~>=<]/g, match => /[0-9.]/.test(match) ? match : '').trim();
  const [maj] = semverParts(bare);
  const majors = versions
    .filter(v => semverParts(v)[0] > maj)
    .sort(semverCompare);
  return majors[majors.length - 1] || null;
}

function isExactPin(version) {
  return /^[0-9]/.test(version);
}

// ── direct dep upgrade candidates ────────────────────────────────────────────

const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
  ...pkg.optionalDependencies,
};

// npm outdated for range-pinned packages (npm only — pnpm/yarn use different formats;
// version discovery via npm view below covers those repos adequately)
const pkgManager = detectPkgManager(repoDir);
let outdated = {};
if (pkgManager === 'npm') {
  const outdatedRaw = run(`npm outdated --prefix ${repoDir} --json 2>/dev/null`);
  try { outdated = JSON.parse(outdatedRaw); } catch { outdated = {}; }
}

const safeUpgrades = [];   // patch + minor, user to approve
const majorUpgrades = [];  // major bumps, awareness only

for (const [name, currentSpec] of Object.entries(allDeps)) {
  const versions = getVersions(name);
  if (!versions.length) continue;

  const latestPatch = findLatestPatch(versions, currentSpec);
  const latestMinor = findLatestMinor(versions, currentSpec);
  const latestMajor = findLatestMajor(versions, currentSpec);
  const pinType = isExactPin(currentSpec) ? 'exact' : 'range';
  const prefix = isExactPin(currentSpec) ? '' : currentSpec.match(/^[^^~>=<]*/)?.[0] || '^';

  // For range-pinned, also pick up what npm outdated already found
  const outdatedInfo = outdated[name];
  const effectivePatch = latestPatch || (outdatedInfo?.wanted !== outdatedInfo?.current ? outdatedInfo?.wanted : null) || null;
  const effectiveMinor = latestMinor || null;

  if (effectivePatch || effectiveMinor) {
    safeUpgrades.push({
      package: name,
      pinType,
      prefix,
      current: currentSpec,
      patchUpgrade: effectivePatch ? `${prefix}${effectivePatch}` : null,
      minorUpgrade: effectiveMinor ? `${prefix}${effectiveMinor}` : null,
    });
  }

  if (latestMajor) {
    majorUpgrades.push({
      package: name,
      pinType,
      current: currentSpec,
      majorUpgrade: `${prefix}${latestMajor}`,
    });
  }
}

// ── transitive dep overrides ──────────────────────────────────────────────────

const transitiveOverrides = [];
const transitiveVulns = audit.npmAudit?.transitiveOnly || [];

for (const vuln of transitiveVulns) {
  const name = vuln.package;
  const versions = getVersions(name);
  if (!versions.length) continue;

  // Find lowest non-vulnerable version above the vulnerable range
  // Parse the vulnerable range upper bound from the advisory
  const bare = (vuln.currentRange || '').replace(/[<>=^~]/g, '').trim().split(' ').pop() || '';
  const [refMaj, refMin, refPatch] = semverParts(bare || '0.0.0');

  // Get candidates: versions above the vulnerable range
  const candidates = versions
    .filter(v => semverCompare(v, bare || '0.0.0') > 0)
    .sort(semverCompare);

  let safeVersion = null;
  let deprecated = false;

  for (const candidate of candidates) {
    const dep = isDeprecated(name, candidate);
    if (!dep) {
      safeVersion = candidate;
      break;
    }
  }

  if (!safeVersion) {
    // All candidates deprecated — pick latest and flag
    safeVersion = candidates[candidates.length - 1] || null;
    deprecated = true;
  }

  const exists = safeVersion ? versionExists(name, safeVersion) : false;

  transitiveOverrides.push({
    package: name,
    currentVulnerable: vuln.currentRange,
    overrideTo: safeVersion,
    deprecated,
    exists,
    introducedVia: vuln.introducedVia || [],
    severity: vuln.severity,
    skip: deprecated || !exists, // flag for user — don't auto-apply flagged ones
  });
}

// ── output ────────────────────────────────────────────────────────────────────

const plan = {
  generatedAt: new Date().toISOString(),
  packageVersion: pkg.version,
  safeUpgrades,
  majorUpgrades,
  transitiveOverrides,
};

process.stdout.write(JSON.stringify(plan, null, 2));
