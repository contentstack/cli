#!/usr/bin/env node
/**
 * build-deploy-plan.mjs
 *
 * For each eligible repo from pr-status.json:
 *   - Detects branch topology (development / staging / next / main / master)
 *   - Reads the version file from development and main (package.json, .csproj, pom.xml, etc.)
 *     For monorepos: picks the deepest changed package file, not the root
 *   - Checks CHANGELOG.md for a new entry matching the release date
 *   - Computes a semver recommendation from ticket types
 *
 * Usage:
 *   node build-deploy-plan.mjs <pr-status.json> <release-tickets.json>
 *
 * Output: compact deploy-plan.json to stdout
 * Requires: gh CLI authenticated with read access to all relevant repos
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const [, , prStatusFile, ticketsFile] = process.argv;
if (!prStatusFile || !ticketsFile) {
  console.error('Usage: node build-deploy-plan.mjs <pr-status.json> <release-tickets.json>');
  process.exit(1);
}

const prStatus   = JSON.parse(readFileSync(resolve(prStatusFile), 'utf8'));
const ticketData = JSON.parse(readFileSync(resolve(ticketsFile), 'utf8'));

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || '';
  }
}

function getFileContent(repo, filePath, ref) {
  const encoded = run(
    `gh api "repos/${repo}/contents/${filePath}?ref=${ref}" --jq '.content' 2>/dev/null`
  ).trim();
  if (!encoded || encoded === 'null' || encoded === '') return null;
  try {
    return Buffer.from(encoded.replace(/\s/g, ''), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function detectPlatform(changedFiles) {
  if (changedFiles.some(f => f.endsWith('.csproj') || f.endsWith('.nuspec'))) return 'NuGet';
  if (changedFiles.some(f => f === 'pom.xml' || f.endsWith('/pom.xml')))       return 'Maven';
  if (changedFiles.some(f =>
    f === 'setup.py' || f === 'pyproject.toml' ||
    f.endsWith('/setup.py') || f.endsWith('/pyproject.toml')
  )) return 'PyPI';
  if (changedFiles.some(f => f.endsWith('package.json'))) return 'NPM';
  return 'GitHub';
}

function pickVersionFilePath(platform, changedFiles) {
  switch (platform) {
    case 'NPM': {
      const candidates = changedFiles.filter(
        f => f.endsWith('package.json') && !f.includes('node_modules')
      );
      if (!candidates.length) return 'package.json';
      // Prefer the deepest path (most specific package in a monorepo)
      candidates.sort((a, b) => b.split('/').length - a.split('/').length);
      return candidates[0];
    }
    case 'NuGet': {
      const csproj = changedFiles.find(f => f.endsWith('.csproj'));
      return csproj || null;
    }
    case 'Maven':
      return 'pom.xml';
    case 'PyPI':
      return changedFiles.includes('pyproject.toml') ? 'pyproject.toml'
           : changedFiles.includes('setup.py')       ? 'setup.py'
           : 'pyproject.toml';
    default:
      return null;
  }
}

function extractVersion(content, platform) {
  if (!content) return null;
  try {
    switch (platform) {
      case 'NPM':
        return JSON.parse(content).version || null;
      case 'NuGet': {
        const m = content.match(/<Version>(.*?)<\/Version>/i) ||
                  content.match(/<PackageVersion>(.*?)<\/PackageVersion>/i);
        return m?.[1]?.trim() || null;
      }
      case 'Maven': {
        const m = content.match(/<version>(.*?)<\/version>/i);
        return m?.[1]?.trim() || null;
      }
      case 'PyPI': {
        const m = content.match(/version\s*=\s*["']([^"']+)["']/);
        return m?.[1] || null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function extractPackageName(content, platform) {
  if (!content) return null;
  try {
    switch (platform) {
      case 'NPM':
        return JSON.parse(content).name || null;
      case 'NuGet': {
        const m = content.match(/<PackageId>(.*?)<\/PackageId>/i);
        return m?.[1]?.trim() || null;
      }
      case 'Maven': {
        const m = content.match(/<artifactId>(.*?)<\/artifactId>/i);
        return m?.[1]?.trim() || null;
      }
      case 'PyPI': {
        const m = content.match(/^name\s*=\s*["']([^"']+)["']/m);
        return m?.[1] || null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function classifyBump(vDev, vMain) {
  if (!vDev || !vMain || vDev === vMain) return 'none';
  const parse = v => v.split('.').map(Number);
  const [dMaj, dMin, dPatch] = parse(vDev);
  const [mMaj, mMin, mPatch] = parse(vMain);
  if (dMaj > mMaj) return 'major';
  if (dMin > mMin) return 'minor';
  if (dPatch > mPatch) return 'patch';
  return 'none'; // dev version lower than main — flag as anomaly
}

function semverRecommendation(ticketKeys, allTickets) {
  const relevant = allTickets.filter(t => ticketKeys.includes(t.key));
  // A Task ticket can be a new feature or enhancement. Default conservative: if any Task exists,
  // recommend minor. Only Bugs/Security → patch. Caller should confirm with user.
  if (relevant.some(t => t.type === 'Task')) return 'minor';
  return 'patch';
}

// Build ticket lookup map
const allTickets = ticketData.tickets || [];
const ticketByKey = Object.fromEntries(allTickets.map(t => [t.key, t]));

const repos = [];

for (const repoEntry of (prStatus.repos || [])) {
  const repo = repoEntry.repo; // "owner/name"

  // ── Branch topology ────────────────────────────────────────────────────────
  // Always detect topology — Step 5 creates release PRs for ALL repos, including ineligible ones.
  const branchExists = {};
  for (const branch of ['development', 'staging', 'next', 'main', 'master']) {
    const result = run(
      `gh api repos/${repo}/branches/${branch} --jq '.name' 2>/dev/null`
    ).trim();
    branchExists[branch] = result === branch;
  }

  const mainBranch    = branchExists.main   ? 'main'    : branchExists.master ? 'master' : null;
  const stagingBranch = branchExists.staging ? 'staging' : branchExists.next   ? 'next'   : null;

  let topology;
  if (!branchExists.development || !mainBranch) {
    topology = 'C';
  } else {
    topology = stagingBranch ? 'A' : 'B';
  }

  if (topology === 'C') {
    repos.push({ repo, topology: 'C', eligible: repoEntry.eligible, flags: { noDevBranch: true } });
    continue;
  }

  // Ineligible repos (PRs not in dev) get topology recorded but skip version/changelog checks
  if (!repoEntry.eligible) {
    repos.push({
      repo, topology, mainBranch, stagingBranch,
      eligible: false,
      ticketKeys: repoEntry.ticketKeys,
      flags: { ineligible: true },
    });
    continue;
  }

  // ── Platform + version file ────────────────────────────────────────────────
  const changedFiles = repoEntry.changedFiles || [];
  const platform     = detectPlatform(changedFiles);
  const versionPath  = pickVersionFilePath(platform, changedFiles);

  let versionDev  = null;
  let versionMain = null;
  let packageName = null;

  if (versionPath) {
    const devContent  = getFileContent(repo, versionPath, 'development');
    const mainContent = getFileContent(repo, versionPath, mainBranch);
    versionDev  = extractVersion(devContent,  platform);
    versionMain = extractVersion(mainContent, platform);
    packageName = extractPackageName(devContent, platform);
  }

  // ── CHANGELOG ──────────────────────────────────────────────────────────────
  const changelogContent   = getFileContent(repo, 'CHANGELOG.md', 'development');
  const changelogExists    = changelogContent !== null;
  // releaseDate is DD-MM-YYYY from the fixVersion string; convert to ISO YYYY-MM-DD for CHANGELOG matching
  let changelogHasEntry = null;
  if (changelogExists && ticketData.releaseDate) {
    const [dd, mm, yyyy] = ticketData.releaseDate.split('-');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    changelogHasEntry = changelogContent.includes(isoDate) || changelogContent.includes(ticketData.releaseDate);
  }

  // ── Semver analysis ────────────────────────────────────────────────────────
  const detectedBump   = classifyBump(versionDev, versionMain);
  const recommendation = semverRecommendation(repoEntry.ticketKeys, allTickets);

  // ── Owner: assignee of the primary Task ticket for this repo ───────────────
  const primaryTask = allTickets.find(
    t => repoEntry.ticketKeys.includes(t.key) && t.type === 'Task'
  );
  const fallback = allTickets.find(t => repoEntry.ticketKeys.includes(t.key));
  const owner = (primaryTask || fallback)?.assignee?.displayName || null;

  // ── Direct-to-main check ───────────────────────────────────────────────────
  const directToMain = (prStatus.prs || []).some(
    p => p.repo === repo && p.baseRef === mainBranch && !p.isReleasePR && p.state === 'MERGED'
  );

  repos.push({
    repo,
    topology,
    eligible: true,
    mainBranch,
    stagingBranch,
    platform,
    packageName,
    versionFilePath: versionPath,
    versionDev,
    versionMain,
    detectedBump,
    semverRecommendation: recommendation,
    changelogExists,
    changelogHasEntry,
    owner,
    ticketKeys: repoEntry.ticketKeys,
    flags: {
      versionBumpMissing:      detectedBump === 'none',
      changelogMissing:        !changelogExists,
      changelogEntryMissing:   changelogExists && changelogHasEntry === false,
      directToMain,
    },
  });
}

process.stdout.write(JSON.stringify({ repos }, null, 2));
