#!/usr/bin/env node
/**
 * check-prs.mjs
 *
 * For every GitHub PR URL in the release, fetches PR state and verifies whether
 * merged commits are present in the development branch. Groups results by repo.
 * Pre-computes the list of Jira tickets that need a warning comment.
 *
 * Usage:
 *   node check-prs.mjs <release-tickets.json>
 *
 * Input:  release-tickets.json produced by fetch-release-data.mjs
 * Output: compact pr-status.json to stdout
 * Requires: gh CLI authenticated with read access to all relevant repos
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const [, , ticketsFile] = process.argv;
if (!ticketsFile) {
  console.error('Usage: node check-prs.mjs <release-tickets.json>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(resolve(ticketsFile), 'utf8'));

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || '';
  }
}

// Collect all unique PR URLs → source ticket key
const prUrlToTicketKey = new Map();
for (const url of (data.masterTicketPRs || [])) {
  prUrlToTicketKey.set(url, data.masterTicketKey);
}
for (const ticket of (data.tickets || [])) {
  for (const url of (ticket.prUrls || [])) {
    prUrlToTicketKey.set(url, ticket.key);
  }
}

const allPRUrls = [...prUrlToTicketKey.keys()];

// Fetch PR metadata for each URL
const prs = [];
for (const url of allPRUrls) {
  const raw = run(
    `gh pr view "${url}" --json state,mergedAt,title,mergeCommit,headRefName,baseRefName,files,author,headRepository 2>/dev/null`
  );

  let pr;
  try {
    pr = JSON.parse(raw);
  } catch {
    prs.push({ url, error: 'fetch_failed', sourceTicketKey: prUrlToTicketKey.get(url) });
    continue;
  }

  const repoOwner = pr.headRepository?.owner?.login || null;
  const repoName  = pr.headRepository?.name || null;
  // Fallback: extract owner/repo directly from the PR URL
  const repoFromUrl = url.match(/github\.com\/([^/]+\/[^/]+)\/pull\//)?.[1] || null;
  const repo = (repoOwner && repoName) ? `${repoOwner}/${repoName}` : repoFromUrl;

  // A release PR has development as its head branch — open by design, skip dev-branch check
  const isReleasePR = pr.headRefName === 'development';

  let devBranchStatus = null;
  if (!isReleasePR && pr.state === 'MERGED' && repo) {
    // PR merged directly to development — commits are in dev by definition
    if (pr.baseRefName === 'development') {
      devBranchStatus = 'in-base';
    } else if (pr.mergeCommit?.oid) {
      const devExists = run(
        `gh api repos/${repo}/branches/development --jq '.name' 2>/dev/null`
      ).trim();

      if (devExists === 'development') {
        const status = run(
          `gh api "repos/${repo}/compare/${pr.mergeCommit.oid}...development" --jq '.status' 2>/dev/null`
        ).trim();
        devBranchStatus = status || 'unknown';
      } else {
        devBranchStatus = 'no-dev-branch';
      }
    } else {
      // Rebase-merged PR: no single merge commit SHA. Check if dev branch exists at minimum.
      const devExists = run(
        `gh api repos/${repo}/branches/development --jq '.name' 2>/dev/null`
      ).trim();
      devBranchStatus = devExists === 'development' ? 'rebase-merged' : 'no-dev-branch';
    }
  }

  prs.push({
    url,
    state: pr.state,
    mergedAt: pr.mergedAt || null,
    title: pr.title || null,
    isReleasePR,
    repo,
    headRef: pr.headRefName || null,
    baseRef: pr.baseRefName || null,
    author: pr.author?.login || null,
    mergeCommit: pr.mergeCommit?.oid || null,
    devBranchStatus,
    // Keep only file paths — strip additions/deletions/status (not needed downstream)
    files: (pr.files || []).map(f => f.path),
    sourceTicketKey: prUrlToTicketKey.get(url),
  });
}

// Group by repo — include error-failed PRs so their repos are not silently dropped
const repoMap = new Map();
for (const pr of prs) {
  if (!pr.repo) continue;
  if (!repoMap.has(pr.repo)) {
    repoMap.set(pr.repo, { repo: pr.repo, prList: [], ticketKeys: new Set(), allFiles: new Set() });
  }
  const entry = repoMap.get(pr.repo);
  entry.prList.push(pr);
  if (pr.sourceTicketKey) entry.ticketKeys.add(pr.sourceTicketKey);
  for (const f of (pr.files || [])) entry.allFiles.add(f);
}

const repos = [];
for (const [repo, entry] of repoMap) {
  const IN_DEV = new Set(['ahead', 'identical', 'in-base']);
  const verified   = entry.prList.filter(p => !p.error && !p.isReleasePR && p.state === 'MERGED' &&
                       IN_DEV.has(p.devBranchStatus));
  const noDevBr    = entry.prList.filter(p => p.devBranchStatus === 'no-dev-branch');
  const rebaseMerged = entry.prList.filter(p => p.devBranchStatus === 'rebase-merged');
  const unverified = entry.prList.filter(p => !p.error && !p.isReleasePR && p.state === 'MERGED' &&
                       p.devBranchStatus && !IN_DEV.has(p.devBranchStatus) &&
                       p.devBranchStatus !== 'no-dev-branch' && p.devBranchStatus !== 'rebase-merged');
  const open       = entry.prList.filter(p => !p.error && !p.isReleasePR && p.state === 'OPEN');
  const fetchFailed = entry.prList.filter(p => p.error);

  repos.push({
    repo,
    hasDevBranch:       noDevBr.length === 0,
    verifiedPRCount:    verified.length,
    unverifiedPRCount:  unverified.length,
    rebaseMergedCount:  rebaseMerged.length,
    openPRCount:        open.length,
    fetchFailedCount:   fetchFailed.length,
    ticketKeys:         [...entry.ticketKeys],
    // eligible = at least one verified PR OR all dev-branch-absent (flag but continue)
    eligible:           verified.length > 0 || noDevBr.length > 0,
    changedFiles:       [...entry.allFiles],
  });
}

// Pre-compute which Jira tickets need a warning comment — one entry per ticket, not per PR
const ticketByKey = Object.fromEntries((data.tickets || []).map(t => [t.key, t]));
const commentMap = new Map(); // ticketKey → entry (deduplicated)

const IN_DEV_STATUS = new Set(['ahead', 'identical', 'in-base']);
for (const pr of prs) {
  if (pr.isReleasePR || pr.error) continue;

  const shouldComment =
    pr.state === 'OPEN' ||
    (pr.state === 'MERGED' && pr.devBranchStatus &&
      !IN_DEV_STATUS.has(pr.devBranchStatus) &&
      pr.devBranchStatus !== 'no-dev-branch');

  if (shouldComment && pr.sourceTicketKey) {
    const ticket = ticketByKey[pr.sourceTicketKey];
    if (commentMap.has(pr.sourceTicketKey)) {
      // Merge PR URLs for tickets with multiple problematic PRs
      commentMap.get(pr.sourceTicketKey).prUrls.push(pr.url);
    } else {
      commentMap.set(pr.sourceTicketKey, {
        ticketKey:           pr.sourceTicketKey,
        prUrls:              [pr.url],
        reason:              pr.state === 'OPEN' ? 'OPEN' : 'NOT_IN_DEV',
        devBranchStatus:     pr.devBranchStatus,
        assigneeAccountId:   ticket?.assignee?.accountId || null,
        assigneeDisplayName: ticket?.assignee?.displayName || null,
      });
    }
  }
}
const needsJiraComment = [...commentMap.values()];

process.stdout.write(JSON.stringify({
  prs,
  repos,
  flagged: {
    needsJiraComment,
    notInDev: prs
      .filter(p => !p.isReleasePR && p.state === 'MERGED' && p.devBranchStatus &&
                   p.devBranchStatus !== 'ahead' && p.devBranchStatus !== 'identical' &&
                   p.devBranchStatus !== 'no-dev-branch')
      .map(p => ({ repo: p.repo, prUrl: p.url, devBranchStatus: p.devBranchStatus })),
  },
}, null, 2));
