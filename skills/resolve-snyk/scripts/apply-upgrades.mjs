#!/usr/bin/env node
/**
 * apply-upgrades.mjs
 *
 * Applies an approved upgrade plan to package.json in one atomic pass:
 *   - Direct dep version bumps (preserving ^ / ~ prefix for range pins)
 *   - Transitive dep overrides block
 *   - Package version bump
 *
 * Usage:
 *   node apply-upgrades.mjs <repo-dir> <approved-plan.json>
 *
 * approved-plan.json shape:
 * {
 *   "directUpgrades": [
 *     { "package": "@angular/common", "targetVersion": "21.2.19" },
 *     { "package": "express",         "targetVersion": "^4.19.2" }
 *   ],
 *   "overrides": [
 *     { "package": "undici", "targetVersion": "7.28.1" }
 *   ],
 *   "versionBump": "patch" | "minor" | null
 * }
 *
 * Output: JSON diff summary of changes made to stdout.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function detectPkgManager(repoDir) {
  if (existsSync(resolve(repoDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(resolve(repoDir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

const [, , repoDirArg, planFile] = process.argv;
if (!repoDirArg || !planFile) {
  console.error('Usage: node apply-upgrades.mjs <repo-dir> <approved-plan.json>');
  process.exit(1);
}

const repoDir = resolve(repoDirArg);
const pkgPath = resolve(repoDir, 'package.json');
const plan = JSON.parse(readFileSync(resolve(planFile), 'utf8'));
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const changes = [];

// ── direct dep upgrades ───────────────────────────────────────────────────────

for (const { package: name, targetVersion } of (plan.directUpgrades || [])) {
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  let applied = false;

  for (const section of sections) {
    if (pkg[section]?.[name] !== undefined) {
      const before = pkg[section][name];
      pkg[section][name] = targetVersion;
      changes.push({ section, package: name, before, after: targetVersion });
      applied = true;
      break;
    }
  }

  if (!applied) {
    console.error(`Warning: package "${name}" not found in any dep section — skipping`);
  }
}

// ── transitive overrides ──────────────────────────────────────────────────────

if (plan.overrides?.length) {
  const pkgManager = detectPkgManager(repoDir);

  if (pkgManager === 'pnpm') {
    // pnpm uses pnpm.overrides, not overrides
    pkg.pnpm = pkg.pnpm || {};
    pkg.pnpm.overrides = pkg.pnpm.overrides || {};
    for (const { package: name, targetVersion } of plan.overrides) {
      const before = pkg.pnpm.overrides[name] || null;
      pkg.pnpm.overrides[name] = targetVersion;
      changes.push({ section: 'pnpm.overrides', package: name, before, after: targetVersion });
    }
  } else {
    // npm and yarn both use the overrides field
    pkg.overrides = pkg.overrides || {};
    for (const { package: name, targetVersion } of plan.overrides) {
      const before = pkg.overrides[name] || null;
      pkg.overrides[name] = targetVersion;
      changes.push({ section: 'overrides', package: name, before, after: targetVersion });
    }
  }
}

// ── package version bump ──────────────────────────────────────────────────────

if (plan.versionBump) {
  const parts = (pkg.version || '0.0.0').split('.').map(Number);
  const before = pkg.version;

  if (plan.versionBump === 'patch') {
    parts[2]++;
  } else if (plan.versionBump === 'minor') {
    parts[1]++;
    parts[2] = 0;
  }

  pkg.version = parts.join('.');
  changes.push({ section: 'version', package: 'self', before, after: pkg.version });
}

// ── write ─────────────────────────────────────────────────────────────────────

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

process.stdout.write(JSON.stringify({ appliedAt: new Date().toISOString(), changes }, null, 2));
