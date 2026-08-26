#!/usr/bin/env node
/**
 * fetch-release-data.mjs
 *
 * Compresses raw Jira MCP response (searchJiraIssuesUsingJql output) into a
 * compact JSON structure. Strips ADF formatting, null fields, and metadata bloat.
 * Extracts GitHub PR URLs from descriptions and comments.
 *
 * Usage:
 *   node fetch-release-data.mjs <jira-raw.json> [<jira-raw-2.json> ...]
 *
 * Input: one or more JSON files, each the direct MCP tool response for a page
 *        of searchJiraIssuesUsingJql results.
 * Output: compact JSON to stdout (~85-90% smaller than raw input).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);

// Extract --fix-version <value> before validating file args
let explicitFixVersion = null;
const fvIdx = args.indexOf('--fix-version');
if (fvIdx !== -1) {
  explicitFixVersion = args[fvIdx + 1] ?? null;
  args.splice(fvIdx, explicitFixVersion !== null ? 2 : 1);
}

if (!args.length) {
  console.error('Usage: node fetch-release-data.mjs <jira-raw.json> [<page2.json> ...] [--fix-version "PROJ | DD-MM-YYYY | Release"]');
  process.exit(1);
}

// Exclude ] [ ( ) to prevent capturing markdown link syntax like pull/123](https://...
const PR_URL_RE = /https:\/\/github\.com\/[^\s"'<>()\[\]]+\/pull\/\d+/g;

// Recursively extract plain text from Jira ADF nodes
function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'inlineCard' || node.type === 'blockCard') {
    return node.attrs?.url || '';
  }
  if (Array.isArray(node.content)) {
    return node.content.map(adfToText).join(' ');
  }
  return '';
}

function extractPRUrls(fieldValue) {
  if (!fieldValue) return [];
  const text = typeof fieldValue === 'string' ? fieldValue : adfToText(fieldValue);
  const matches = text.match(PR_URL_RE) || [];
  // Normalize URLs: strip trailing punctuation or fragments
  return [...new Set(matches.map(u => u.replace(/[.,)>\]]+$/, '')))];
}

// Merge all pages into one node array
let allNodes = [];
for (const file of args) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(resolve(file), 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${file}: ${e.message}`);
    process.exit(1);
  }
  // MCP response shape: { issues: { nodes: [...] } } or { nodes: [...] } or { issues: [...] }
  const nodes = raw?.issues?.nodes
    || raw?.nodes
    || (Array.isArray(raw?.issues) ? raw.issues : [])
    || [];
  allNodes = allNodes.concat(nodes);
}

if (!allNodes.length) {
  console.error('No issues found in input files');
  process.exit(1);
}

let fixVersion = null;
let releaseDate = null;
let releaseType = null;
let masterTicketKey = null;
let masterTicketPRs = [];

const tickets = [];
const notReadyToDeploy = [];

// First pass: find the master release tracking ticket to extract fixVersion metadata
for (const issue of allNodes) {
  const summary = issue.fields?.summary || '';
  // Pattern: "PROJ | MM-DD-YYYY | Release" or "PROJ | MM-DD-YYYY | Hotfix" (any project key)
  const m = summary.match(/^[A-Z][A-Z0-9_-]*\s*\|\s*([\d-]+)\s*\|\s*(Release|Hotfix)/i);
  if (m) {
    masterTicketKey = issue.key;
    releaseDate = m[1];
    releaseType = m[2];
    fixVersion = summary.trim();
    masterTicketPRs = extractPRUrls(issue.fields?.description);
    break;
  }
}

// Fallback: derive metadata from --fix-version when no master ticket was found in results
if (!fixVersion && explicitFixVersion) {
  fixVersion = explicitFixVersion.trim();
  const m = fixVersion.match(/^[A-Z][A-Z0-9_-]*\s*\|\s*([\d-]+)\s*\|\s*(Release|Hotfix)/i);
  if (m) {
    releaseDate = m[1];
    releaseType = m[2];
  }
}

// Second pass: build compact ticket list
for (const issue of allNodes) {
  const f = issue.fields || {};
  const key = issue.key;
  const summary = f.summary || '';
  const status = f.status?.name || '';
  const type = f.issuetype?.name || '';
  const created = (f.created || '').slice(0, 10);
  const assignee = f.assignee
    ? { displayName: f.assignee.displayName, accountId: f.assignee.accountId }
    : null;
  const reporter = f.reporter ? { displayName: f.reporter.displayName } : null;
  const parentKey = f.parent?.key || null;

  // Sprint: try standard field, then common custom field mappings
  const sprint =
    f.sprint?.name ||
    f.customfield_10020?.[0]?.name ||
    f.customfield_10010?.[0]?.name ||
    null;

  const labels = f.labels || [];

  // Extract PR URLs from description + comments; exclude master ticket PRs to avoid duplication
  const descPRs = extractPRUrls(f.description);
  const commentPRs = [];
  for (const comment of (f.comment?.comments || [])) {
    commentPRs.push(...extractPRUrls(comment.body));
  }
  const allPRs = [...new Set([...descPRs, ...commentPRs])];
  const prUrls = key === masterTicketKey
    ? [] // master ticket PRs captured separately
    : allPRs.filter(u => !masterTicketPRs.includes(u));

  // Flag not-ready tickets (exclude master tracking ticket and already-closed ones)
  if (key !== masterTicketKey) {
    const terminalStatuses = new Set(['Done', 'Closed', 'Resolved', 'Ready to Deploy']);
    if (!terminalStatuses.has(status)) {
      notReadyToDeploy.push(key);
    }
  }

  tickets.push({
    key,
    type,
    summary,
    parentKey,
    sprint,
    status,
    created,
    assignee,
    reporter,
    labels,
    prUrls,
  });
}

process.stdout.write(JSON.stringify({
  fixVersion,
  releaseDate,
  releaseType,
  masterTicketKey,
  masterTicketPRs,
  tickets,
  notReadyToDeploy,
}, null, 2));
